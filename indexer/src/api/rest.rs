use crate::api::AppState;
use crate::cache::{keys, ttl};
use crate::db::queries;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::Json;
use once_cell::sync::Lazy;
use prometheus::{register_counter, register_histogram, Counter, Encoder, Histogram, TextEncoder};
use serde::Deserialize;
use serde_json::Value;

pub async fn health() -> Json<Value> {
    Json(serde_json::json!({
        "status": "ok",
        "service": "awarizon-indexer",
    }))
}

pub async fn stats(State(state): State<AppState>) -> Result<Json<Value>, StatusCode> {
    let cache_key = keys::stats();
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        CACHE_HITS.inc();
        return Ok(Json(cached));
    }
    CACHE_MISSES.inc();

    let result = queries::get_indexer_stats(&state.pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let _ = state.cache.set(&cache_key, &result, ttl::STATS).await;
    Ok(Json(result))
}

#[derive(Deserialize)]
pub struct PaginationParams {
    pub limit: Option<i64>,
}

pub async fn get_blocks(
    State(state): State<AppState>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(20).min(100);
    let cache_key = keys::blocks(limit);
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        CACHE_HITS.inc();
        return Ok(Json(cached));
    }
    CACHE_MISSES.inc();

    let blocks = queries::get_recent_blocks(&state.pool, limit).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let result = serde_json::json!({ "blocks": blocks, "limit": limit });
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

pub async fn get_transactions(
    State(state): State<AppState>,
    Query(params): Query<TransactionParams>,
) -> Result<Json<Value>, StatusCode> {
    let address = params.address.ok_or(StatusCode::BAD_REQUEST)?;
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.offset.unwrap_or(0);

    let (txs, count) = tokio::join!(
        queries::get_transactions_for_address(&state.pool, &address, limit, offset),
        queries::get_transaction_count_for_address(&state.pool, &address),
    );

    Ok(Json(serde_json::json!({
        "address": address,
        "transactions": txs.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?,
        "total": count.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?,
        "limit": limit,
        "offset": offset,
    })))
}

#[derive(Deserialize)]
pub struct RecentParams {
    pub limit: Option<i64>,
}

// GET /transactions/recent — global, no address filter. Persistent
// chain-wide feed for the explorer's "Recent Activity" panel.
pub async fn get_recent_transactions(
    State(state): State<AppState>,
    Query(params): Query<RecentParams>,
) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(10).min(100);
    let cache_key = keys::recent_transactions(limit);
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        CACHE_HITS.inc();
        return Ok(Json(cached));
    }
    CACHE_MISSES.inc();

    let transactions =
        queries::get_recent_transfers(&state.pool, limit).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let result = serde_json::json!({ "transactions": transactions, "limit": limit });
    let _ = state.cache.set(&cache_key, &result, ttl::RECENT_TRANSACTIONS).await;
    Ok(Json(result))
}

// GET /dex/pools — all pools with current state (pallet_awarizon_dex).
pub async fn get_dex_pools(State(state): State<AppState>) -> Result<Json<Value>, StatusCode> {
    let cache_key = keys::dex_pools();
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        CACHE_HITS.inc();
        return Ok(Json(cached));
    }
    CACHE_MISSES.inc();

    let pools = queries::get_dex_pools(&state.pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let result = serde_json::json!({ "pools": pools });
    let _ = state.cache.set(&cache_key, &result, ttl::DEX_POOLS).await;
    Ok(Json(result))
}

