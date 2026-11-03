use super::{events, NodeClient};
use crate::db::queries;
use crate::db::sqlx_compat::PgPool;
use crate::decode;
use crate::notifications::NotificationService;
use anyhow::Result;
use std::collections::HashMap;
use subxt::blocks::Block;
use subxt::events::Phase;
use subxt::SubstrateConfig;
use tokio::sync::broadcast;

pub async fn process_block(
    pool: &PgPool,
    notifier: &NotificationService,
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
        let signer = signer_hex(&ext);
        let success = success_by_index.get(&idx).copied().unwrap_or(true);
        let call_fields = ext.field_values().ok();
        let args = call_fields.as_ref().map(decode::composite_to_json);

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

        // `AwarizonState.update_wallet_index`'s targeting fields
        // (wallet_age_days/activity_count/category_history/region_code) are
        // call arguments, not `WalletIndexUpdated` event fields — that event
        // only carries the wallet address — so this is indexed from the
        // extrinsic here rather than through the generic per-event routing
        // in `events::route_event`.
        if success && pallet == "AwarizonState" && method == "update_wallet_index" {
            if let (Some(fields), Some(wallet)) = (call_fields.as_ref(), signer.as_deref()) {
                let wallet_age_days = decode::field_u32(fields, "wallet_age_days").unwrap_or(0);
                let activity_count = decode::field_u32(fields, "activity_count").unwrap_or(0);
                let region_code = decode::field_u8(fields, "region_code").unwrap_or(0);
                let category_history: Vec<i32> = decode::field_u8_vec(fields, "category_history")
                    .unwrap_or_default()
                    .iter()
                    .map(|&c| c as i32)
                    .collect();

                queries::upsert_wallet_index(
                    pool,
                    wallet,
                    wallet_age_days as i32,
                    activity_count as i32,
                    &category_history,
                    region_code as i16,
                    block_number,
                )
                .await?;

                if let Err(e) = notifier.cache().del_pattern("idx:walletindex:*").await {
                    tracing::warn!("Failed to invalidate cache pattern idx:walletindex:*: {}", e);
                }
                if let Err(e) = notifier.cache().del_pattern("idx:targeting:*").await {
                    tracing::warn!("Failed to invalidate cache pattern idx:targeting:*: {}", e);
                }
            }
        }
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
            notifier,
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

/// Was `signer_ss58`, decoding via `MultiAddress::<AccountId32, ()>::decode`
/// — that assumed the runtime's old `Address = MultiAddress<AccountId32, ()>`
/// wire shape (an enum discriminant byte, then 32 id bytes). The runtime's
/// `Address` is now just `AccountId` directly (`runtime/src/lib.rs`: `pub
/// type Address = AccountId;`, no MultiAddress wrapper at all), so the raw
/// address bytes are the account's 20 bytes with nothing to unwrap.
fn signer_hex(ext: &subxt::blocks::ExtrinsicDetails<SubstrateConfig, NodeClient>) -> Option<String> {
    if !ext.is_signed() {
        return None;
    }
    let bytes = ext.address_bytes()?;
    let addr: [u8; 20] = bytes.get(..20)?.try_into().ok()?;
    Some(format!("0x{}", hex::encode(addr)))
}
