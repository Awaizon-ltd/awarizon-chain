use super::sqlx_compat::{query, types::BigDecimal, PgPool, Row};
use anyhow::Result;
use serde_json::Value;
use std::str::FromStr;

fn planck_to_decimal(amount: u128) -> BigDecimal {
    BigDecimal::from_str(&amount.to_string()).expect("u128 always parses as BigDecimal")
}

// ── Sync state ────────────────────────────────────────────────────

pub async fn get_last_indexed_block(pool: &PgPool) -> Result<i64> {
    let row = query("SELECT last_indexed_block FROM indexer_state WHERE id = 1")
        .fetch_one(pool)
        .await?;
    Ok(row.try_get("last_indexed_block")?)
}

pub async fn update_last_indexed_block(pool: &PgPool, block_number: i64, block_hash: &str) -> Result<()> {
    query(
        "UPDATE indexer_state SET last_indexed_block = $1, last_indexed_hash = $2, updated_at = NOW() WHERE id = 1",
    )
    .bind(block_number)
    .bind(block_hash)
    .execute(pool)
    .await?;
    Ok(())
}

// ── Block / extrinsic / event ingestion ──────────────────────────

#[allow(clippy::too_many_arguments)]
pub async fn insert_block(
    pool: &PgPool,
    block_number: i64,
    block_hash: &str,
    parent_hash: &str,
    state_root: &str,
    extrinsics_root: &str,
    extrinsic_count: i32,
    event_count: i32,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    query(
        "INSERT INTO blocks (
           block_number, block_hash, parent_hash, state_root, extrinsics_root,
           extrinsic_count, event_count, timestamp_ms
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (block_number) DO NOTHING",
    )
    .bind(block_number)
    .bind(block_hash)
    .bind(parent_hash)
    .bind(state_root)
    .bind(extrinsics_root)
    .bind(extrinsic_count)
    .bind(event_count)
    .bind(timestamp_ms)
    .execute(pool)
    .await?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub async fn insert_extrinsic(
    pool: &PgPool,
    block_number: i64,
    block_hash: &str,
    extrinsic_index: i32,
    extrinsic_hash: &str,
    pallet: &str,
    method: &str,
    signer: Option<&str>,
    nonce: Option<i64>,
    success: bool,
    args: Option<Value>,
) -> Result<()> {
    query(
        "INSERT INTO extrinsics (
           block_number, block_hash, extrinsic_index, extrinsic_hash,
           pallet, method, signer, nonce, success, args
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (block_number, extrinsic_index) DO NOTHING",
    )
    .bind(block_number)
    .bind(block_hash)
    .bind(extrinsic_index)
    .bind(extrinsic_hash)
    .bind(pallet)
    .bind(method)
    .bind(signer)
    .bind(nonce)
    .bind(success)
    .bind(args)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn insert_event(
    pool: &PgPool,
    block_number: i64,
    block_hash: &str,
    event_index: i32,
    pallet: &str,
    method: &str,
    data: Option<Value>,
) -> Result<()> {
    query(
        "INSERT INTO events (block_number, block_hash, event_index, pallet, method, data)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (block_number, event_index) DO NOTHING",
    )
    .bind(block_number)
    .bind(block_hash)
    .bind(event_index)
    .bind(pallet)
    .bind(method)
    .bind(data)
    .execute(pool)
    .await?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub async fn insert_transfer(
    pool: &PgPool,
    block_number: i64,
    block_hash: &str,
    event_index: i32,
    extrinsic_hash: Option<&str>,
    from_address: &str,
    to_address: &str,
    amount_planck: u128,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    query(
        "INSERT INTO transfers (
           block_number, block_hash, event_index, extrinsic_hash, from_address, to_address, amount_planck, timestamp_ms
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (block_number, event_index) DO NOTHING",
    )
    .bind(block_number)
    .bind(block_hash)
    .bind(event_index)
    .bind(extrinsic_hash)
    .bind(from_address)
    .bind(to_address)
    .bind(planck_to_decimal(amount_planck))
    .bind(timestamp_ms)
    .execute(pool)
    .await?;
    Ok(())
}

// ── Domain event ingestion ────────────────────────────────────────

#[allow(clippy::too_many_arguments)]
pub async fn insert_identity_event(
    pool: &PgPool,
    block_number: i64,
    extrinsic_hash: Option<&str>,
    event_type: &str,
    account: &str,
    riz_name: Option<&str>,
    new_score: Option<i32>,
    transferred_from: Option<&str>,
    transferred_to: Option<&str>,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    query(
        "INSERT INTO identity_events (
           block_number, extrinsic_hash, event_type, account, riz_name,
           new_score, transferred_from, transferred_to, timestamp_ms
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    )
    .bind(block_number)
    .bind(extrinsic_hash)
    .bind(event_type)
    .bind(account)
    .bind(riz_name)
    .bind(new_score)
    .bind(transferred_from)
    .bind(transferred_to)
    .bind(timestamp_ms)
    .execute(pool)
    .await?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub async fn insert_inbox_event(
    pool: &PgPool,
    block_number: i64,
    extrinsic_hash: Option<&str>,
    event_type: &str,
    wallet: &str,
    record_id: &str,
    campaign_id: Option<&str>,
    reward_planck: Option<u128>,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    query(
        "INSERT INTO inbox_events (
           block_number, extrinsic_hash, event_type, wallet, record_id,
           campaign_id, reward_planck, timestamp_ms
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
    )
    .bind(block_number)
    .bind(extrinsic_hash)
    .bind(event_type)
    .bind(wallet)
    .bind(record_id)
    .bind(campaign_id)
    .bind(reward_planck.map(planck_to_decimal))
    .bind(timestamp_ms)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn insert_campaign_event(
    pool: &PgPool,
    block_number: i64,
    extrinsic_hash: Option<&str>,
    event_type: &str,
    campaign_id: &str,
    developer: Option<&str>,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    query(
        "INSERT INTO campaign_events (
           block_number, extrinsic_hash, event_type, campaign_id, developer, timestamp_ms
         ) VALUES ($1,$2,$3,$4,$5,$6)",
    )
    .bind(block_number)
    .bind(extrinsic_hash)
    .bind(event_type)
    .bind(campaign_id)
    .bind(developer)
    .bind(timestamp_ms)
    .execute(pool)
    .await?;
    Ok(())
}

// ── Campaign / inbox read queries ─────────────────────────────────

pub async fn get_campaign_events(
    pool: &PgPool,
    developer: Option<&str>,
    event_type: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Value> {
    let rows = query(
        r#"
        SELECT block_number, extrinsic_hash, event_type, campaign_id, developer, timestamp_ms
        FROM campaign_events
        WHERE ($1::text IS NULL OR developer = $1)
          AND ($2::text IS NULL OR event_type = $2)
        ORDER BY block_number DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(developer)
    .bind(event_type)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total: i64 = query(
        r#"
        SELECT COUNT(*) as count FROM campaign_events
        WHERE ($1::text IS NULL OR developer = $1)
          AND ($2::text IS NULL OR event_type = $2)
        "#,
    )
    .bind(developer)
    .bind(event_type)
    .fetch_one(pool)
    .await?
    .try_get("count")?;

    Ok(serde_json::json!({
        "events": rows.iter().map(|r| serde_json::json!({
            "blockNumber": r.get::<i64, _>("block_number"),
            "extrinsicHash": r.get::<Option<String>, _>("extrinsic_hash"),
            "eventType": r.get::<String, _>("event_type"),
            "campaignId": r.get::<String, _>("campaign_id"),
            "developer": r.get::<Option<String>, _>("developer"),
            "timestamp": r.get::<Option<i64>, _>("timestamp_ms"),
        })).collect::<Vec<_>>(),
        "total": total,
        "limit": limit,
        "offset": offset,
    }))
}

pub async fn get_inbox_events(
    pool: &PgPool,
    wallet: Option<&str>,
    campaign_id: Option<&str>,
    event_type: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Value> {
    let rows = query(
        r#"
        SELECT block_number, extrinsic_hash, event_type, wallet, campaign_id,
               reward_planck::TEXT as reward_planck, timestamp_ms
        FROM inbox_events
        WHERE ($1::text IS NULL OR wallet = $1)
          AND ($2::text IS NULL OR campaign_id = $2)
          AND ($3::text IS NULL OR event_type = $3)
        ORDER BY block_number DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(wallet)
    .bind(campaign_id)
    .bind(event_type)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total: i64 = query(
        r#"
        SELECT COUNT(*) as count FROM inbox_events
        WHERE ($1::text IS NULL OR wallet = $1)
          AND ($2::text IS NULL OR campaign_id = $2)
          AND ($3::text IS NULL OR event_type = $3)
        "#,
    )
    .bind(wallet)
    .bind(campaign_id)
    .bind(event_type)
    .fetch_one(pool)
    .await?
    .try_get("count")?;

    Ok(serde_json::json!({
        "events": rows.iter().map(|r| serde_json::json!({
            "blockNumber": r.get::<i64, _>("block_number"),
            "extrinsicHash": r.get::<Option<String>, _>("extrinsic_hash"),
            "eventType": r.get::<String, _>("event_type"),
            "wallet": r.get::<String, _>("wallet"),
            "campaignId": r.get::<Option<String>, _>("campaign_id"),
            "rewardPlanck": r.get::<Option<String>, _>("reward_planck"),
            "timestamp": r.get::<Option<i64>, _>("timestamp_ms"),
        })).collect::<Vec<_>>(),
        "total": total,
        "limit": limit,
        "offset": offset,
    }))
}

/// Candidate wallets for campaign targeting: every address this indexer has
/// ever seen (as a transfer party, inbox recipient, or identity owner),
/// with the earliest block it appeared in (used by the developer portal as
/// a wallet-age proxy — there's no dedicated accounts/balances table) and
/// which campaigns it has an 'engaged' inbox record for (used for
/// category-history targeting, resolved against manifest categories on the
/// portal side since campaign_id -> category isn't stored here).
pub async fn get_wallet_candidates(pool: &PgPool, limit: i64, offset: i64) -> Result<Value> {
    let rows = query(
        r#"
        WITH all_addresses AS (
            SELECT from_address AS address, block_number FROM transfers
            UNION ALL
            SELECT to_address AS address, block_number FROM transfers
            UNION ALL
            SELECT wallet AS address, block_number FROM inbox_events
            UNION ALL
            SELECT account AS address, block_number FROM identity_events
        ),
        first_seen AS (
            SELECT address, MIN(block_number) AS first_seen_block
            FROM all_addresses
            GROUP BY address
        ),
        engaged AS (
            SELECT wallet AS address,
                   array_agg(DISTINCT campaign_id) FILTER (WHERE campaign_id IS NOT NULL) AS engaged_campaign_ids
            FROM inbox_events
            WHERE event_type = 'engaged'
            GROUP BY wallet
        )
        SELECT fs.address, fs.first_seen_block,
               COALESCE(e.engaged_campaign_ids, ARRAY[]::text[]) AS engaged_campaign_ids
        FROM first_seen fs
        LEFT JOIN engaged e ON e.address = fs.address
        ORDER BY fs.address
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total: i64 = query(
        r#"
        WITH all_addresses AS (
            SELECT from_address AS address FROM transfers
            UNION ALL
            SELECT to_address AS address FROM transfers
            UNION ALL
            SELECT wallet AS address FROM inbox_events
            UNION ALL
            SELECT account AS address FROM identity_events
        )
        SELECT COUNT(DISTINCT address) as count FROM all_addresses
        "#,
    )
    .fetch_one(pool)
    .await?
    .try_get("count")?;

    Ok(serde_json::json!({
        "wallets": rows.iter().map(|r| serde_json::json!({
            "address": r.get::<String, _>("address"),
            "firstSeenBlock": r.get::<i64, _>("first_seen_block"),
            "engagedCampaignIds": r.get::<Vec<String>, _>("engaged_campaign_ids"),
        })).collect::<Vec<_>>(),
        "total": total,
        "limit": limit,
        "offset": offset,
    }))
}

/// Campaign summary for a developer: campaign count plus delivery/engagement
/// counts joined through campaign_id (inbox_events has no developer column).
pub async fn get_campaign_stats(pool: &PgPool, developer: &str) -> Result<Value> {
    let campaign_count: i64 = query(
        "SELECT COUNT(*) as count FROM campaign_events WHERE developer = $1 AND event_type = 'created'",
    )
    .bind(developer)
    .fetch_one(pool)
    .await?
    .try_get("count")?;

    let delivery_count: i64 = query(
        r#"
        SELECT COUNT(*) as count FROM inbox_events ie
        JOIN campaign_events ce ON ie.campaign_id = ce.campaign_id
        WHERE ce.developer = $1 AND ie.event_type = 'delivered'
        "#,
    )
    .bind(developer)
    .fetch_one(pool)
    .await?
    .try_get("count")?;

    let engagement_count: i64 = query(
        r#"
        SELECT COUNT(*) as count FROM inbox_events ie
        JOIN campaign_events ce ON ie.campaign_id = ce.campaign_id
        WHERE ce.developer = $1 AND ie.event_type = 'engaged'
        "#,
    )
    .bind(developer)
    .fetch_one(pool)
    .await?
    .try_get("count")?;

    let engagement_rate = if delivery_count > 0 {
        (engagement_count as f64 / delivery_count as f64 * 100.0).round() / 100.0
    } else {
        0.0
    };

    Ok(serde_json::json!({
        "developer": developer,
        "totalCampaigns": campaign_count,
        "totalDeliveries": delivery_count,
        "totalEngagements": engagement_count,
        "engagementRate": engagement_rate,
    }))
}

/// Substring search over campaign_id/developer, with delivery/engagement
/// counts. `category` isn't filterable — campaign_events has no category
/// column, that lives in off-chain manifest data — so it's not a parameter
/// here even though the REST layer accepts it (for a future manifest-backed
/// search) and folds it into the cache key.
pub async fn search_campaigns(pool: &PgPool, search_query: &str, developer: Option<&str>, limit: i64) -> Result<Value> {
    let pattern = format!("%{}%", search_query.to_lowercase());

    let rows = query(
        r#"
        SELECT
            ce.campaign_id,
            ce.developer,
            ce.block_number,
            ce.timestamp_ms,
            COUNT(*) FILTER (WHERE ie.event_type = 'delivered') as deliveries,
            COUNT(*) FILTER (WHERE ie.event_type = 'engaged') as engagements
        FROM campaign_events ce
        LEFT JOIN inbox_events ie ON ie.campaign_id = ce.campaign_id
        WHERE ce.event_type = 'created'
          AND (LOWER(ce.campaign_id) LIKE $1 OR LOWER(ce.developer) LIKE $1)
          AND ($2::text IS NULL OR ce.developer = $2)
        GROUP BY ce.campaign_id, ce.developer, ce.block_number, ce.timestamp_ms
        ORDER BY deliveries DESC
        LIMIT $3
        "#,
    )
    .bind(&pattern)
    .bind(developer)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    let results: Vec<Value> = rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "campaignId": r.get::<String, _>("campaign_id"),
                "developer": r.get::<Option<String>, _>("developer"),
                "blockNumber": r.get::<i64, _>("block_number"),
                "deliveries": r.get::<i64, _>("deliveries"),
                "engagements": r.get::<i64, _>("engagements"),
                "timestamp": r.get::<Option<i64>, _>("timestamp_ms"),
            })
        })
        .collect();

    Ok(serde_json::json!({
        "results": results,
        "query": search_query,
        "total": rows.len(),
    }))
}

// ── DEX event ingestion (pallet_awarizon_dex) ─────────────────────

#[allow(clippy::too_many_arguments)]
pub async fn upsert_dex_pool_created(
    pool: &PgPool,
    asset_a: &str,
    asset_b: &str,
    lp_asset_id: i32,
    reserve_a: u128,
    reserve_b: u128,
    creator: &str,
    block_number: i64,
) -> Result<()> {
    query(
        "INSERT INTO dex_pools (
           asset_a, asset_b, lp_asset_id, reserve_a, reserve_b,
           lp_total_supply, creator, created_block, last_updated_block
         ) VALUES ($1,$2,$3,$4,$5,0,$6,$7,$7)
         ON CONFLICT (asset_a, asset_b) DO UPDATE SET
           reserve_a = EXCLUDED.reserve_a,
           reserve_b = EXCLUDED.reserve_b,
           last_updated_block = EXCLUDED.last_updated_block",
    )
    .bind(asset_a)
    .bind(asset_b)
    .bind(lp_asset_id)
    .bind(planck_to_decimal(reserve_a))
    .bind(planck_to_decimal(reserve_b))
    .bind(creator)
    .bind(block_number)
    .execute(pool)
    .await?;
    Ok(())
}

/// Updates a pool's reserves/LP supply after LiquidityAdded or LiquidityRemoved.
/// A no-op if the pool row doesn't exist yet (shouldn't happen — PoolCreated
/// always precedes these — but a partially-synced range shouldn't panic).
pub async fn update_dex_pool_liquidity(
    pool: &PgPool,
    asset_a: &str,
    asset_b: &str,
    reserve_a: u128,
    reserve_b: u128,
    lp_total_supply: u128,
    block_number: i64,
) -> Result<()> {
    query(
        "UPDATE dex_pools SET
           reserve_a = $3, reserve_b = $4, lp_total_supply = $5, last_updated_block = $6
         WHERE asset_a = $1 AND asset_b = $2",
    )
    .bind(asset_a)
    .bind(asset_b)
    .bind(planck_to_decimal(reserve_a))
    .bind(planck_to_decimal(reserve_b))
    .bind(planck_to_decimal(lp_total_supply))
    .bind(block_number)
    .execute(pool)
    .await?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub async fn insert_dex_liquidity_event(
    pool: &PgPool,
    block_number: i64,
    block_hash: &str,
    extrinsic_hash: Option<&str>,
    event_index: i32,
    event_type: &str,
    asset_a: &str,
    asset_b: &str,
    provider: &str,
    amount_a: u128,
    amount_b: u128,
    lp_amount: u128,
    reserve_a: u128,
    reserve_b: u128,
    lp_total_supply: u128,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    query(
        "INSERT INTO dex_liquidity_events (
           block_number, block_hash, extrinsic_hash, event_index, event_type,
           asset_a, asset_b, provider, amount_a, amount_b, lp_amount,
           reserve_a, reserve_b, lp_total_supply, timestamp_ms
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (block_number, event_index) DO NOTHING",
    )
    .bind(block_number)
    .bind(block_hash)
    .bind(extrinsic_hash)
    .bind(event_index)
    .bind(event_type)
    .bind(asset_a)
    .bind(asset_b)
    .bind(provider)
    .bind(planck_to_decimal(amount_a))
    .bind(planck_to_decimal(amount_b))
    .bind(planck_to_decimal(lp_amount))
    .bind(planck_to_decimal(reserve_a))
    .bind(planck_to_decimal(reserve_b))
    .bind(planck_to_decimal(lp_total_supply))
    .bind(timestamp_ms)
    .execute(pool)
    .await?;
    Ok(())
}

/// Updates a pool's reserves/volume/fees after a direct (single-hop) Swapped event.
/// Multi-hop swaps have no per-pool equivalent — see `route_dex`'s `MultiHopSwapped`
/// arm for why — so this is never called for those.
#[allow(clippy::too_many_arguments)]
pub async fn update_dex_pool_after_swap(
    pool: &PgPool,
    asset_a: &str,
    asset_b: &str,
    reserve_a: u128,
    reserve_b: u128,
    amount_in: u128,
    fee: u128,
    protocol_fee: u128,
    block_number: i64,
) -> Result<()> {
    query(
        "UPDATE dex_pools SET
           reserve_a = $3, reserve_b = $4,
           total_volume = total_volume + $5,
           total_fees = total_fees + $6,
           total_burned = total_burned + $7,
           last_updated_block = $8
         WHERE asset_a = $1 AND asset_b = $2",
    )
    .bind(asset_a)
    .bind(asset_b)
    .bind(planck_to_decimal(reserve_a))
    .bind(planck_to_decimal(reserve_b))
    .bind(planck_to_decimal(amount_in))
    .bind(planck_to_decimal(fee))
    .bind(planck_to_decimal(protocol_fee))
    .bind(block_number)
    .execute(pool)
    .await?;
    Ok(())
}

/// Records one swap — direct (all `Option` fields `Some`) or multi-hop (fee/reserve/
/// price breakdown unavailable, so `None`; see `route_dex`).
#[allow(clippy::too_many_arguments)]
pub async fn insert_dex_swap(
    pool: &PgPool,
    block_number: i64,
    block_hash: &str,
    extrinsic_hash: Option<&str>,
    event_index: i32,
    trader: &str,
    asset_in: &str,
    asset_out: &str,
    amount_in: u128,
    amount_out: u128,
    fee: Option<u128>,
    protocol_fee: Option<u128>,
    protocol_fee_burned: Option<bool>,
    reserve_a: Option<u128>,
    reserve_b: Option<u128>,
    price_a_per_b: Option<u128>,
    price_b_per_a: Option<u128>,
    is_multi_hop: bool,
    hop_path: Option<&str>,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    query(
        "INSERT INTO dex_swaps (
           block_number, block_hash, extrinsic_hash, event_index,
           trader, asset_in, asset_out, amount_in, amount_out,
           fee, protocol_fee, protocol_fee_burned,
           reserve_a, reserve_b, price_a_per_b, price_b_per_a,
           is_multi_hop, hop_path, timestamp_ms
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         ON CONFLICT (block_number, event_index) DO NOTHING",
    )
    .bind(block_number)
    .bind(block_hash)
    .bind(extrinsic_hash)
    .bind(event_index)
    .bind(trader)
    .bind(asset_in)
    .bind(asset_out)
    .bind(planck_to_decimal(amount_in))
    .bind(planck_to_decimal(amount_out))
    .bind(fee.map(planck_to_decimal))
    .bind(protocol_fee.map(planck_to_decimal))
    .bind(protocol_fee_burned)
    .bind(reserve_a.map(planck_to_decimal))
    .bind(reserve_b.map(planck_to_decimal))
    .bind(price_a_per_b.map(planck_to_decimal))
    .bind(price_b_per_a.map(planck_to_decimal))
    .bind(is_multi_hop)
    .bind(hop_path)
    .bind(timestamp_ms)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn insert_dex_price_point(
    pool: &PgPool,
    block_number: i64,
    asset_a: &str,
    asset_b: &str,
    price_a_per_b: u128,
    price_b_per_a: u128,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    query(
        "INSERT INTO dex_price_history (
           block_number, asset_a, asset_b, price_a_per_b, price_b_per_a, timestamp_ms
         ) VALUES ($1,$2,$3,$4,$5,$6)",
    )
    .bind(block_number)
    .bind(asset_a)
    .bind(asset_b)
    .bind(planck_to_decimal(price_a_per_b))
    .bind(planck_to_decimal(price_b_per_a))
    .bind(timestamp_ms)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn insert_dex_protocol_fee(
    pool: &PgPool,
    block_number: i64,
    extrinsic_hash: Option<&str>,
    amount: u128,
    burned: bool,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    query(
        "INSERT INTO dex_protocol_fees (block_number, extrinsic_hash, amount, burned, timestamp_ms)
         VALUES ($1,$2,$3,$4,$5)",
    )
    .bind(block_number)
    .bind(extrinsic_hash)
    .bind(planck_to_decimal(amount))
    .bind(burned)
    .bind(timestamp_ms)
    .execute(pool)
    .await?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub async fn insert_staking_event(
    pool: &PgPool,
    block_number: i64,
    extrinsic_hash: Option<&str>,
    event_type: &str,
    delegator: Option<&str>,
    validator: Option<&str>,
    amount_planck: Option<u128>,
    epoch: Option<i64>,
    commission: Option<i32>,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    query(
        "INSERT INTO staking_events (
           block_number, extrinsic_hash, event_type, delegator, validator,
           amount_planck, epoch, commission, timestamp_ms
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    )
    .bind(block_number)
    .bind(extrinsic_hash)
    .bind(event_type)
    .bind(delegator)
    .bind(validator)
    .bind(amount_planck.map(planck_to_decimal))
    .bind(epoch)
    .bind(commission)
    .bind(timestamp_ms)
    .execute(pool)
    .await?;
    Ok(())
}

// ── DEX read queries ──────────────────────────────────────────────

/// `pallet_awarizon_dex::types::PoolId::new` always sorts Native before any
/// Token(id), and Token(id) by ascending id — dex_pools rows are stored in
/// that same order. Path params can arrive in either order, so canonicalize
/// before looking a pool up by (asset_a, asset_b).
fn canonical_asset_pair(a: &str, b: &str) -> (String, String) {
    fn rank(s: &str) -> (u8, u32) {
        match s.strip_prefix("token:").and_then(|n| n.parse::<u32>().ok()) {
            Some(id) => (1, id),
            None => (0, 0), // "native"
        }
    }
    if rank(a) <= rank(b) { (a.to_string(), b.to_string()) } else { (b.to_string(), a.to_string()) }
}

fn dex_pool_row_to_json(r: &sqlx_postgres::PgRow) -> Value {
    serde_json::json!({
        "assetA": r.get::<String, _>("asset_a"),
        "assetB": r.get::<String, _>("asset_b"),
        "lpAssetId": r.get::<i32, _>("lp_asset_id"),
        "reserveA": r.get::<BigDecimal, _>("reserve_a").to_string(),
        "reserveB": r.get::<BigDecimal, _>("reserve_b").to_string(),
        "lpTotalSupply": r.get::<BigDecimal, _>("lp_total_supply").to_string(),
        "totalVolume": r.get::<BigDecimal, _>("total_volume").to_string(),
        "totalFees": r.get::<BigDecimal, _>("total_fees").to_string(),
        "totalBurned": r.get::<BigDecimal, _>("total_burned").to_string(),
        "creator": r.get::<Option<String>, _>("creator"),
        "createdBlock": r.get::<i64, _>("created_block"),
        "lastUpdatedBlock": r.get::<i64, _>("last_updated_block"),
    })
}

pub async fn get_dex_pools(pool: &PgPool) -> Result<Vec<Value>> {
    let rows = query("SELECT * FROM dex_pools ORDER BY id ASC").fetch_all(pool).await?;
    Ok(rows.iter().map(dex_pool_row_to_json).collect())
}

pub async fn get_dex_pool(pool: &PgPool, asset_a: &str, asset_b: &str) -> Result<Option<Value>> {
    let (a, b) = canonical_asset_pair(asset_a, asset_b);
    let row = query("SELECT * FROM dex_pools WHERE asset_a = $1 AND asset_b = $2")
        .bind(a)
        .bind(b)
        .fetch_optional(pool)
        .await?;
    Ok(row.as_ref().map(dex_pool_row_to_json))
}

pub async fn get_dex_swaps(
    pool: &PgPool,
    address: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Vec<Value>> {
    let rows = match address {
        Some(addr) => {
            query(
                r#"
                SELECT block_number, block_hash, extrinsic_hash, trader, asset_in, asset_out,
                       amount_in::TEXT as amount_in, amount_out::TEXT as amount_out,
                       fee::TEXT as fee, protocol_fee::TEXT as protocol_fee,
                       is_multi_hop, hop_path, timestamp_ms
                FROM dex_swaps
                WHERE trader = $1
                ORDER BY block_number DESC
                LIMIT $2 OFFSET $3
                "#,
            )
            .bind(addr)
            .bind(limit)
            .bind(offset)
            .fetch_all(pool)
            .await?
        }
        None => {
            query(
                r#"
                SELECT block_number, block_hash, extrinsic_hash, trader, asset_in, asset_out,
                       amount_in::TEXT as amount_in, amount_out::TEXT as amount_out,
                       fee::TEXT as fee, protocol_fee::TEXT as protocol_fee,
                       is_multi_hop, hop_path, timestamp_ms
                FROM dex_swaps
                ORDER BY block_number DESC
                LIMIT $1 OFFSET $2
                "#,
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(pool)
            .await?
        }
    };

    Ok(rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "blockNumber": r.get::<i64, _>("block_number"),
                "blockHash": r.get::<String, _>("block_hash"),
                "extrinsicHash": r.get::<Option<String>, _>("extrinsic_hash"),
                "trader": r.get::<String, _>("trader"),
                "assetIn": r.get::<String, _>("asset_in"),
                "assetOut": r.get::<String, _>("asset_out"),
                "amountIn": r.get::<String, _>("amount_in"),
                "amountOut": r.get::<String, _>("amount_out"),
                "fee": r.get::<Option<String>, _>("fee"),
                "protocolFee": r.get::<Option<String>, _>("protocol_fee"),
                "isMultiHop": r.get::<bool, _>("is_multi_hop"),
                "hopPath": r.get::<Option<String>, _>("hop_path"),
                "timestamp": r.get::<Option<i64>, _>("timestamp_ms"),
            })
        })
        .collect())
}

pub async fn get_dex_price_history(
    pool: &PgPool,
    asset_a: &str,
    asset_b: &str,
    limit: i64,
) -> Result<Vec<Value>> {
    let (a, b) = canonical_asset_pair(asset_a, asset_b);
    let rows = query(
        r#"
        SELECT block_number, price_a_per_b::TEXT as price_a_per_b,
               price_b_per_a::TEXT as price_b_per_a, timestamp_ms
        FROM dex_price_history
        WHERE asset_a = $1 AND asset_b = $2
        ORDER BY block_number DESC
        LIMIT $3
        "#,
    )
    .bind(a)
    .bind(b)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "blockNumber": r.get::<i64, _>("block_number"),
                "priceAPerB": r.get::<String, _>("price_a_per_b"),
                "priceBPerA": r.get::<String, _>("price_b_per_a"),
                "timestamp": r.get::<Option<i64>, _>("timestamp_ms"),
            })
        })
        .collect())
}