// GET /dex/pools/{asset_a}/{asset_b} — e.g. /dex/pools/native/token:1
pub async fn get_dex_pool(
    State(state): State<AppState>,
    Path((asset_a, asset_b)): Path<(String, String)>,
) -> Result<Json<Value>, StatusCode> {
    queries::get_dex_pool(&state.pool, &asset_a, &asset_b)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

#[derive(Deserialize)]
pub struct DexSwapParams {
    pub address: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

// GET /dex/swaps?address=...&limit=...&offset=... — omit address for a global feed.
pub async fn get_dex_swaps(
    State(state): State<AppState>,
    Query(params): Query<DexSwapParams>,
) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.offset.unwrap_or(0);
    queries::get_dex_swaps(&state.pool, params.address.as_deref(), limit, offset)
        .await
        .map(|swaps| Json(serde_json::json!({ "swaps": swaps, "limit": limit, "offset": offset })))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

// GET /dex/price/{asset_a}/{asset_b}?limit=... — price history for charting.
pub async fn get_dex_price_history(
    State(state): State<AppState>,
    Path((asset_a, asset_b)): Path<(String, String)>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(100).min(1000);
    queries::get_dex_price_history(&state.pool, &asset_a, &asset_b, limit)
        .await
        .map(|points| Json(serde_json::json!({ "assetA": asset_a, "assetB": asset_b, "prices": points })))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

// GET /dex/stats — DEX-wide summary.
pub async fn get_dex_stats(State(state): State<AppState>) -> Result<Json<Value>, StatusCode> {
    let cache_key = keys::dex_stats();
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        CACHE_HITS.inc();
        return Ok(Json(cached));
    }
    CACHE_MISSES.inc();

    let result = queries::get_dex_stats(&state.pool).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let _ = state.cache.set(&cache_key, &result, ttl::DEX_STATS).await;
    Ok(Json(result))
}

#[derive(Deserialize)]
pub struct CampaignParams {
    pub developer: Option<String>,
    pub event_type: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Deserialize)]
pub struct InboxParams {
    pub wallet: Option<String>,
    pub campaign_id: Option<String>,
    pub event_type: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// GET /campaign-events?developer=5Grw...&event_type=created&limit=50
pub async fn get_campaign_events(
    State(state): State<AppState>,
    Query(params): Query<CampaignParams>,
) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(50).min(200);
    let offset = params.offset.unwrap_or(0);
    let developer = params.developer.as_deref();
    let event_type = params.event_type.as_deref();

    let cache_key = keys::campaign_events(developer, event_type, limit, offset);
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        CACHE_HITS.inc();
        return Ok(Json(cached));
    }
    CACHE_MISSES.inc();

    let result = queries::get_campaign_events(&state.pool, developer, event_type, limit, offset)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let _ = state.cache.set(&cache_key, &result, ttl::CAMPAIGN_EVENTS).await;
    Ok(Json(result))
}

/// GET /inbox-events?wallet=5Grw...&campaign_id=0x...&limit=20
pub async fn get_inbox_events(
    State(state): State<AppState>,
    Query(params): Query<InboxParams>,
) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.offset.unwrap_or(0);
    let wallet = params.wallet.as_deref();
    let campaign_id = params.campaign_id.as_deref();
    let event_type = params.event_type.as_deref();

    let cache_key = keys::inbox_events(wallet, campaign_id, event_type, limit, offset);
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        CACHE_HITS.inc();
        return Ok(Json(cached));
    }
    CACHE_MISSES.inc();

    let result = queries::get_inbox_events(&state.pool, wallet, campaign_id, event_type, limit, offset)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let _ = state.cache.set(&cache_key, &result, ttl::INBOX_EVENTS).await;
    Ok(Json(result))
}

#[derive(Deserialize)]
pub struct WalletCandidatesParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// GET /wallet-candidates?limit=500&offset=0
///
/// Every address this indexer has ever seen, with a first-seen block (age
/// proxy) and which campaigns it has an 'engaged' inbox record for
/// (category-history proxy). There's no accounts/balances table, so this
/// is a best-effort candidate pool for the developer portal's campaign
/// targeting/delivery flow — not a real wallet directory, and it says
/// nothing about RIZ balance or region (that has no data source at all).
pub async fn get_wallet_candidates(
    State(state): State<AppState>,
    Query(params): Query<WalletCandidatesParams>,
) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(500).min(2000);
    let offset = params.offset.unwrap_or(0);

    let cache_key = keys::wallet_candidates(limit, offset);
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        CACHE_HITS.inc();
        return Ok(Json(cached));
    }
    CACHE_MISSES.inc();

    let result = queries::get_wallet_candidates(&state.pool, limit, offset)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let _ = state.cache.set(&cache_key, &result, ttl::WALLET_CANDIDATES).await;
    Ok(Json(result))
}

/// GET /campaign-stats?developer=5Grw...
pub async fn get_campaign_stats(
    State(state): State<AppState>,
    Query(params): Query<CampaignParams>,
) -> Result<Json<Value>, StatusCode> {
    let developer = params.developer.ok_or(StatusCode::BAD_REQUEST)?;

    let cache_key = keys::campaign_stats(&developer);
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        CACHE_HITS.inc();
        return Ok(Json(cached));
    }
    CACHE_MISSES.inc();

    let result =
        queries::get_campaign_stats(&state.pool, &developer).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let _ = state.cache.set(&cache_key, &result, ttl::CAMPAIGN_STATS).await;
    Ok(Json(result))
}

