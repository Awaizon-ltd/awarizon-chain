use crate::db::sqlx_compat::PgPool;
use crate::db::queries;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::Json;
use serde::Deserialize;
use serde_json::Value;
use std::sync::Arc;

pub type AppState = Arc<PgPool>;

pub async fn health() -> Json<Value> {
    Json(serde_json::json!({
        "status": "ok",
        "service": "awarizon-indexer",
    }))
}

pub async fn stats(State(pool): State<AppState>) -> Result<Json<Value>, StatusCode> {
    queries::get_indexer_stats(&pool)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

#[derive(Deserialize)]
pub struct PaginationParams {
    pub limit: Option<i64>,
}

pub async fn get_blocks(
    State(pool): State<AppState>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(20).min(100);
    queries::get_recent_blocks(&pool, limit)
        .await
        .map(|blocks| Json(serde_json::json!({ "blocks": blocks, "limit": limit })))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn get_block(
    State(pool): State<AppState>,
    Path(number): Path<i64>,
) -> Result<Json<Value>, StatusCode> {
    queries::get_block_by_number(&pool, number)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

#[derive(Deserialize)]
pub struct TransactionParams {
    pub address: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub async fn get_transactions(
    State(pool): State<AppState>,
    Query(params): Query<TransactionParams>,
) -> Result<Json<Value>, StatusCode> {
    let address = params.address.ok_or(StatusCode::BAD_REQUEST)?;
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.offset.unwrap_or(0);

    let (txs, count) = tokio::join!(
        queries::get_transactions_for_address(&pool, &address, limit, offset),
        queries::get_transaction_count_for_address(&pool, &address),
    );

    Ok(Json(serde_json::json!({
        "address": address,
        "transactions": txs.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?,
        "total": count.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?,
        "limit": limit,
        "offset": offset,
    })))
}
