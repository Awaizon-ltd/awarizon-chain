pub mod blocks;
pub mod events;
pub mod metadata_resolver;
pub mod routing;

use crate::config::Config;
use crate::db::sqlx_compat::PgPool;
use crate::db::queries;
use crate::notifications::NotificationService;
use anyhow::Result;
use std::sync::Arc;
use subxt::backend::legacy::LegacyRpcMethods;
use subxt::{OnlineClient, SubstrateConfig};
use subxt_rpcs::client::RpcClient;
use tokio::sync::broadcast;

pub type NodeClient = OnlineClient<SubstrateConfig>;

/// Main indexer loop: backfill from the last-indexed block to the current
/// finalized head, then follow new finalized blocks as they arrive.
pub async fn run(
    config: Arc<Config>,
    pool: Arc<PgPool>,
    notifier: Arc<NotificationService>,
    block_tx: broadcast::Sender<serde_json::Value>,
) -> Result<()> {
    tracing::info!("Connecting to node: {}", config.node_url);

    let rpc_client = RpcClient::from_insecure_url(&config.node_url).await?;
    let legacy_rpc = LegacyRpcMethods::<SubstrateConfig>::new(rpc_client.clone());
    let client = NodeClient::from_rpc_client(rpc_client).await?;

    tracing::info!("Connected to node");

    let from_block = queries::get_last_indexed_block(&pool).await? as u64;
    tracing::info!("Resuming from block {}", from_block);

    let finalized_hash = legacy_rpc.chain_get_finalized_head().await?;
    let finalized_header = legacy_rpc
        .chain_get_header(Some(finalized_hash))
        .await?
        .ok_or_else(|| anyhow::anyhow!("finalized header not found"))?;
    let current_block = finalized_header.number as u64;

    if from_block < current_block {
        tracing::info!("Syncing {} historical blocks...", current_block - from_block);

        let mut block_num = from_block + 1;
        while block_num <= current_block {
            let end = (block_num + config.batch_size).min(current_block + 1);

            for n in block_num..end {
                if let Err(e) = sync_block_by_number(&client, &legacy_rpc, &pool, &notifier, n, &block_tx).await {
                    tracing::error!("Error processing block {}: {}", n, e);
                }
            }

            block_num = end;

            if config.batch_delay_ms > 0 {
                tokio::time::sleep(tokio::time::Duration::from_millis(config.batch_delay_ms)).await;
            }

            if block_num % 1000 == 0 {
                tracing::info!("Indexed up to block {}", block_num);
            }
        }

        tracing::info!("Historical sync complete");
    }

    tracing::info!("Subscribing to new finalized blocks...");
    let mut block_sub = client.blocks().subscribe_finalized().await?;

    while let Some(block_result) = tokio_stream::StreamExt::next(&mut block_sub).await {
        match block_result {
            Ok(block) => {
                if let Err(e) = blocks::process_block(&pool, &notifier, block, &block_tx).await {
                    tracing::error!("Error processing live block: {}", e);
                }
            }
            Err(e) => {
                tracing::error!("Block subscription error: {}", e);
                break;
            }
        }
    }

    Ok(())
}

async fn sync_block_by_number(
    client: &NodeClient,
    legacy_rpc: &LegacyRpcMethods<SubstrateConfig>,
    pool: &PgPool,
    notifier: &NotificationService,
    block_number: u64,
    block_tx: &broadcast::Sender<serde_json::Value>,
) -> Result<()> {
    let hash = legacy_rpc
        .chain_get_block_hash(Some(block_number.into()))
        .await?
        .ok_or_else(|| anyhow::anyhow!("block {} not found", block_number))?;

    let block = client.blocks().at(hash).await?;
    blocks::process_block(pool, notifier, block, block_tx).await
}