// totalVolumeRiz/totalFeesCollected/totalProtocolBurned are summed only over
// RIZ-paired pools (asset_a = 'native', guaranteed by PoolId's sort order for
// any pool that includes RIZ) — a Token/Token pool's total_volume is
// denominated in its own asset_a token, not RIZ, so summing it in would mix
// incompatible units into one number.
pub async fn get_dex_stats(pool: &PgPool) -> Result<Value> {
    let total_pools: i64 =
        query("SELECT COUNT(*) as count FROM dex_pools").fetch_one(pool).await?.try_get("count")?;

    let total_swaps: i64 =
        query("SELECT COUNT(*) as count FROM dex_swaps").fetch_one(pool).await?.try_get("count")?;

    let riz_totals = query(
        "SELECT
           COALESCE(SUM(total_volume), 0)::TEXT as volume,
           COALESCE(SUM(total_fees), 0)::TEXT as fees,
           COALESCE(SUM(total_burned), 0)::TEXT as burned
         FROM dex_pools WHERE asset_a = 'native'",
    )
    .fetch_one(pool)
    .await?;

    Ok(serde_json::json!({
        "totalPools": total_pools,
        "totalSwaps": total_swaps,
        "totalVolumeRiz": riz_totals.get::<String, _>("volume"),
        "totalFeesCollected": riz_totals.get::<String, _>("fees"),
        "totalProtocolBurned": riz_totals.get::<String, _>("burned"),
    }))
}

