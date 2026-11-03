//! Keeps the indexed dataset from growing unbounded by periodically deleting
//! rows older than a retention window, mirroring the node's own
//! `--state-pruning`. Runs as an independent background loop (same shape as
//! `metadata_resolver::run_backfill_loop`) so a slow or failing prune never
//! blocks block ingestion or the API.

use crate::db::queries;
use crate::db::sqlx_compat::PgPool;

/// Runs the pruning sweep on a fixed interval for as long as the process is
/// alive. Returns immediately without looping if `retention_blocks == 0`
/// (pruning disabled) — the caller can `tokio::spawn` this unconditionally.
pub async fn run_pruning_loop(pool: PgPool, retention_blocks: u64, interval_secs: u64) {
    if retention_blocks == 0 {
        tracing::info!("Block pruning disabled (PRUNE_RETENTION_BLOCKS=0)");
        return;
    }

    tracing::info!(
        "Block pruning enabled: keeping last {} blocks, running every {}s",
        retention_blocks,
        interval_secs
    );

    let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(interval_secs));

    loop {
        interval.tick().await;

        let latest = match queries::get_latest_block(&pool).await {
            Ok(Some(latest)) => latest,
            Ok(None) => {
                tracing::debug!("No blocks indexed yet, skipping prune");
                continue;
            }
            Err(e) => {
                tracing::error!("Failed to get latest block for pruning: {}", e);
                continue;
            }
        };

        let prune_before = latest - retention_blocks as i64;
        if prune_before <= 0 {
            tracing::debug!("Not enough blocks to prune yet (latest: {})", latest);
            continue;
        }

        match queries::prune_old_blocks(&pool, prune_before).await {
            Ok(deleted) => {
                if deleted > 0 {
                    tracing::info!("Pruned {} blocks (before #{})", deleted, prune_before);
                }
            }
            Err(e) => tracing::error!("Pruning failed: {}", e),
        }
    }
}