#[derive(Deserialize)]
pub struct SearchParams {
    pub q: String,
    pub category: Option<String>,
    pub developer: Option<String>,
    pub limit: Option<i64>,
}

/// GET /search/apps?q=game&category=Gaming — searches campaign_id/developer
/// by substring. `category` is accepted for a future manifest-backed search
/// but isn't filterable from indexer data alone yet, so it only affects the
/// cache key today.
pub async fn search_apps(
    State(state): State<AppState>,
    Query(params): Query<SearchParams>,
) -> Result<Json<Value>, StatusCode> {
    if params.q.len() < 2 {
        return Err(StatusCode::BAD_REQUEST);
    }
    let limit = params.limit.unwrap_or(20).min(50);
    let category = params.category.as_deref();
    let developer = params.developer.as_deref();

    let cache_key = keys::search(&params.q, category, developer, limit);
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        CACHE_HITS.inc();
        return Ok(Json(cached));
    }
    CACHE_MISSES.inc();

    let result = queries::search_campaigns(&state.pool, &params.q, developer, limit)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let _ = state.cache.set(&cache_key, &result, ttl::SEARCH_RESULTS).await;
    Ok(Json(result))
}

#[derive(Deserialize)]
pub struct NftCollectionListParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Deserialize)]
pub struct NftItemListParams {
    pub listed: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Deserialize)]
pub struct NftEventParams {
    pub collection: Option<i64>,
    pub address: Option<String>,
    pub event_type: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Deserialize)]
pub struct NftRankingParams {
    pub limit: Option<i64>,
}

#[derive(Deserialize)]
pub struct NftSearchParams {
    pub q: String,
    pub limit: Option<i64>,
}

/// GET /nft/collections?limit=20&offset=0
pub async fn get_nft_collections(
    State(state): State<AppState>,
    Query(params): Query<NftCollectionListParams>,
) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.offset.unwrap_or(0);

    let cache_key = keys::nft_collections(limit, offset);
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        CACHE_HITS.inc();
        return Ok(Json(cached));
    }
    CACHE_MISSES.inc();

    let result =
        queries::get_nft_collections(&state.pool, limit, offset).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let _ = state.cache.set(&cache_key, &result, ttl::NFT_COLLECTIONS).await;
    Ok(Json(result))
}

/// GET /nft/collections/{id}
pub async fn get_nft_collection(State(state): State<AppState>, Path(id): Path<i64>) -> Result<Json<Value>, StatusCode> {
    queries::get_nft_collection(&state.pool, id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

/// GET /nft/collections/{id}/items?listed=true&limit=20&offset=0
pub async fn get_nft_collection_items(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Query(params): Query<NftItemListParams>,
) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.offset.unwrap_or(0);
    let listed_only = params.listed.unwrap_or(false);
    queries::get_nft_items(&state.pool, id, listed_only, limit, offset)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// GET /nft/owned/{address}?limit=20&offset=0
pub async fn get_nft_owned(
    State(state): State<AppState>,
    Path(address): Path<String>,
    Query(params): Query<NftCollectionListParams>,
) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.offset.unwrap_or(0);
    queries::get_nft_items_by_owner(&state.pool, &address, limit, offset)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// GET /nft/events?collection=1&address=5Grw...&event_type=sale&limit=20&offset=0
pub async fn get_nft_events(
    State(state): State<AppState>,
    Query(params): Query<NftEventParams>,
) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.offset.unwrap_or(0);
    queries::get_nft_events(
        &state.pool,
        params.collection,
        params.address.as_deref(),
        params.event_type.as_deref(),
        limit,
        offset,
    )
    .await
    .map(Json)
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// GET /nft/rankings?limit=10
pub async fn get_nft_rankings(
    State(state): State<AppState>,
    Query(params): Query<NftRankingParams>,
) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(10).min(100);

    let cache_key = keys::nft_rankings(limit);
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        CACHE_HITS.inc();
        return Ok(Json(cached));
    }
    CACHE_MISSES.inc();

    let result = queries::get_nft_rankings(&state.pool, limit).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let _ = state.cache.set(&cache_key, &result, ttl::NFT_RANKINGS).await;
    Ok(Json(result))
}

