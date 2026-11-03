pub mod rest;

use crate::cache::RedisCache;
use crate::db::sqlx_compat::PgPool;
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
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

#[derive(Clone)]
pub struct AppState {
    pub pool: Arc<PgPool>,
    pub cache: RedisCache,
}

type SharedRateLimiter = Arc<RateLimiter<NotKeyed, InMemoryState, DefaultClock>>;

fn create_rate_limiter() -> SharedRateLimiter {
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

pub fn build_router(pool: Arc<PgPool>, cache: RedisCache) -> Router {
    let state = AppState { pool, cache };
    let limiter = create_rate_limiter();

    Router::new()
        .route("/health", get(rest::health))
        .route("/stats", get(rest::stats))
        .route("/blocks", get(rest::get_blocks))
        .route("/blocks/{number}", get(rest::get_block))
        .route("/transactions", get(rest::get_transactions))
        .route("/addresses/{address}", get(rest::get_address))
        .route("/addresses/{address}/contract-interactions", get(rest::get_address_contract_interactions))
        .layer(middleware::from_fn_with_state(limiter, rate_limit_middleware))
        .with_state(state)
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any))
        .layer(TraceLayer::new_for_http())
}