// ── NFT event ingestion (pallet_nfts) ─────────────────────────────

/// Insert or update an NFT collection on Created/ForceCreated. `creator` is
/// `None` for ForceCreated (the pallet has no creator concept for admin-forced
/// collections) — left untouched on conflict so a later event can't blank it.
pub async fn upsert_nft_collection(
    pool: &PgPool,
    collection_id: i64,
    owner: &str,
    creator: Option<&str>,
    block_number: i64,
) -> Result<()> {
    query(
        "INSERT INTO nft_collections (
           collection_id, owner, creator, created_block, last_updated_block
         ) VALUES ($1,$2,$3,$4,$4)
         ON CONFLICT (collection_id) DO UPDATE SET
           owner = EXCLUDED.owner,
           last_updated_block = EXCLUDED.last_updated_block",
    )
    .bind(collection_id)
    .bind(owner)
    .bind(creator)
    .bind(block_number)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn update_nft_collection_owner(pool: &PgPool, collection_id: i64, new_owner: &str, block_number: i64) -> Result<()> {
    query(
        "UPDATE nft_collections SET owner = $2, last_updated_block = $3 WHERE collection_id = $1",
    )
    .bind(collection_id)
    .bind(new_owner)
    .bind(block_number)
    .execute(pool)
    .await?;
    Ok(())
}