/// GET /nft/search?q=genesis&limit=20
pub async fn search_nfts(
    State(state): State<AppState>,
    Query(params): Query<NftSearchParams>,
) -> Result<Json<Value>, StatusCode> {
    if params.q.len() < 2 {
        return Err(StatusCode::BAD_REQUEST);
    }
    let limit = params.limit.unwrap_or(20).min(50);

    let cache_key = keys::nft_search(&params.q, limit);
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        CACHE_HITS.inc();
        return Ok(Json(cached));
    }
    CACHE_MISSES.inc();

    let result = queries::search_nfts(&state.pool, &params.q, limit).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let _ = state.cache.set(&cache_key, &result, ttl::SEARCH_RESULTS).await;
    Ok(Json(result))
}

#[derive(Deserialize)]
pub struct AssetListParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Deserialize)]
pub struct AssetTransferParams {
    pub address: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// GET /assets?limit=20&offset=0
pub async fn get_assets(
    State(state): State<AppState>,
    Query(params): Query<AssetListParams>,
) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.offset.unwrap_or(0);
    queries::get_assets(&state.pool, limit, offset).await.map(Json).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// GET /assets/{id}
pub async fn get_asset(State(state): State<AppState>, Path(id): Path<i64>) -> Result<Json<Value>, StatusCode> {
    queries::get_asset(&state.pool, id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

/// GET /assets/{id}/holders?limit=20&offset=0
pub async fn get_asset_holders(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Query(params): Query<AssetListParams>,
) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.offset.unwrap_or(0);
    queries::get_asset_holders(&state.pool, id, limit, offset).await.map(Json).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// GET /assets/{id}/transfers?address=5Grw...&limit=20&offset=0
pub async fn get_asset_transfers(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Query(params): Query<AssetTransferParams>,
) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.offset.unwrap_or(0);
    queries::get_asset_transfers(&state.pool, id, params.address.as_deref(), limit, offset)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// GET /addresses/{address}/assets — all tokens held by an address.
pub async fn get_address_assets(State(state): State<AppState>, Path(address): Path<String>) -> Result<Json<Value>, StatusCode> {
    queries::get_address_assets(&state.pool, &address).await.map(Json).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

#[derive(Deserialize)]
pub struct WalletIndexParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Deserialize)]
pub struct TargetingParams {
    // Minimum wallet age in days.
    pub min_age: Option<i32>,
    // Minimum activity count.
    pub min_activity: Option<i32>,
    // Category codes, comma separated (e.g. "0,1,2" for DeFi,Gaming,Social).
    pub categories: Option<String>,
    // Region codes, comma separated.
    pub regions: Option<String>,
    // Campaign ID to exclude already-delivered wallets for.
    pub campaign_id: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

fn parse_csv_i32(s: &Option<String>) -> Option<Vec<i32>> {
    s.as_ref().map(|s| s.split(',').filter_map(|c| c.trim().parse().ok()).collect())
}

fn parse_csv_i16(s: &Option<String>) -> Option<Vec<i16>> {
    s.as_ref().map(|s| s.split(',').filter_map(|c| c.trim().parse().ok()).collect())
}

/// GET /wallet-index?limit=100&offset=0 — every wallet that has called
/// update_wallet_index, with its full targeting profile.
pub async fn get_wallet_index(
    State(state): State<AppState>,
    Query(params): Query<WalletIndexParams>,
) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(100).min(2000);
    let offset = params.offset.unwrap_or(0);

    let cache_key = keys::wallet_index(limit, offset);
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        CACHE_HITS.inc();
        return Ok(Json(cached));
    }
    CACHE_MISSES.inc();

    let result = queries::get_indexed_wallets(&state.pool, limit, offset).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let _ = state.cache.set(&cache_key, &result, ttl::WALLET_INDEX).await;
    Ok(Json(result))
}

/// GET /targeting/match?min_age=30&min_activity=5&categories=0,1&regions=166,81&campaign_id=0x...&limit=500&offset=0
///
/// Wallets matching targeting criteria — used by the developer portal before
/// a batch delivery.
pub async fn get_targeting_match(
    State(state): State<AppState>,
    Query(params): Query<TargetingParams>,
) -> Result<Json<Value>, StatusCode> {
    let limit = params.limit.unwrap_or(500).min(2000);
    let offset = params.offset.unwrap_or(0);
    let categories = parse_csv_i32(&params.categories);
    let regions = parse_csv_i16(&params.regions);

    let cache_key = keys::targeting_match(
        params.min_age.unwrap_or(0),
        params.min_activity.unwrap_or(0),
        params.categories.as_deref().unwrap_or(""),
        params.regions.as_deref().unwrap_or(""),
        params.campaign_id.as_deref().unwrap_or(""),
        limit,
        offset,
    );
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        CACHE_HITS.inc();
        return Ok(Json(cached));
    }
    CACHE_MISSES.inc();

