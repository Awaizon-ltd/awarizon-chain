use crate::cache::RedisCache;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::State;
use axum::response::Response;
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, mpsc};
use tokio::task::JoinHandle;

pub type BroadcastTx = Arc<broadcast::Sender<serde_json::Value>>;

#[derive(Clone)]
pub struct WsState {
    pub block_tx: BroadcastTx,
    pub cache: RedisCache,
}

#[derive(Deserialize)]
#[serde(tag = "type")]
enum ClientMessage {
    #[serde(rename = "subscribe")]
    Subscribe { channel: String },
    #[serde(rename = "unsubscribe")]
    Unsubscribe { channel: String },
    #[serde(rename = "ping")]
    Ping,
}

#[derive(Serialize)]
#[serde(tag = "type")]
enum ServerMessage {
    #[serde(rename = "connected")]
    Connected { message: String },
    #[serde(rename = "pong")]
    Pong,
    #[serde(rename = "subscribed")]
    Subscribed { channel: String },
    #[serde(rename = "unsubscribed")]
    Unsubscribed { channel: String },
    #[serde(rename = "event")]
    Event { channel: String, data: serde_json::Value },
    #[serde(rename = "error")]
    Error { message: String },
}

fn send_json(msg: &ServerMessage) -> Message {
    Message::Text(serde_json::to_string(msg).unwrap_or_default().into())
}

/// Supported subscription channels:
///   "blocks"              → new indexed blocks
///   "wallet:{address}"    → inbox delivery / reward-claimed notifications
///   "developer:{address}" → campaign milestone notifications
/// Clients now must explicitly subscribe to "blocks" to receive block events
/// — previously every connection received them unconditionally. This is a
/// deliberate behavior change to support the new per-channel subscriptions;
/// any existing client that doesn't send a subscribe message will stop
/// getting block updates after this deploys.
pub async fn ws_handler(ws: WebSocketUpgrade, State(state): State<WsState>) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: WsState) {
    let mut block_rx = state.block_tx.subscribe();
    let mut block_subscribed = false;
    let mut redis_subs: HashMap<String, JoinHandle<()>> = HashMap::new();
    let (fwd_tx, mut fwd_rx) = mpsc::unbounded_channel::<(String, String)>();

    let _ = socket
        .send(send_json(&ServerMessage::Connected { message: "Awarizon Indexer WebSocket".to_string() }))
        .await;

    loop {
        tokio::select! {
            msg = block_rx.recv(), if block_subscribed => {
                match msg {
                    Ok(data) => {
                        if socket.send(send_json(&ServerMessage::Event { channel: "blocks".to_string(), data })).await.is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }

            Some((channel, payload)) = fwd_rx.recv() => {
                let data: serde_json::Value = serde_json::from_str(&payload).unwrap_or(serde_json::Value::Null);
                if socket.send(send_json(&ServerMessage::Event { channel, data })).await.is_err() {
                    break;
                }
            }

            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        match serde_json::from_str::<ClientMessage>(&text) {
                            Ok(ClientMessage::Subscribe { channel }) => {
                                if channel == "blocks" {
                                    block_subscribed = true;
                                    let _ = socket.send(send_json(&ServerMessage::Subscribed { channel })).await;
                                } else if channel.starts_with("wallet:") || channel.starts_with("developer:") {
                                    redis_subs.entry(channel.clone()).or_insert_with(|| {
                                        spawn_redis_listener(state.cache.client(), channel.clone(), fwd_tx.clone())
                                    });
                                    let _ = socket.send(send_json(&ServerMessage::Subscribed { channel })).await;
                                } else {
                                    let _ = socket
                                        .send(send_json(&ServerMessage::Error { message: format!("unknown channel: {channel}") }))
                                        .await;
                                }
                            }
                            Ok(ClientMessage::Unsubscribe { channel }) => {
                                if channel == "blocks" {
                                    block_subscribed = false;
                                } else if let Some(handle) = redis_subs.remove(&channel) {
                                    handle.abort();
                                }
                                let _ = socket.send(send_json(&ServerMessage::Unsubscribed { channel })).await;
                            }
                            Ok(ClientMessage::Ping) => {
                                let _ = socket.send(send_json(&ServerMessage::Pong)).await;
                            }
                            Err(_) => {
                                let _ = socket
                                    .send(send_json(&ServerMessage::Error { message: "invalid message".to_string() }))
                                    .await;
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => break,
                    Some(Ok(Message::Ping(p))) => {
                        let _ = socket.send(Message::Pong(p)).await;
                    }
                    _ => {}
                }
            }
        }
    }

    for (_, handle) in redis_subs {
        handle.abort();
    }
}

/// Bridges one Redis pub/sub channel to this connection's forwarding queue.
/// Uses a dedicated connection via `Client::get_async_pubsub` — pub/sub isn't
/// available on the shared `ConnectionManager` used for cache get/set.
fn spawn_redis_listener(client: redis::Client, channel: String, tx: mpsc::UnboundedSender<(String, String)>) -> JoinHandle<()> {
    tokio::spawn(async move {
        let mut pubsub = match client.get_async_pubsub().await {
            Ok(p) => p,
            Err(e) => {
                tracing::warn!("Failed to open Redis pub/sub for {}: {}", channel, e);
                return;
            }
        };
        if let Err(e) = pubsub.subscribe(&channel).await {
            tracing::warn!("Failed to subscribe to Redis channel {}: {}", channel, e);
            return;
        }
        let mut stream = pubsub.on_message();
        while let Some(msg) = stream.next().await {
            let payload: String = match msg.get_payload() {
                Ok(p) => p,
                Err(_) => continue,
            };
            if tx.send((channel.clone(), payload)).is_err() {
                break;
            }
        }
    })
}
