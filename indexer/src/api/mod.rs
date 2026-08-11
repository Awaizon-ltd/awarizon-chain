pub mod graphql;
pub mod rest;
pub mod websocket;

use crate::cache::RedisCache;
use crate::db::sqlx_compat::PgPool;
use crate::notifications::NotificationService;
use async_graphql::{EmptyMutation, EmptySubscription, Schema};
use axum::extract::ConnectInfo;
use axum::http::StatusCode;
use axum::middleware::{self, Next};
use axum::response::Response;
use axum::routing::get;
use axum::Router;
use governor::clock::DefaultClock;
use governor::state::{InMemoryState, NotKeyed};
use governor::{Quota, RateLimiter};
use std::net::SocketAddr;
use std::num::NonZeroU32;
use std::sync::Arc;
use tokio::sync::broadcast;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

#[derive(Clone)]
pub struct AppState {
    pub pool: Arc<PgPool>,
    pub cache: RedisCache,
    pub notifier: Arc<NotificationService>,
}

type SharedRateLimiter = Arc<RateLimiter<NotKeyed, InMemoryState, DefaultClock>>;

fn create_rate_limiter() -> SharedRateLimiter {
    // 100 requests/minute, shared across all callers. Note: if this sits
    // behind a reverse proxy (index.awarizon.com does), ConnectInfo sees the
    // proxy's address, not the client's — every request looks like it comes
    // from one IP. Trusting X-Forwarded-For instead requires knowing the
    // proxy's IP is trusted, which isn't established here, so this limits
    // aggregate traffic rather than per-client traffic until that's wired up.
    Arc::new(RateLimiter::direct(Quota::per_minute(NonZeroU32::new(100).unwrap())))
}

async fn rate_limit_middleware(
    ConnectInfo(_addr): ConnectInfo<SocketAddr>,
    axum::extract::State(limiter): axum::extract::State<SharedRateLimiter>,
    req: axum::http::Request<axum::body::Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    match limiter.check() {
        Ok(_) => Ok(next.run(req).await),
        Err(_) => Err(StatusCode::TOO_MANY_REQUESTS),
    }
}

pub fn build_router(
    pool: Arc<PgPool>,
    cache: RedisCache,
    notifier: Arc<NotificationService>,
    block_tx: broadcast::Sender<serde_json::Value>,
) -> Router {
    let state = AppState { pool, cache: cache.clone(), notifier };

    let schema: graphql::AppSchema = Schema::build(graphql::QueryRoot, EmptyMutation, EmptySubscription)
        .data(state.pool.clone())
        .finish();

    let limiter = create_rate_limiter();

    let rest_router = Router::new()
        .route("/health", get(rest::health))
        .route("/stats", get(rest::stats))
        .route("/blocks", get(rest::get_blocks))
        .route("/blocks/{number}", get(rest::get_block))
        .route("/transactions", get(rest::get_transactions))
        .route("/transactions/recent", get(rest::get_recent_transactions))
        .route("/dex/pools", get(rest::get_dex_pools))
        .route("/dex/pools/{asset_a}/{asset_b}", get(rest::get_dex_pool))
        .route("/dex/swaps", get(rest::get_dex_swaps))
        .route("/dex/price/{asset_a}/{asset_b}", get(rest::get_dex_price_history))
        .route("/dex/stats", get(rest::get_dex_stats))
        .route("/campaign-events", get(rest::get_campaign_events))
        .route("/inbox-events", get(rest::get_inbox_events))
        .route("/campaign-stats", get(rest::get_campaign_stats))
        .route("/wallet-candidates", get(rest::get_wallet_candidates))
        .route("/wallet-index", get(rest::get_wallet_index))
        .route("/targeting/match", get(rest::get_targeting_match))
        .route("/targeting/summary", get(rest::get_targeting_summary))
        .route("/campaigns/{campaign_id}/deliveries", get(rest::get_campaign_deliveries))
        .route("/search/apps", get(rest::search_apps))
        .route("/nft/collections", get(rest::get_nft_collections))
        .route("/nft/collections/{id}", get(rest::get_nft_collection))
        .route("/nft/collections/{id}/items", get(rest::get_nft_collection_items))
        .route("/nft/owned/{address}", get(rest::get_nft_owned))
        .route("/nft/events", get(rest::get_nft_events))
        .route("/nft/rankings", get(rest::get_nft_rankings))
        .route("/nft/search", get(rest::search_nfts))
        .route("/assets", get(rest::get_assets))
        .route("/assets/{id}", get(rest::get_asset))
        .route("/assets/{id}/holders", get(rest::get_asset_holders))
        .route("/assets/{id}/transfers", get(rest::get_asset_transfers))
        .route("/addresses/{address}/assets", get(rest::get_address_assets))
        .route("/metrics", get(rest::metrics))
        .layer(middleware::from_fn_with_state(limiter, rate_limit_middleware))
        .with_state(state);

    let ws_router = Router::new()
        .route("/ws", get(websocket::ws_handler))
        .with_state(websocket::WsState { block_tx: Arc::new(block_tx), cache });

    let graphql_router = Router::new()
        .route("/graphql", get(graphql::graphql_playground).post(graphql::graphql_handler))
        .with_state(schema);

    Router::new()
        .merge(rest_router)
        .merge(ws_router)
        .merge(graphql_router)
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any))
        .layer(TraceLayer::new_for_http())
}
