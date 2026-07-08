pub mod graphql;
pub mod rest;
pub mod websocket;

use crate::db::sqlx_compat::PgPool;
use async_graphql::{EmptyMutation, EmptySubscription, Schema};
use axum::routing::get;
use axum::Router;
use std::sync::Arc;
use tokio::sync::broadcast;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

pub fn build_router(pool: Arc<PgPool>, block_tx: broadcast::Sender<serde_json::Value>) -> Router {
    let schema: graphql::AppSchema = Schema::build(graphql::QueryRoot, EmptyMutation, EmptySubscription)
        .data(pool.clone())
        .finish();

    let rest_router = Router::new()
        .route("/health", get(rest::health))
        .route("/stats", get(rest::stats))
        .route("/blocks", get(rest::get_blocks))
        .route("/blocks/{number}", get(rest::get_block))
        .route("/transactions", get(rest::get_transactions))
        .with_state(pool.clone());

    let ws_router = Router::new()
        .route("/ws", get(websocket::ws_handler))
        .with_state(Arc::new(block_tx));

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
