use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::State;
use axum::response::Response;
use std::sync::Arc;
use tokio::sync::broadcast;

pub type BroadcastTx = Arc<broadcast::Sender<serde_json::Value>>;

/// GET /ws — streams newly-indexed blocks to connected clients.
pub async fn ws_handler(ws: WebSocketUpgrade, State(tx): State<BroadcastTx>) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, tx))
}

async fn handle_socket(mut socket: WebSocket, tx: BroadcastTx) {
    let mut rx = tx.subscribe();

    let _ = socket
        .send(Message::Text(
            serde_json::json!({
                "type": "connected",
                "message": "Awarizon Indexer WebSocket",
            })
            .to_string()
            .into(),
        ))
        .await;

    loop {
        tokio::select! {
            msg = rx.recv() => {
                match msg {
                    Ok(data) => {
                        if socket.send(Message::Text(data.to_string().into())).await.is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Close(_))) => break,
                    Some(Ok(Message::Ping(p))) => {
                        let _ = socket.send(Message::Pong(p)).await;
                    }
                    None => break,
                    _ => {}
                }
            }
        }
    }
}
