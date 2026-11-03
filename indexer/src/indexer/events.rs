use super::routing;
use crate::db::sqlx_compat::PgPool;
use crate::notifications::NotificationService;
use anyhow::Result;
use scale_value::Composite;

/// Dispatch one decoded event to its denormalized domain table, if it's one
/// we track. Every event is already captured in the generic `events` table
/// by the caller regardless of whether it's routed here.
#[allow(clippy::too_many_arguments)]
pub async fn route_event(
    pool: &PgPool,
    notifier: &NotificationService,
    block_number: i64,
    block_hash: &str,
    event_index: i32,
    extrinsic_hash: Option<&str>,
    pallet: &str,
    method: &str,
    fields: &Composite<u32>,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    match pallet {
        "Balances" => {
            routing::route_balances(pool, block_number, block_hash, event_index, extrinsic_hash, method, fields, timestamp_ms).await
        }
        "AwarizonIdentity" => {
            routing::route_identity(pool, block_number, extrinsic_hash, method, fields, timestamp_ms).await
        }
        "AwarizonState" => {
            routing::route_state(pool, notifier, block_number, extrinsic_hash, method, fields, timestamp_ms).await
        }
        "AwarizonConsensus" => {
            routing::route_consensus(pool, block_number, extrinsic_hash, method, fields, timestamp_ms).await
        }
        "AwarizonDex" => {
            routing::route_dex(pool, block_number, block_hash, event_index, extrinsic_hash, method, fields, timestamp_ms).await
        }
        "Nfts" => {
            routing::route_nfts(pool, block_number, block_hash, event_index, extrinsic_hash, method, fields, timestamp_ms).await
        }
        "Assets" => {
            routing::route_assets(pool, block_number, block_hash, event_index, extrinsic_hash, method, fields, timestamp_ms).await
        }
        _ => Ok(()),
    }
}
