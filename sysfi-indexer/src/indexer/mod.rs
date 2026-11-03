use crate::config::Config;
use crate::db::{queries, sqlx_compat::PgPool};
use alloy::consensus::Transaction as _;
use alloy::eips::BlockNumberOrTag;
use alloy::network::TransactionResponse;
use alloy::primitives::{Address, U256};
use alloy::providers::{Provider, ProviderBuilder};
use alloy::rpc::types::{Block, BlockTransactionsKind};
use anyhow::Result;
use std::sync::Arc;
use std::time::Duration;

fn addr_to_string(a: Address) -> String {
    format!("{a:?}").to_lowercase() // {:?} on Address is the 0x-prefixed hex, same as Display but avoids EIP-55 checksum casing so stored addresses compare consistently
}

/// Fetches one block (with full transactions + receipts) and writes it —
/// block row, every transaction row, and every touched address's rolling
/// summary — inside no single DB transaction (each upsert is independently
/// idempotent via ON CONFLICT, so a crash mid-block just re-does a few
/// upserts on restart rather than corrupting state).
async fn index_block(pool: &PgPool, provider: &impl Provider, number: u64) -> Result<()> {
    let Some(block) = provider.get_block_by_number(BlockNumberOrTag::Number(number), BlockTransactionsKind::Full).await? else {
        anyhow::bail!("block {number} not found (node not yet caught up to it)");
    };

    let txs = block.transactions.as_transactions().unwrap_or_default();
    let block_hash = format!("{:?}", block.header.hash).to_lowercase();
    let parent_hash = format!("{:?}", block.header.parent_hash).to_lowercase();
    let author = addr_to_string(block.header.beneficiary);
    let timestamp_ms = (block.header.timestamp as i64).saturating_mul(1000);

    let mut fees_burned = U256::ZERO;

    for tx in txs {
        let tx_hash = format!("{:?}", tx.tx_hash()).to_lowercase();
        let from = addr_to_string(tx.from());
        let to = tx.to().map(addr_to_string);

        let receipt = provider.get_transaction_receipt(tx.tx_hash()).await?;
        let (status, gas_used, effective_gas_price, contract_address) = match &receipt {
            Some(r) => (
                r.status(),
                Some(r.gas_used as i64),
                U256::from(r.effective_gas_price),
                r.contract_address.map(addr_to_string),
            ),
            // Shouldn't happen for a block already reported by the node, but
            // don't fail the whole block over one missing receipt.
            None => (true, None, U256::from(tx.gas_price().unwrap_or_default()), None),
        };

        if let Some(gu) = gas_used {
            fees_burned += effective_gas_price * U256::from(gu as u64);
        }

        queries::upsert_transaction(
            pool,
            &tx_hash,
            number as i64,
            tx.transaction_index().unwrap_or_default() as i32,
            &from,
            to.as_deref(),
            tx.value(),
            tx.gas_limit() as i64,
            gas_used,
            effective_gas_price,
            status,
            tx.nonce() as i64,
            tx.input().len() as i32,
            to.is_none(),
            contract_address.as_deref(),
            timestamp_ms,
        )
        .await?;

        queries::touch_address(pool, &from, number as i64, false).await?;
        if let Some(to_addr) = &to {
            // A plain value-transfer `to` isn't necessarily a contract —
            // `is_contract` here is a placeholder; contract detection is
            // refined by contract-creation rows below and stays sticky
            // (touch_address never un-marks a contract false).
            queries::touch_address(pool, to_addr, number as i64, false).await?;
        }
        if let Some(created) = &contract_address {
            queries::touch_address(pool, created, number as i64, true).await?;
        }
    }

    queries::upsert_block(
        pool,
        number as i64,
        &block_hash,
        &parent_hash,
        &author,
        block.header.gas_used as i64,
        block.header.gas_limit as i64,
        block.header.base_fee_per_gas.map(U256::from),
        txs.len() as i32,
        fees_burned,
        timestamp_ms,
    )
    .await?;

    queries::update_last_indexed_block(pool, number as i64).await?;
    Ok(())
}

pub async fn run(config: Arc<Config>, pool: Arc<PgPool>) -> Result<()> {
    let provider = ProviderBuilder::new().on_http(config.rpc_url.parse()?);

    let last_indexed = queries::get_last_indexed_block(&pool).await?;
    let mut next = if last_indexed < 0 { config.start_block } else { (last_indexed + 1) as u64 };

    tracing::info!("sysfi-indexer starting sync from block {next}");

    loop {
        let tip = provider.get_block_number().await?;

        if next > tip {
            tokio::time::sleep(Duration::from_millis(config.poll_interval_ms)).await;
            continue;
        }

        let batch_end = (next + config.batch_size - 1).min(tip);
        for n in next..=batch_end {
            if let Err(e) = index_block(&pool, &provider, n).await {
                tracing::error!("Failed to index block {n}: {e:#}");
                // Retry this block next loop iteration rather than skipping it —
                // `next` is only advanced past a block once it succeeds.
                break;
            }
            next = n + 1;
        }

        if config.batch_delay_ms > 0 {
            tokio::time::sleep(Duration::from_millis(config.batch_delay_ms)).await;
        }
    }
}