/// Sets the raw on-chain metadata_uri. When it's cleared (`None`), the
/// previously-resolved name/image_url/banner_url/description are cleared
/// too — they're derived from that URI and would otherwise go stale.
/// When it's set to a new URI, resolving those fields is the metadata
/// resolver's job (see `indexer::metadata_resolver`), not this function's —
/// keeps this a fast, synchronous DB write with no outbound HTTP call
/// blocking block processing.
pub async fn update_nft_collection_metadata(
    pool: &PgPool,
    collection_id: i64,
    metadata_uri: Option<&str>,
    block_number: i64,
) -> Result<()> {
    if metadata_uri.is_some() {
        query("UPDATE nft_collections SET metadata_uri = $2, last_updated_block = $3 WHERE collection_id = $1")
            .bind(collection_id)
            .bind(metadata_uri)
            .bind(block_number)
            .execute(pool)
            .await?;
    } else {
        query(
            "UPDATE nft_collections SET metadata_uri = NULL, name = NULL, image_url = NULL,
             banner_url = NULL, description = NULL, last_updated_block = $2 WHERE collection_id = $1",
        )
        .bind(collection_id)
        .bind(block_number)
        .execute(pool)
        .await?;
    }
    Ok(())
}

/// Writes back the name/image/banner/description resolved from a
/// collection's off-chain metadata JSON. See `update_nft_collection_metadata`
/// for why this is a separate call from setting the URI itself.
pub async fn set_nft_collection_resolved_metadata(
    pool: &PgPool,
    collection_id: i64,
    name: Option<&str>,
    image_url: Option<&str>,
    banner_url: Option<&str>,
    description: Option<&str>,
) -> Result<()> {
    query(
        "UPDATE nft_collections SET name = $2, image_url = $3, banner_url = $4, description = $5
         WHERE collection_id = $1",
    )
    .bind(collection_id)
    .bind(name)
    .bind(image_url)
    .bind(banner_url)
    .bind(description)
    .execute(pool)
    .await?;
    Ok(())
}

/// Collections with an on-chain metadata_uri but no resolved image yet —
/// either minted before the resolver existed, or a fire-and-forget
/// resolution that failed transiently. Bounded by `limit` so a sweep never
/// bursts more outbound requests than intended.
pub async fn unresolved_nft_collections(pool: &PgPool, limit: i64) -> Result<Vec<(i64, String)>> {
    let rows = query(
        "SELECT collection_id, metadata_uri FROM nft_collections
         WHERE metadata_uri IS NOT NULL AND image_url IS NULL LIMIT $1",
    )
    .bind(limit)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .iter()
        .map(|r| (r.get::<i64, _>("collection_id"), r.get::<String, _>("metadata_uri")))
        .collect())
}

pub async fn update_nft_collection_max_supply(pool: &PgPool, collection_id: i64, max_supply: i64, block_number: i64) -> Result<()> {
    query("UPDATE nft_collections SET max_supply = $2, last_updated_block = $3 WHERE collection_id = $1")
        .bind(collection_id)
        .bind(max_supply)
        .bind(block_number)
        .execute(pool)
        .await?;
    Ok(())
}

/// Marks a collection destroyed by zeroing its live stats. The row is kept
/// (not deleted) so nft_events' collection_id foreign reference and historical
/// activity feed entries stay meaningful.
pub async fn mark_nft_collection_destroyed(pool: &PgPool, collection_id: i64, block_number: i64) -> Result<()> {
    query(
        "UPDATE nft_collections SET
           total_items = 0, listed_items = 0, floor_price = NULL, last_updated_block = $2
         WHERE collection_id = $1",
    )
    .bind(collection_id)
    .bind(block_number)
    .execute(pool)
    .await?;
    Ok(())
}

/// Insert an item on mint (Issued). Bumps the parent collection's total_items;
/// a no-op `ON CONFLICT DO NOTHING` guards against re-processing the same block.
pub async fn insert_nft_item(pool: &PgPool, collection_id: i64, item_id: i64, owner: &str, block_number: i64) -> Result<()> {
    query(
        "INSERT INTO nft_items (collection_id, item_id, owner, minted_block, last_updated_block)
         VALUES ($1,$2,$3,$4,$4)
         ON CONFLICT (collection_id, item_id) DO NOTHING",
    )
    .bind(collection_id)
    .bind(item_id)
    .bind(owner)
    .bind(block_number)
    .execute(pool)
    .await?;

    query("UPDATE nft_collections SET total_items = total_items + 1, last_updated_block = $2 WHERE collection_id = $1")
        .bind(collection_id)
        .bind(block_number)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn transfer_nft_item(pool: &PgPool, collection_id: i64, item_id: i64, new_owner: &str, block_number: i64) -> Result<()> {
    query(
        "UPDATE nft_items SET owner = $3, last_updated_block = $4 WHERE collection_id = $1 AND item_id = $2",
    )
    .bind(collection_id)
    .bind(item_id)
    .bind(new_owner)
    .bind(block_number)
    .execute(pool)
    .await?;
    Ok(())
}

/// Marks an item burned and delists it, then decrements the parent
/// collection's total_items/listed_items and recomputes its floor price.
pub async fn burn_nft_item(pool: &PgPool, collection_id: i64, item_id: i64, block_number: i64) -> Result<()> {
    query(
        "UPDATE nft_items SET burned = true, listed = false, price = NULL, whitelisted_buyer = NULL, last_updated_block = $3
         WHERE collection_id = $1 AND item_id = $2",
    )
    .bind(collection_id)
    .bind(item_id)
    .bind(block_number)
    .execute(pool)
    .await?;

    refresh_nft_collection_stats(pool, collection_id, block_number).await?;
    query("UPDATE nft_collections SET total_items = GREATEST(total_items - 1, 0) WHERE collection_id = $1")
        .bind(collection_id)
        .execute(pool)
        .await?;
    Ok(())
}

/// See `update_nft_collection_metadata` — same clear-on-`None` /
/// resolve-separately split, for items.
pub async fn set_nft_item_metadata(pool: &PgPool, collection_id: i64, item_id: i64, metadata_uri: Option<&str>, block_number: i64) -> Result<()> {
    if metadata_uri.is_some() {
        query(
            "UPDATE nft_items SET metadata_uri = $3, last_updated_block = $4 WHERE collection_id = $1 AND item_id = $2",
        )
        .bind(collection_id)
        .bind(item_id)
        .bind(metadata_uri)
        .bind(block_number)
        .execute(pool)
        .await?;
    } else {
        query(
            "UPDATE nft_items SET metadata_uri = NULL, name = NULL, image_url = NULL,
             description = NULL, last_updated_block = $3 WHERE collection_id = $1 AND item_id = $2",
        )
        .bind(collection_id)
        .bind(item_id)
        .bind(block_number)
        .execute(pool)
        .await?;
    }
    Ok(())
}

/// Writes back the name/image/description resolved from an item's off-chain
/// metadata JSON. See `update_nft_collection_metadata` for why this is
/// separate from setting the URI itself.
pub async fn set_nft_item_resolved_metadata(
    pool: &PgPool,
    collection_id: i64,
    item_id: i64,
    name: Option<&str>,
    image_url: Option<&str>,
    description: Option<&str>,
) -> Result<()> {
    query(
        "UPDATE nft_items SET name = $3, image_url = $4, description = $5
         WHERE collection_id = $1 AND item_id = $2",
    )
    .bind(collection_id)
    .bind(item_id)
    .bind(name)
    .bind(image_url)
    .bind(description)
    .execute(pool)
    .await?;
    Ok(())
}

/// Items with an on-chain metadata_uri but no resolved image yet. See
/// `unresolved_nft_collections` for the sweep-bounding rationale; burned
/// items are excluded since nothing renders them anymore.
pub async fn unresolved_nft_items(pool: &PgPool, limit: i64) -> Result<Vec<(i64, i64, String)>> {
    let rows = query(
        "SELECT collection_id, item_id, metadata_uri FROM nft_items
         WHERE metadata_uri IS NOT NULL AND image_url IS NULL AND burned = false LIMIT $1",
    )
    .bind(limit)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .iter()
        .map(|r| {
            (
                r.get::<i64, _>("collection_id"),
                r.get::<i64, _>("item_id"),
                r.get::<String, _>("metadata_uri"),
            )
        })
        .collect())
}

