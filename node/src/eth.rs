//! Ethereum-compatibility node wiring: CLI config, the Frontier KV backend,
//! and the background tasks Frontier needs (block-mapping sync, filter-pool
//! and fee-history-cache maintenance). Ported from sysfi-node/src/eth.rs —
//! key-value backend only (no SQL backend variant), no dynamic-fee inherent
//! (Awarizon has no `pallet_dynamic_fee` — BaseFee alone sets gas price).
//!
//! Written concretely against `crate::client::{FullClient, FullBackend}`
//! rather than generic over `<B, RA, HF>` the way sysfi-node's version is —
//! Awarizon's node only ever has one runtime instantiation (same reasoning
//! `service.rs` already followed before this migration), so the extra
//! generic parameters would be unused complexity here.

use std::{
	collections::BTreeMap,
	path::PathBuf,
	sync::{Arc, Mutex},
	time::Duration,
};

use futures::{future, prelude::*};
use sc_client_api::BlockchainEvents;
use sc_network_sync::SyncingService;
use sc_service::{error::Error as ServiceError, Configuration, TaskManager};

use crate::client::{FullBackend, FullClient};
use solochain_template_runtime::opaque::Block;

pub use fc_consensus::FrontierBlockImport;
use fc_rpc::EthTask;
pub use fc_rpc_core::types::{FeeHistoryCache, FeeHistoryCacheLimit, FilterPool};
pub use fc_storage::{StorageOverride, StorageOverrideHandler};

/// Frontier DB backend type — key-value only.
pub type FrontierBackend = fc_db::kv::Backend<Block, FullClient>;

pub fn db_config_dir(config: &Configuration) -> PathBuf {
	config.base_path.config_dir(config.chain_spec.id())
}

/// The ethereum-compatibility configuration used to run a node.
#[derive(Clone, Debug, clap::Parser)]
pub struct EthConfiguration {
	/// Maximum number of logs in a query.
	#[arg(long, default_value = "10000")]
	pub max_past_logs: u32,

	/// Maximum fee history cache size.
	#[arg(long, default_value = "2048")]
	pub fee_history_limit: u64,

	/// Enable the well-known dev-account signer (unlocks `eth_sendTransaction`
	/// without an external wallet — dev/test convenience only).
	#[arg(long)]
	pub enable_dev_signer: bool,

	/// Maximum allowed gas limit is `block.gas_limit * execute_gas_limit_multiplier`
	/// when using eth_call/eth_estimateGas.
	#[arg(long, default_value = "10")]
	pub execute_gas_limit_multiplier: u64,

	/// Size in bytes of the LRU cache for block data.
	#[arg(long, default_value = "50")]
	pub eth_log_block_cache: usize,

	/// Size in bytes of the LRU cache for transaction statuses data.
	#[arg(long, default_value = "50")]
	pub eth_statuses_cache: usize,
}

pub struct FrontierPartialComponents {
	pub filter_pool: Option<FilterPool>,
	pub fee_history_cache: FeeHistoryCache,
	pub fee_history_cache_limit: FeeHistoryCacheLimit,
}

pub fn new_frontier_partial(config: &EthConfiguration) -> Result<FrontierPartialComponents, ServiceError> {
	Ok(FrontierPartialComponents {
		filter_pool: Some(Arc::new(Mutex::new(BTreeMap::new()))),
		fee_history_cache: Arc::new(Mutex::new(BTreeMap::new())),
		fee_history_cache_limit: config.fee_history_limit,
	})
}

pub async fn spawn_frontier_tasks(
	task_manager: &TaskManager,
	client: Arc<FullClient>,
	backend: Arc<FullBackend>,
	frontier_backend: Arc<FrontierBackend>,
	filter_pool: Option<FilterPool>,
	storage_override: Arc<dyn StorageOverride<Block>>,
	fee_history_cache: FeeHistoryCache,
	fee_history_cache_limit: FeeHistoryCacheLimit,
	sync: Arc<SyncingService<Block>>,
	pubsub_notification_sinks: Arc<
		fc_mapping_sync::EthereumBlockNotificationSinks<fc_mapping_sync::EthereumBlockNotification<Block>>,
	>,
) {
	task_manager.spawn_essential_handle().spawn(
		"frontier-mapping-sync-worker",
		Some("frontier"),
		fc_mapping_sync::kv::MappingSyncWorker::new(
			client.import_notification_stream(),
			Duration::new(6, 0),
			client.clone(),
			backend,
			storage_override.clone(),
			frontier_backend,
			3,
			0u32.into(),
			fc_mapping_sync::SyncStrategy::Normal,
			sync,
			pubsub_notification_sinks,
		)
		.for_each(|()| future::ready(())),
	);

	if let Some(filter_pool) = filter_pool {
		const FILTER_RETAIN_THRESHOLD: u64 = 100;
		task_manager.spawn_essential_handle().spawn(
			"frontier-filter-pool",
			Some("frontier"),
			EthTask::filter_pool_task(client.clone(), filter_pool, FILTER_RETAIN_THRESHOLD),
		);
	}

	task_manager.spawn_essential_handle().spawn(
		"frontier-fee-history",
		Some("frontier"),
		EthTask::fee_history_task(client, storage_override, fee_history_cache, fee_history_cache_limit),
	);
}
