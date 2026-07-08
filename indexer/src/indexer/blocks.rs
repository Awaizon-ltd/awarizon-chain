use super::{events, NodeClient};
use crate::db::queries;
use crate::db::sqlx_compat::PgPool;
use crate::decode;
use anyhow::Result;
use std::collections::HashMap;
use subxt::blocks::Block;
use subxt::events::Phase;
use subxt::ext::codec::Decode;
use subxt::utils::{AccountId32, MultiAddress};
use subxt::SubstrateConfig;
use tokio::sync::broadcast;

pub async fn process_block(
    pool: &PgPool,
    block: Block<SubstrateConfig, NodeClient>,
    block_tx: &broadcast::Sender<serde_json::Value>,
) -> Result<()> {
    let block_number = block.number() as i64;
    let block_hash = format!("{:?}", block.hash());
    let header = block.header();
    let parent_hash = format!("{:?}", header.parent_hash);
    let state_root = format!("{:?}", header.state_root);
    let extrinsics_root = format!("{:?}", header.extrinsics_root);

    let extrinsics = block.extrinsics().await?;
    let block_events = block.events().await?;

    // Success/failure per extrinsic comes from the System.ExtrinsicSuccess /
    // System.ExtrinsicFailed event at that extrinsic's phase — only known
    // once we've looked at events, not from the extrinsic itself.
    let mut success_by_index: HashMap<u32, bool> = HashMap::new();
    for ev in block_events.iter().flatten() {
        if let Phase::ApplyExtrinsic(idx) = ev.phase() {
            if ev.pallet_name() == "System" {
                match ev.variant_name() {
                    "ExtrinsicSuccess" => {
                        success_by_index.insert(idx, true);
                    }
                    "ExtrinsicFailed" => {
                        success_by_index.insert(idx, false);
                    }
                    _ => {}
                }
            }
        }
    }

    // Timestamp.set(now) carries the block's wall-clock time.
    let mut timestamp_ms: Option<i64> = None;
    for ext in extrinsics.iter() {
        if ext.pallet_name().ok().as_deref() == Some("Timestamp")
            && ext.variant_name().ok().as_deref() == Some("set")
        {
            if let Ok(fields) = ext.field_values() {
                timestamp_ms = decode::field_u64(&fields, "now").map(|n| n as i64);
            }
            break;
        }
    }

    let extrinsic_count = extrinsics.len() as i32;
    let event_count = block_events.len() as i32;

    queries::insert_block(
        pool,
        block_number,
        &block_hash,
        &parent_hash,
        &state_root,
        &extrinsics_root,
        extrinsic_count,
        event_count,
        timestamp_ms,
    )
    .await?;

    for ext in extrinsics.iter() {
        let idx = ext.index();
        let ext_hash = format!("{:?}", ext.hash());
        let pallet = ext.pallet_name().unwrap_or("Unknown").to_string();
        let method = ext.variant_name().unwrap_or("unknown").to_string();
        let signer = signer_ss58(&ext);
        let success = success_by_index.get(&idx).copied().unwrap_or(true);
        let args = ext.field_values().ok().map(|f| decode::composite_to_json(&f));

        queries::insert_extrinsic(
            pool,
            block_number,
            &block_hash,
            idx as i32,
            &ext_hash,
            &pallet,
            &method,
            signer.as_deref(),
            None, // nonce: not exposed by dynamic decoding of transaction extensions
            success,
            args,
        )
        .await?;
    }

    for (idx, ev) in block_events.iter().enumerate() {
        let ev = match ev {
            Ok(e) => e,
            Err(e) => {
                tracing::warn!("Failed to decode event {} in block {}: {}", idx, block_number, e);
                continue;
            }
        };

        let pallet = ev.pallet_name().to_string();
        let method = ev.variant_name().to_string();
        let fields = match ev.field_values() {
            Ok(f) => f,
            Err(e) => {
                tracing::warn!(
                    "Failed to decode fields for {}.{} in block {}: {}",
                    pallet, method, block_number, e
                );
                continue;
            }
        };

        let extrinsic_hash = match ev.phase() {
            Phase::ApplyExtrinsic(i) => extrinsics.iter().find(|e| e.index() == i).map(|e| format!("{:?}", e.hash())),
            _ => None,
        };

        queries::insert_event(
            pool,
            block_number,
            &block_hash,
            idx as i32,
            &pallet,
            &method,
            Some(decode::composite_to_json(&fields)),
        )
        .await?;

        events::route_event(
            pool,
            block_number,
            &block_hash,
            idx as i32,
            extrinsic_hash.as_deref(),
            &pallet,
            &method,
            &fields,
            timestamp_ms,
        )
        .await?;
    }

    queries::update_last_indexed_block(pool, block_number, &block_hash).await?;

    let _ = block_tx.send(serde_json::json!({
        "type": "block",
        "blockNumber": block_number,
        "blockHash": block_hash,
        "extrinsicCount": extrinsic_count,
        "eventCount": event_count,
        "timestamp": timestamp_ms,
    }));

    Ok(())
}

fn signer_ss58(ext: &subxt::blocks::ExtrinsicDetails<SubstrateConfig, NodeClient>) -> Option<String> {
    if !ext.is_signed() {
        return None;
    }
    let mut bytes = ext.address_bytes()?;
    let address = MultiAddress::<AccountId32, ()>::decode(&mut bytes).ok()?;
    match address {
        MultiAddress::Id(id) => Some(id.to_string()),
        _ => None,
    }
}