pub async fn set_nft_item_price(
    pool: &PgPool,
    collection_id: i64,
    item_id: i64,
    price: u128,
    whitelisted_buyer: Option<&str>,
    block_number: i64,
) -> Result<()> {
    query(
        "UPDATE nft_items SET listed = true, price = $3, whitelisted_buyer = $4, last_updated_block = $5
         WHERE collection_id = $1 AND item_id = $2",
    )
    .bind(collection_id)
    .bind(item_id)
    .bind(planck_to_decimal(price))
    .bind(whitelisted_buyer)
    .bind(block_number)
    .execute(pool)
    .await?;

    refresh_nft_collection_stats(pool, collection_id, block_number).await?;
    Ok(())
}

pub async fn remove_nft_item_price(pool: &PgPool, collection_id: i64, item_id: i64, block_number: i64) -> Result<()> {
    query(
        "UPDATE nft_items SET listed = false, price = NULL, whitelisted_buyer = NULL, last_updated_block = $3
         WHERE collection_id = $1 AND item_id = $2",
    )
    .bind(collection_id)
    .bind(item_id)
    .bind(block_number)
    .execute(pool)
    .await?;

    refresh_nft_collection_stats(pool, collection_id, block_number).await?;
    Ok(())
}

/// Transfers ownership to the buyer, delists the item, and rolls the sale
/// into the collection's total_volume, then recomputes listed_items/floor_price.
pub async fn process_nft_sale(pool: &PgPool, collection_id: i64, item_id: i64, price: u128, buyer: &str, block_number: i64) -> Result<()> {
    query(
        "UPDATE nft_items SET owner = $3, listed = false, price = NULL, whitelisted_buyer = NULL, last_updated_block = $4
         WHERE collection_id = $1 AND item_id = $2",
    )
    .bind(collection_id)
    .bind(item_id)
    .bind(buyer)
    .bind(block_number)
    .execute(pool)
    .await?;

    query("UPDATE nft_collections SET total_volume = total_volume + $2, last_updated_block = $3 WHERE collection_id = $1")
        .bind(collection_id)
        .bind(planck_to_decimal(price))
        .bind(block_number)
        .execute(pool)
        .await?;

    refresh_nft_collection_stats(pool, collection_id, block_number).await?;
    Ok(())
}

