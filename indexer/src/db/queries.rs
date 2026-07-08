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
    from_address: &str,
    to_address: &str,
    amount_planck: u128,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    query(
        "INSERT INTO transfers (
           block_number, block_hash, event_index, from_address, to_address, amount_planck, timestamp_ms
         ) VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (block_number, event_index) DO NOTHING",
    )
    .bind(block_number)
    .bind(block_hash)
    .bind(event_index)
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
                "direction": r.get::<String, _>("direction"),
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
