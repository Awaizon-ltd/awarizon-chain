use crate::api::AppState;
use crate::cache::{keys, ttl};
use crate::db::queries;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::Json;
use serde::Deserialize;
use serde_json::{json, Value};

pub async fn health() -> Json<Value> {
    Json(json!({ "status": "ok", "service": "sysfi-indexer" }))
}

pub async fn stats(State(state): State<AppState>) -> Result<Json<Value>, StatusCode> {
    let cache_key = keys::stats();
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        return Ok(Json(cached));
    }

    let s = queries::get_stats(&state.pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let result = json!({
        "latestBlock": s.latest_block,
        "totalBlocks": s.total_blocks,
        "totalTransactions": s.total_transactions,
        "totalAddresses": s.total_addresses,
        "avgBlockTimeSec": s.avg_block_time_sec,
        "tps": s.tps,
    });
    let _ = state.cache.set(&cache_key, &result, ttl::STATS).await;
    Ok(Json(result))
}

#[derive(Deserialize)]
pub struct PageParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub async fn get_blocks(State(state): State<AppState>, Query(params): Query<PageParams>) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.offset.unwrap_or(0).max(0);
    let cache_key = keys::blocks(limit, offset);
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        return Ok(Json(cached));
    }

    let blocks = queries::get_recent_blocks(&state.pool, limit, offset).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let result = json!({ "blocks": blocks, "limit": limit, "offset": offset });
    let _ = state.cache.set(&cache_key, &result, ttl::BLOCKS).await;
    Ok(Json(result))
}

pub async fn get_block(State(state): State<AppState>, Path(number): Path<i64>) -> Result<Json<Value>, StatusCode> {
    queries::get_block_by_number(&state.pool, number)
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

/// GET /transactions — global (no address) or address-scoped, both with
/// real offset pagination (unlike ../indexer's /transactions, which
/// requires an address, and /transactions/recent, which has no offset).
pub async fn get_transactions(State(state): State<AppState>, Query(params): Query<TransactionParams>) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.offset.unwrap_or(0).max(0);
    let address = params.address.map(|a| a.to_lowercase());

    let cache_key = keys::transactions(address.as_deref(), limit, offset);
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        return Ok(Json(cached));
    }

    let (txs, total) = match &address {
        Some(addr) => {
            let (txs, total) = tokio::join!(
                queries::get_transactions_for_address(&state.pool, addr, limit, offset),
                queries::get_transaction_count_for_address(&state.pool, addr),
            );
            (txs.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?, total.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?)
        }
        None => {
            let txs = queries::get_recent_transactions(&state.pool, limit, offset).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            let total = queries::get_stats(&state.pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?.total_transactions;
            (txs, total)
        }
    };

    let result = json!({ "transactions": txs, "total": total, "limit": limit, "offset": offset, "address": address });
    let _ = state.cache.set(&cache_key, &result, ttl::TRANSACTIONS).await;
    Ok(Json(result))
}

pub async fn get_address(State(state): State<AppState>, Path(address): Path<String>) -> Result<Json<Value>, StatusCode> {
    let address = address.to_lowercase();
    let meta = queries::get_address_meta(&state.pool, &address).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(match meta {
        Some(m) => json!({
            "address": address,
            "firstSeenBlock": m.first_seen_block,
            "lastSeenBlock": m.last_seen_block,
            "txCount": m.tx_count,
            "isContract": m.is_contract,
        }),
        None => json!({ "address": address, "firstSeenBlock": null, "lastSeenBlock": null, "txCount": 0, "isContract": false }),
    }))
}

pub async fn get_address_contract_interactions(
    State(state): State<AppState>,
    Path(address): Path<String>,
    Query(params): Query<PageParams>,
) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.offset.unwrap_or(0).max(0);
    let address = address.to_lowercase();

    let txs = queries::get_contract_interactions(&state.pool, &address, limit, offset)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(json!({ "transactions": txs, "limit": limit, "offset": offset, "address": address })))
}