/// Recomputes a collection's listed_items count and floor_price from its
/// live nft_items rows. Called after any listing/delisting/sale/burn so the
/// two tables never drift out of sync.
async fn refresh_nft_collection_stats(pool: &PgPool, collection_id: i64, block_number: i64) -> Result<()> {
    query(
        "UPDATE nft_collections SET
           listed_items = (SELECT COUNT(*) FROM nft_items WHERE collection_id = $1 AND listed = true AND burned = false),
           floor_price = (SELECT MIN(price) FROM nft_items WHERE collection_id = $1 AND listed = true AND burned = false),
           last_updated_block = $2
         WHERE collection_id = $1",
    )
    .bind(collection_id)
    .bind(block_number)
    .execute(pool)
    .await?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub async fn insert_nft_event(
    pool: &PgPool,
    block_number: i64,
    block_hash: &str,
    extrinsic_hash: Option<&str>,
    event_index: i32,
    event_type: &str,
    collection_id: i64,
    item_id: Option<i64>,
    from_address: Option<&str>,
    to_address: Option<&str>,
    price: Option<u128>,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    query(
        "INSERT INTO nft_events (
           block_number, block_hash, extrinsic_hash, event_index, event_type,
           collection_id, item_id, from_address, to_address, price, timestamp_ms
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (block_number, event_index) DO NOTHING",
    )
    .bind(block_number)
    .bind(block_hash)
    .bind(extrinsic_hash)
    .bind(event_index)
    .bind(event_type)
    .bind(collection_id)
    .bind(item_id)
    .bind(from_address)
    .bind(to_address)
    .bind(price.map(planck_to_decimal))
    .bind(timestamp_ms)
    .execute(pool)
    .await?;
    Ok(())
}

// ── NFT read queries ──────────────────────────────────────────────

fn nft_collection_row_to_json(r: &sqlx_postgres::PgRow) -> Value {
    serde_json::json!({
        "collectionId": r.get::<i64, _>("collection_id"),
        "owner": r.get::<String, _>("owner"),
        "creator": r.get::<Option<String>, _>("creator"),
        "metadataUri": r.get::<Option<String>, _>("metadata_uri"),
        "name": r.get::<Option<String>, _>("name"),
        "imageUrl": r.get::<Option<String>, _>("image_url"),
        "bannerUrl": r.get::<Option<String>, _>("banner_url"),
        "description": r.get::<Option<String>, _>("description"),
        "totalItems": r.get::<i64, _>("total_items"),
        "listedItems": r.get::<i64, _>("listed_items"),
        "totalVolume": r.get::<BigDecimal, _>("total_volume").to_string(),
        "floorPrice": r.get::<Option<BigDecimal>, _>("floor_price").map(|d| d.to_string()),
        "maxSupply": r.get::<Option<i64>, _>("max_supply"),
        "createdBlock": r.get::<i64, _>("created_block"),
        "lastUpdatedBlock": r.get::<i64, _>("last_updated_block"),
    })
}

pub async fn get_nft_collections(pool: &PgPool, limit: i64, offset: i64) -> Result<Value> {
    let rows = query("SELECT * FROM nft_collections ORDER BY total_volume DESC, created_block DESC LIMIT $1 OFFSET $2")
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

    let total: i64 =
        query("SELECT COUNT(*) as count FROM nft_collections").fetch_one(pool).await?.try_get("count")?;

    Ok(serde_json::json!({
        "collections": rows.iter().map(nft_collection_row_to_json).collect::<Vec<_>>(),
        "total": total,
        "limit": limit,
        "offset": offset,
    }))
}

pub async fn get_nft_collection(pool: &PgPool, collection_id: i64) -> Result<Option<Value>> {
    let row = query("SELECT * FROM nft_collections WHERE collection_id = $1")
        .bind(collection_id)
        .fetch_optional(pool)
        .await?;
    Ok(row.as_ref().map(nft_collection_row_to_json))
}

fn nft_item_row_to_json(r: &sqlx_postgres::PgRow) -> Value {
    serde_json::json!({
        "collectionId": r.get::<i64, _>("collection_id"),
        "itemId": r.get::<i64, _>("item_id"),
        "owner": r.get::<String, _>("owner"),
        "metadataUri": r.get::<Option<String>, _>("metadata_uri"),
        "name": r.get::<Option<String>, _>("name"),
        "imageUrl": r.get::<Option<String>, _>("image_url"),
        "listed": r.get::<bool, _>("listed"),
        "price": r.get::<Option<BigDecimal>, _>("price").map(|d| d.to_string()),
        "mintedBlock": r.get::<i64, _>("minted_block"),
    })
}

pub async fn get_nft_items(pool: &PgPool, collection_id: i64, listed_only: bool, limit: i64, offset: i64) -> Result<Value> {
    let rows = if listed_only {
        query(
            "SELECT * FROM nft_items WHERE collection_id = $1 AND listed = true AND burned = false
             ORDER BY price ASC LIMIT $2 OFFSET $3",
        )
        .bind(collection_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?
    } else {
        query(
            "SELECT * FROM nft_items WHERE collection_id = $1 AND burned = false
             ORDER BY item_id ASC LIMIT $2 OFFSET $3",
        )
        .bind(collection_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?
    };

    Ok(serde_json::json!({
        "items": rows.iter().map(nft_item_row_to_json).collect::<Vec<_>>(),
        "limit": limit,
        "offset": offset,
    }))
}

pub async fn get_nft_items_by_owner(pool: &PgPool, owner: &str, limit: i64, offset: i64) -> Result<Value> {
    let rows = query(
        "SELECT * FROM nft_items WHERE owner = $1 AND burned = false
         ORDER BY last_updated_block DESC LIMIT $2 OFFSET $3",
    )
    .bind(owner)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(serde_json::json!({
        "items": rows.iter().map(nft_item_row_to_json).collect::<Vec<_>>(),
        "limit": limit,
        "offset": offset,
    }))
}

pub async fn get_nft_events(
    pool: &PgPool,
    collection_id: Option<i64>,
    address: Option<&str>,
    event_type: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Value> {
    let rows = query(
        r#"
        SELECT * FROM nft_events
        WHERE ($1::bigint IS NULL OR collection_id = $1)
          AND ($2::text IS NULL OR from_address = $2 OR to_address = $2)
          AND ($3::text IS NULL OR event_type = $3)
        ORDER BY block_number DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(collection_id)
    .bind(address)
    .bind(event_type)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(serde_json::json!({
        "events": rows.iter().map(|r| serde_json::json!({
            "blockNumber": r.get::<i64, _>("block_number"),
            "extrinsicHash": r.get::<Option<String>, _>("extrinsic_hash"),
            "eventType": r.get::<String, _>("event_type"),
            "collectionId": r.get::<i64, _>("collection_id"),
            "itemId": r.get::<Option<i64>, _>("item_id"),
            "fromAddress": r.get::<Option<String>, _>("from_address"),
            "toAddress": r.get::<Option<String>, _>("to_address"),
            "price": r.get::<Option<BigDecimal>, _>("price").map(|d| d.to_string()),
            "timestamp": r.get::<Option<i64>, _>("timestamp_ms"),
        })).collect::<Vec<_>>(),
        "limit": limit,
        "offset": offset,
    }))
}

/// Top collections by lifetime volume, with a live unique-owner count joined
/// from nft_items (not denormalized — it'd need updating on every transfer).
pub async fn get_nft_rankings(pool: &PgPool, limit: i64) -> Result<Value> {
    let rows = query(
        r#"
        SELECT c.*, COUNT(DISTINCT i.owner) as unique_owners
        FROM nft_collections c
        LEFT JOIN nft_items i ON i.collection_id = c.collection_id AND i.burned = false
        GROUP BY c.collection_id
        ORDER BY c.total_volume DESC
        LIMIT $1
        "#,
    )
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(serde_json::json!({
        "rankings": rows.iter().enumerate().map(|(i, r)| serde_json::json!({
            "rank": i + 1,
            "collectionId": r.get::<i64, _>("collection_id"),
            "name": r.get::<Option<String>, _>("name"),
            "imageUrl": r.get::<Option<String>, _>("image_url"),
            "bannerUrl": r.get::<Option<String>, _>("banner_url"),
            "totalVolume": r.get::<BigDecimal, _>("total_volume").to_string(),
            "floorPrice": r.get::<Option<BigDecimal>, _>("floor_price").map(|d| d.to_string()),
            "totalItems": r.get::<i64, _>("total_items"),
            "uniqueOwners": r.get::<i64, _>("unique_owners"),
        })).collect::<Vec<_>>(),
    }))
}

/// Substring search over collection/item name, split roughly in half between
/// the two result kinds like `search_campaigns` splits its query budget.
pub async fn search_nfts(pool: &PgPool, search_query: &str, limit: i64) -> Result<Value> {
    let pattern = format!("%{}%", search_query.to_lowercase());
    let half = (limit / 2).max(1);

    let collections = query(
        "SELECT collection_id, name, image_url, total_items, floor_price
         FROM nft_collections WHERE LOWER(COALESCE(name, '')) LIKE $1 LIMIT $2",
    )
    .bind(&pattern)
    .bind(half)
    .fetch_all(pool)
    .await?;

    let items = query(
        "SELECT collection_id, item_id, name, image_url, owner, price, listed
         FROM nft_items WHERE LOWER(COALESCE(name, '')) LIKE $1 AND burned = false LIMIT $2",
    )
    .bind(&pattern)
    .bind(half)
    .fetch_all(pool)
    .await?;

    Ok(serde_json::json!({
        "collections": collections.iter().map(|r| serde_json::json!({
            "collectionId": r.get::<i64, _>("collection_id"),
            "name": r.get::<Option<String>, _>("name"),
            "imageUrl": r.get::<Option<String>, _>("image_url"),
            "totalItems": r.get::<i64, _>("total_items"),
            "floorPrice": r.get::<Option<BigDecimal>, _>("floor_price").map(|d| d.to_string()),
        })).collect::<Vec<_>>(),
        "items": items.iter().map(|r| serde_json::json!({
            "collectionId": r.get::<i64, _>("collection_id"),
            "itemId": r.get::<i64, _>("item_id"),
            "name": r.get::<Option<String>, _>("name"),
            "imageUrl": r.get::<Option<String>, _>("image_url"),
            "owner": r.get::<String, _>("owner"),
            "price": r.get::<Option<BigDecimal>, _>("price").map(|d| d.to_string()),
            "listed": r.get::<bool, _>("listed"),
        })).collect::<Vec<_>>(),
        "query": search_query,
    }))
}

// ── Asset event ingestion (pallet_assets) ─────────────────────────

/// Signed counterpart to `planck_to_decimal`, for holder-balance/supply deltas
/// that can go negative (Burned/Withdrawn/Transferred-out). `BigDecimal::from_str`
/// parses a leading `-` fine, so this is the same conversion, just over `i128`.
fn delta_to_decimal(delta: i128) -> BigDecimal {
    BigDecimal::from_str(&delta.to_string()).expect("i128 always parses as BigDecimal")
}

/// Insert an asset on Created/ForceCreated. `ON CONFLICT DO NOTHING` so a
/// ForceCreated arriving after Created (or a re-processed block) can't
/// clobber the row.
pub async fn insert_asset(pool: &PgPool, asset_id: i64, creator: Option<&str>, owner: &str, created_block: i64) -> Result<()> {
    query(
        "INSERT INTO assets (asset_id, creator, owner, created_block, last_updated_block)
         VALUES ($1,$2,$3,$4,$4)
         ON CONFLICT (asset_id) DO NOTHING",
    )
    .bind(asset_id)
    .bind(creator)
    .bind(owner)
    .bind(created_block)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn update_asset_metadata(pool: &PgPool, asset_id: i64, name: &str, symbol: &str, decimals: i16, block_number: i64) -> Result<()> {
    query("UPDATE assets SET name = $2, symbol = $3, decimals = $4, last_updated_block = $5 WHERE asset_id = $1")
        .bind(asset_id)
        .bind(name)
        .bind(symbol)
        .bind(decimals)
        .bind(block_number)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn clear_asset_metadata(pool: &PgPool, asset_id: i64, block_number: i64) -> Result<()> {
    query("UPDATE assets SET name = NULL, symbol = NULL, decimals = 0, last_updated_block = $2 WHERE asset_id = $1")
        .bind(asset_id)
        .bind(block_number)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn update_asset_owner(pool: &PgPool, asset_id: i64, owner: &str, block_number: i64) -> Result<()> {
    query("UPDATE assets SET owner = $2, last_updated_block = $3 WHERE asset_id = $1")
        .bind(asset_id)
        .bind(owner)
        .bind(block_number)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn freeze_asset(pool: &PgPool, asset_id: i64, block_number: i64) -> Result<()> {
    query("UPDATE assets SET is_frozen = true, last_updated_block = $2 WHERE asset_id = $1")
        .bind(asset_id)
        .bind(block_number)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn thaw_asset(pool: &PgPool, asset_id: i64, block_number: i64) -> Result<()> {
    query("UPDATE assets SET is_frozen = false, last_updated_block = $2 WHERE asset_id = $1")
        .bind(asset_id)
        .bind(block_number)
        .execute(pool)
        .await?;
    Ok(())
}

/// Zeroes live stats rather than deleting the row, so asset_transfers'
/// asset_id reference and historical rows stay meaningful (same approach as
/// `mark_nft_collection_destroyed`).
pub async fn destroy_asset(pool: &PgPool, asset_id: i64, block_number: i64) -> Result<()> {
    query(
        "UPDATE assets SET destroyed = true, total_supply = 0, holder_count = 0, last_updated_block = $2
         WHERE asset_id = $1",
    )
    .bind(asset_id)
    .bind(block_number)
    .execute(pool)
    .await?;
    Ok(())
}

/// Applies a signed balance delta to one (asset, address) holder row, floored
/// at zero, then refreshes the parent asset's holder_count. `delta` is
/// positive for Issued/Deposited/incoming Transferred, negative for
/// Burned/Withdrawn/outgoing Transferred.
pub async fn upsert_asset_holder(pool: &PgPool, asset_id: i64, address: &str, delta: i128, block_number: i64) -> Result<()> {
    query(
        "INSERT INTO asset_holders (asset_id, address, balance, last_updated_block)
         VALUES ($1, $2, GREATEST(0, $3), $4)
         ON CONFLICT (asset_id, address) DO UPDATE SET
           balance = GREATEST(0, asset_holders.balance + $3),
           last_updated_block = $4",
    )
    .bind(asset_id)
    .bind(address)
    .bind(delta_to_decimal(delta))
    .bind(block_number)
    .execute(pool)
    .await?;

    query(
        "UPDATE assets SET
           holder_count = (SELECT COUNT(*) FROM asset_holders WHERE asset_id = $1 AND balance > 0),
           last_updated_block = $2
         WHERE asset_id = $1",
    )
    .bind(asset_id)
    .bind(block_number)
    .execute(pool)
    .await?;
    Ok(())
}

/// Applies a signed delta to an asset's total_supply (positive on Issued,
/// negative on Burned), floored at zero.
pub async fn update_asset_supply(pool: &PgPool, asset_id: i64, delta: i128, block_number: i64) -> Result<()> {
    query("UPDATE assets SET total_supply = GREATEST(0, total_supply + $2), last_updated_block = $3 WHERE asset_id = $1")
        .bind(asset_id)
        .bind(delta_to_decimal(delta))
        .bind(block_number)
        .execute(pool)
        .await?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub async fn insert_asset_transfer(
    pool: &PgPool,
    block_number: i64,
    block_hash: &str,
    extrinsic_hash: Option<&str>,
    event_index: i32,
    asset_id: i64,
    from_address: Option<&str>,
    to_address: Option<&str>,
    amount: u128,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    query(
        "INSERT INTO asset_transfers (
           block_number, block_hash, extrinsic_hash, event_index,
           asset_id, from_address, to_address, amount, timestamp_ms
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (block_number, event_index) DO NOTHING",
    )
    .bind(block_number)
    .bind(block_hash)
    .bind(extrinsic_hash)
    .bind(event_index)
    .bind(asset_id)
    .bind(from_address)
    .bind(to_address)
    .bind(planck_to_decimal(amount))
    .bind(timestamp_ms)
    .execute(pool)
    .await?;
    Ok(())
}

// ── Asset read queries ─────────────────────────────────────────────

fn asset_row_to_json(r: &sqlx_postgres::PgRow) -> Value {
    serde_json::json!({
        "assetId": r.get::<i64, _>("asset_id"),
        "creator": r.get::<Option<String>, _>("creator"),
        "owner": r.get::<String, _>("owner"),
        "name": r.get::<Option<String>, _>("name"),
        "symbol": r.get::<Option<String>, _>("symbol"),
        "decimals": r.get::<i16, _>("decimals"),
        "isFrozen": r.get::<bool, _>("is_frozen"),
        "totalSupply": r.get::<BigDecimal, _>("total_supply").to_string(),
        "holderCount": r.get::<i64, _>("holder_count"),
        "destroyed": r.get::<bool, _>("destroyed"),
        "createdBlock": r.get::<i64, _>("created_block"),
        "lastUpdatedBlock": r.get::<i64, _>("last_updated_block"),
    })
}

pub async fn get_assets(pool: &PgPool, limit: i64, offset: i64) -> Result<Value> {
    let rows = query("SELECT * FROM assets WHERE destroyed = false ORDER BY created_block DESC LIMIT $1 OFFSET $2")
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

    let total: i64 =
        query("SELECT COUNT(*) as count FROM assets WHERE destroyed = false").fetch_one(pool).await?.try_get("count")?;

    Ok(serde_json::json!({
        "assets": rows.iter().map(asset_row_to_json).collect::<Vec<_>>(),
        "total": total,
        "limit": limit,
        "offset": offset,
    }))
}

pub async fn get_asset(pool: &PgPool, asset_id: i64) -> Result<Option<Value>> {
    let row = query("SELECT * FROM assets WHERE asset_id = $1").bind(asset_id).fetch_optional(pool).await?;
    Ok(row.as_ref().map(asset_row_to_json))
}

pub async fn get_asset_holders(pool: &PgPool, asset_id: i64, limit: i64, offset: i64) -> Result<Value> {
    let rows = query(
        "SELECT address, balance, last_updated_block FROM asset_holders
         WHERE asset_id = $1 AND balance > 0
         ORDER BY balance DESC LIMIT $2 OFFSET $3",
    )
    .bind(asset_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total: i64 = query("SELECT COUNT(*) as count FROM asset_holders WHERE asset_id = $1 AND balance > 0")
        .bind(asset_id)
        .fetch_one(pool)
        .await?
        .try_get("count")?;

    Ok(serde_json::json!({
        "holders": rows.iter().map(|r| serde_json::json!({
            "address": r.get::<String, _>("address"),
            "balance": r.get::<BigDecimal, _>("balance").to_string(),
            "lastUpdatedBlock": r.get::<i64, _>("last_updated_block"),
        })).collect::<Vec<_>>(),
        "total": total,
        "limit": limit,
        "offset": offset,
    }))
}

pub async fn get_asset_transfers(pool: &PgPool, asset_id: i64, address: Option<&str>, limit: i64, offset: i64) -> Result<Value> {
    let rows = query(
        r#"
        SELECT block_number, extrinsic_hash, from_address, to_address, amount::TEXT as amount, timestamp_ms
        FROM asset_transfers
        WHERE asset_id = $1
          AND ($2::text IS NULL OR from_address = $2 OR to_address = $2)
        ORDER BY block_number DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(asset_id)
    .bind(address)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(serde_json::json!({
        "transfers": rows.iter().map(|r| serde_json::json!({
            "blockNumber": r.get::<i64, _>("block_number"),
            "extrinsicHash": r.get::<Option<String>, _>("extrinsic_hash"),
            "fromAddress": r.get::<Option<String>, _>("from_address"),
            "toAddress": r.get::<Option<String>, _>("to_address"),
            "amount": r.get::<String, _>("amount"),
            "timestamp": r.get::<Option<i64>, _>("timestamp_ms"),
        })).collect::<Vec<_>>(),
        "limit": limit,
        "offset": offset,
    }))
}

/// All tokens held by an address, joined with each asset's live metadata/supply.
pub async fn get_address_assets(pool: &PgPool, address: &str) -> Result<Value> {
    let rows = query(
        r#"
        SELECT h.asset_id, h.balance, a.name, a.symbol, a.decimals, a.total_supply, a.holder_count
        FROM asset_holders h
        JOIN assets a ON a.asset_id = h.asset_id
        WHERE h.address = $1 AND h.balance > 0 AND a.destroyed = false
        ORDER BY h.balance DESC
        "#,
    )
    .bind(address)
    .fetch_all(pool)
    .await?;

    Ok(serde_json::json!({
        "assets": rows.iter().map(|r| serde_json::json!({
            "assetId": r.get::<i64, _>("asset_id"),
            "balance": r.get::<BigDecimal, _>("balance").to_string(),
            "name": r.get::<Option<String>, _>("name"),
            "symbol": r.get::<Option<String>, _>("symbol"),
            "decimals": r.get::<i16, _>("decimals"),
            "totalSupply": r.get::<BigDecimal, _>("total_supply").to_string(),
            "holderCount": r.get::<i64, _>("holder_count"),
        })).collect::<Vec<_>>(),
        "address": address,
    }))
}

// ── REST/GraphQL read queries ─────────────────────────────────────

pub async fn get_transactions_for_address(
    pool: &PgPool,
    address: &str,
    limit: i64,
    offset: i64,
) -> Result<Vec<Value>> {
    let rows = query(
        r#"
        SELECT
          block_number,
          block_hash,
          extrinsic_hash,
          CASE WHEN from_address = $1 THEN 'sent' ELSE 'received' END as direction,
          from_address,
          to_address,
          amount_planck::TEXT as amount,
          timestamp_ms
        FROM transfers
        WHERE from_address = $1 OR to_address = $1
        ORDER BY block_number DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(address)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "blockNumber": r.get::<i64, _>("block_number"),
                "blockHash": r.get::<String, _>("block_hash"),
                "extrinsicHash": r.get::<Option<String>, _>("extrinsic_hash"),
                "direction": r.get::<String, _>("direction"),
                "from": r.get::<String, _>("from_address"),
                "to": r.get::<String, _>("to_address"),
                "amount": r.get::<String, _>("amount"),
                "timestamp": r.get::<Option<i64>, _>("timestamp_ms"),
            })
        })
        .collect())
}

// Global recent-transfers feed — no address filter. Backs the explorer's
// Overview "Recent Activity" panel, which needs a persistent view of the
// most recent transfers chain-wide (not scoped to one wallet).
pub async fn get_recent_transfers(pool: &PgPool, limit: i64) -> Result<Vec<Value>> {
    let rows = query(
        r#"
        SELECT block_number, block_hash, extrinsic_hash, from_address, to_address,
               amount_planck::TEXT as amount, timestamp_ms
        FROM transfers
        ORDER BY block_number DESC
        LIMIT $1
        "#,
    )
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "blockNumber": r.get::<i64, _>("block_number"),
                "blockHash": r.get::<String, _>("block_hash"),
                "extrinsicHash": r.get::<Option<String>, _>("extrinsic_hash"),
                "from": r.get::<String, _>("from_address"),
                "to": r.get::<String, _>("to_address"),
                "amount": r.get::<String, _>("amount"),
                "timestamp": r.get::<Option<i64>, _>("timestamp_ms"),
            })
        })
        .collect())
}

pub async fn get_transaction_count_for_address(pool: &PgPool, address: &str) -> Result<i64> {
    let row = query("SELECT COUNT(*) as count FROM transfers WHERE from_address = $1 OR to_address = $1")
        .bind(address)
        .fetch_one(pool)
        .await?;
    Ok(row.try_get("count")?)
}

pub async fn get_block_by_number(pool: &PgPool, block_number: i64) -> Result<Option<Value>> {
    let row = query("SELECT * FROM blocks WHERE block_number = $1")
        .bind(block_number)
        .fetch_optional(pool)
        .await?;

    Ok(row.map(|r| {
        serde_json::json!({
            "blockNumber": r.get::<i64, _>("block_number"),
            "blockHash": r.get::<String, _>("block_hash"),
            "parentHash": r.get::<String, _>("parent_hash"),
            "extrinsicCount": r.get::<i32, _>("extrinsic_count"),
            "eventCount": r.get::<i32, _>("event_count"),
            "timestamp": r.get::<Option<i64>, _>("timestamp_ms"),
        })
    }))
}

pub async fn get_recent_blocks(pool: &PgPool, limit: i64) -> Result<Vec<Value>> {
    let rows = query("SELECT * FROM blocks ORDER BY block_number DESC LIMIT $1")
        .bind(limit)
        .fetch_all(pool)
        .await?;

    Ok(rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "blockNumber": r.get::<i64, _>("block_number"),
                "blockHash": r.get::<String, _>("block_hash"),
                "extrinsicCount": r.get::<i32, _>("extrinsic_count"),
                "eventCount": r.get::<i32, _>("event_count"),
                "timestamp": r.get::<Option<i64>, _>("timestamp_ms"),
            })
        })
        .collect())
}