    let result = queries::get_matching_wallets(
        &state.pool,
        params.min_age,
        params.min_activity,
        categories.as_deref(),
        regions.as_deref(),
        params.campaign_id.as_deref(),
        limit,
        offset,
    )
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let _ = state.cache.set(&cache_key, &result, ttl::TARGETING).await;
    Ok(Json(result))
}

/// GET /targeting/summary?min_age=30&min_activity=5&categories=0,1&regions=166&campaign_id=0x...
///
/// Match count without the wallet list — a fast "N wallets will receive
/// this" preview for the developer portal.
pub async fn get_targeting_summary(
    State(state): State<AppState>,
    Query(params): Query<TargetingParams>,
) -> Result<Json<Value>, StatusCode> {
    let categories = parse_csv_i32(&params.categories);
    let regions = parse_csv_i16(&params.regions);

    let cache_key = keys::targeting_summary(
        params.min_age.unwrap_or(0),
        params.min_activity.unwrap_or(0),
        params.categories.as_deref().unwrap_or(""),
        params.regions.as_deref().unwrap_or(""),
        params.campaign_id.as_deref().unwrap_or(""),
    );
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        CACHE_HITS.inc();
        return Ok(Json(cached));
    }
    CACHE_MISSES.inc();

    let result = queries::get_targeting_summary(
        &state.pool,
        params.min_age,
        params.min_activity,
        categories.as_deref(),
        regions.as_deref(),
        params.campaign_id.as_deref(),
    )
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let _ = state.cache.set(&cache_key, &result, ttl::TARGETING).await;
    Ok(Json(result))
}

/// GET /campaigns/{campaign_id}/deliveries — which wallets received this campaign.
pub async fn get_campaign_deliveries(
    State(state): State<AppState>,
    Path(campaign_id): Path<String>,
) -> Result<Json<Value>, StatusCode> {
    let cache_key = keys::campaign_deliveries(&campaign_id);
    if let Some(cached) = state.cache.get::<Value>(&cache_key).await {
        CACHE_HITS.inc();
        return Ok(Json(cached));
    }
    CACHE_MISSES.inc();

    let result =
        queries::get_campaign_delivery_stats(&state.pool, &campaign_id).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let _ = state.cache.set(&cache_key, &result, ttl::CAMPAIGN_DELIVERIES).await;
    Ok(Json(result))
}

static HTTP_REQUESTS: Lazy<Counter> =
    Lazy::new(|| register_counter!("indexer_http_requests_total", "Total HTTP requests").unwrap());

static CACHE_HITS: Lazy<Counter> =
    Lazy::new(|| register_counter!("indexer_cache_hits_total", "Redis cache hits").unwrap());

static CACHE_MISSES: Lazy<Counter> =
    Lazy::new(|| register_counter!("indexer_cache_misses_total", "Redis cache misses").unwrap());

static QUERY_DURATION: Lazy<Histogram> =
    Lazy::new(|| register_histogram!("indexer_query_duration_seconds", "DB query duration").unwrap());

/// GET /metrics — Prometheus metrics. CACHE_HITS/CACHE_MISSES are live (every
/// cached handler above increments them). HTTP_REQUESTS and QUERY_DURATION are
/// registered so /metrics always reports zeroes instead of an empty body, but
/// nothing increments them yet — wiring a request-count middleware and
/// per-query timing is follow-up work, not part of this endpoint.
pub async fn metrics() -> String {
    Lazy::force(&HTTP_REQUESTS);
    Lazy::force(&CACHE_HITS);
    Lazy::force(&CACHE_MISSES);
    Lazy::force(&QUERY_DURATION);

    let encoder = TextEncoder::new();
    let mut buffer = Vec::new();
    encoder.encode(&prometheus::gather(), &mut buffer).unwrap_or_default();
    String::from_utf8(buffer).unwrap_or_default()
}