pub async fn get_indexer_stats(pool: &PgPool) -> Result<Value> {
    let state = query("SELECT last_indexed_block, updated_at FROM indexer_state WHERE id = 1")
        .fetch_one(pool)
        .await?;

    let block_count: i64 = query("SELECT COUNT(*) as count FROM blocks")
        .fetch_one(pool)
        .await?
        .try_get("count")?;

    let tx_count: i64 = query("SELECT COUNT(*) as count FROM transfers")
        .fetch_one(pool)
        .await?
        .try_get("count")?;

    let extrinsic_count: i64 = query("SELECT COUNT(*) as count FROM extrinsics")
        .fetch_one(pool)
        .await?
        .try_get("count")?;

    Ok(serde_json::json!({
        "lastIndexedBlock": state.get::<i64, _>("last_indexed_block"),
        "lastUpdated": state.get::<chrono::DateTime<chrono::Utc>, _>("updated_at"),
        "totalBlocks": block_count,
        "totalTransfers": tx_count,
        "totalExtrinsics": extrinsic_count,
    }))
}

// ── Wallet targeting index ────────────────────────────────────────
//
// Populated from `AwarizonState.update_wallet_index` extrinsic call
// arguments, not the `WalletIndexUpdated` event — that event only carries
// the wallet address, none of the targeting fields. See
// `indexer::blocks::process_block`, which decodes the extrinsic directly.

/// Upsert one wallet's targeting profile.
#[allow(clippy::too_many_arguments)]
pub async fn upsert_wallet_index(
    pool: &PgPool,
    address: &str,
    wallet_age_days: i32,
    activity_count: i32,
    category_history: &[i32],
    region_code: i16,
    block_number: i64,
) -> Result<()> {
    query(
        "INSERT INTO wallet_index (
           address, wallet_age_days, activity_count, category_history,
           region_code, first_indexed_block, last_indexed_block, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $6, NOW())
         ON CONFLICT (address) DO UPDATE SET
           wallet_age_days = $2,
           activity_count = $3,
           category_history = $4,
           region_code = $5,
           last_indexed_block = $6,
           updated_at = NOW()",
    )
    .bind(address)
    .bind(wallet_age_days)
    .bind(activity_count)
    .bind(category_history)
    .bind(region_code)
    .bind(block_number)
    .execute(pool)
    .await?;
    Ok(())
}

/// All indexed wallets with their targeting profile, for the developer
/// portal's raw candidate-pool view.
pub async fn get_indexed_wallets(pool: &PgPool, limit: i64, offset: i64) -> Result<Value> {
    let rows = query(
        "SELECT address, wallet_age_days, activity_count, category_history,
                region_code, last_indexed_block, updated_at
         FROM wallet_index
         WHERE is_active = true
         ORDER BY activity_count DESC, wallet_age_days DESC
         LIMIT $1 OFFSET $2",
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total: i64 = query("SELECT COUNT(*) as count FROM wallet_index WHERE is_active = true")
        .fetch_one(pool)
        .await?
        .try_get("count")?;

    Ok(serde_json::json!({
        "wallets": rows.iter().map(|r| serde_json::json!({
            "address": r.get::<String, _>("address"),
            "walletAgeDays": r.get::<i32, _>("wallet_age_days"),
            "activityCount": r.get::<i32, _>("activity_count"),
            "categoryHistory": r.get::<Vec<i32>, _>("category_history"),
            "regionCode": r.get::<i16, _>("region_code"),
            "lastIndexedBlock": r.get::<i64, _>("last_indexed_block"),
        })).collect::<Vec<_>>(),
        "total": total,
        "limit": limit,
        "offset": offset,
    }))
}

/// Wallets matching campaign targeting criteria — the core resolution query
/// behind `/targeting/match`. Every filter is optional; `None` disables it
/// via the `$n::type IS NULL OR ...` guard. `category_history` matches on
/// array overlap (`&&`) against the wallet's own categories — any one shared
/// category counts as a match. `exclude_campaign_id`, when set, excludes
/// wallets that already have a `campaign_deliveries` row for that campaign.
#[allow(clippy::too_many_arguments)]
pub async fn get_matching_wallets(
    pool: &PgPool,
    min_wallet_age_days: Option<i32>,
    min_activity_count: Option<i32>,
    category_history: Option<&[i32]>,
    region_codes: Option<&[i16]>,
    exclude_campaign_id: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Value> {
    let rows = query(
        "SELECT w.address, w.wallet_age_days, w.activity_count,
                w.category_history, w.region_code
         FROM wallet_index w
         WHERE w.is_active = true
           AND ($1::int IS NULL OR w.wallet_age_days >= $1)
           AND ($2::int IS NULL OR w.activity_count >= $2)
           AND ($3::int[] IS NULL OR w.category_history && $3::int[])
           AND ($4::smallint[] IS NULL OR w.region_code = ANY($4))
           AND ($5::text IS NULL OR w.address NOT IN (
                 SELECT wallet FROM campaign_deliveries WHERE campaign_id = $5
               ))
         ORDER BY w.activity_count DESC
         LIMIT $6 OFFSET $7",
    )
    .bind(min_wallet_age_days)
    .bind(min_activity_count)
    .bind(category_history)
    .bind(region_codes)
    .bind(exclude_campaign_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    let total: i64 = query(
        "SELECT COUNT(*) as count FROM wallet_index w
         WHERE w.is_active = true
           AND ($1::int IS NULL OR w.wallet_age_days >= $1)
           AND ($2::int IS NULL OR w.activity_count >= $2)
           AND ($3::int[] IS NULL OR w.category_history && $3::int[])
           AND ($4::smallint[] IS NULL OR w.region_code = ANY($4))
           AND ($5::text IS NULL OR w.address NOT IN (
                 SELECT wallet FROM campaign_deliveries WHERE campaign_id = $5
               ))",
    )
    .bind(min_wallet_age_days)
    .bind(min_activity_count)
    .bind(category_history)
    .bind(region_codes)
    .bind(exclude_campaign_id)
    .fetch_one(pool)
    .await?
    .try_get("count")?;

    Ok(serde_json::json!({
        "wallets": rows.iter().map(|r| serde_json::json!({
            "address": r.get::<String, _>("address"),
            "walletAgeDays": r.get::<i32, _>("wallet_age_days"),
            "activityCount": r.get::<i32, _>("activity_count"),
            "categoryHistory": r.get::<Vec<i32>, _>("category_history"),
            "regionCode": r.get::<i16, _>("region_code"),
        })).collect::<Vec<_>>(),
        "total": total,
        "matched": rows.len(),
        "limit": limit,
        "offset": offset,
    }))
}

/// Match count for a set of targeting criteria, without materializing the
/// wallet list — backs `/targeting/summary`'s fast "N wallets will receive
/// this" preview ahead of an actual delivery.
#[allow(clippy::too_many_arguments)]
pub async fn get_targeting_summary(
    pool: &PgPool,
    min_wallet_age_days: Option<i32>,
    min_activity_count: Option<i32>,
    category_history: Option<&[i32]>,
    region_codes: Option<&[i16]>,
    exclude_campaign_id: Option<&str>,
) -> Result<Value> {
    let total_indexed: i64 = query("SELECT COUNT(*) as count FROM wallet_index WHERE is_active = true")
        .fetch_one(pool)
        .await?
        .try_get("count")?;

    let matched: i64 = query(
        "SELECT COUNT(*) as count FROM wallet_index w
         WHERE w.is_active = true
           AND ($1::int IS NULL OR w.wallet_age_days >= $1)
           AND ($2::int IS NULL OR w.activity_count >= $2)
           AND ($3::int[] IS NULL OR w.category_history && $3::int[])
           AND ($4::smallint[] IS NULL OR w.region_code = ANY($4))
           AND ($5::text IS NULL OR w.address NOT IN (
                 SELECT wallet FROM campaign_deliveries WHERE campaign_id = $5
               ))",
    )
    .bind(min_wallet_age_days)
    .bind(min_activity_count)
    .bind(category_history)
    .bind(region_codes)
    .bind(exclude_campaign_id)
    .fetch_one(pool)
    .await?
    .try_get("count")?;

    let already_delivered: i64 = match exclude_campaign_id {
        Some(cid) => {
            query("SELECT COUNT(*) as count FROM campaign_deliveries WHERE campaign_id = $1")
                .bind(cid)
                .fetch_one(pool)
                .await?
                .try_get("count")?
        }
        None => 0,
    };

    Ok(serde_json::json!({
        "totalIndexed": total_indexed,
        "matched": matched,
        "alreadyDelivered": already_delivered,
        "remaining": matched,
        "matchRate": if total_indexed > 0 {
            (matched as f64 / total_indexed as f64 * 100.0).round()
        } else {
            0.0
        },
    }))
}

/// Records one campaign delivery. Called from `route_state`'s `AppDelivered`
/// arm alongside the existing `inbox_events` insert. `ON CONFLICT DO NOTHING`
/// makes this idempotent against re-processed blocks and duplicate
/// deliveries to the same wallet for the same campaign.
pub async fn insert_campaign_delivery(
    pool: &PgPool,
    campaign_id: &str,
    wallet: &str,
    delivered_block: i64,
    record_id: Option<&str>,
) -> Result<()> {
    query(
        "INSERT INTO campaign_deliveries (campaign_id, wallet, delivered_block, record_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (campaign_id, wallet) DO NOTHING",
    )
    .bind(campaign_id)
    .bind(wallet)
    .bind(delivered_block)
    .bind(record_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_campaign_delivery_stats(pool: &PgPool, campaign_id: &str) -> Result<Value> {
    let delivered: i64 = query("SELECT COUNT(*) as count FROM campaign_deliveries WHERE campaign_id = $1")
        .bind(campaign_id)
        .fetch_one(pool)
        .await?
        .try_get("count")?;

    let rows = query(
        "SELECT wallet, delivered_block, record_id, indexed_at
         FROM campaign_deliveries
         WHERE campaign_id = $1
         ORDER BY delivered_block DESC
         LIMIT 100",
    )
    .bind(campaign_id)
    .fetch_all(pool)
    .await?;

    Ok(serde_json::json!({
        "campaignId": campaign_id,
        "totalDelivered": delivered,
        "recentDeliveries": rows.iter().map(|r| serde_json::json!({
            "wallet": r.get::<String, _>("wallet"),
            "deliveredBlock": r.get::<i64, _>("delivered_block"),
            "recordId": r.get::<Option<String>, _>("record_id"),
        })).collect::<Vec<_>>(),
    }))
}
