//! Ethereum-compatibility node wiring: CLI config, the Frontier KV backend,
//! and the background tasks Frontier needs (block-mapping sync, filter-pool
//! and fee-history-cache maintenance). Trimmed from Frontier's own template
//! `eth.rs` — key-value backend only (no SQL backend variant; add it later if
//! log-heavy indexing ever needs it) and no dynamic-fee inherent (SysFi has
//! no `pallet_dynamic_fee` — BaseFee alone sets gas price).

use std::{
	collections::BTreeMap,
	path::PathBuf,
	sync::{Arc, Mutex},
	time::Duration,
};

use futures::{future, prelude::*};
use sc_client_api::BlockchainEvents;
use sc_executor::HostFunctions;
use sc_network_sync::SyncingService;
use sc_service::{error::Error as ServiceError, Configuration, TaskManager};
use sp_api::ConstructRuntimeApi;
use sp_core::H256;
use sp_runtime::traits::Block as BlockT;

pub use fc_consensus::FrontierBlockImport;
use fc_rpc::EthTask;
pub use fc_rpc_core::types::{FeeHistoryCache, FeeHistoryCacheLimit, FilterPool};
pub use fc_storage::{StorageOverride, StorageOverrideHandler};

use crate::client::{FullBackend, FullClient};

/// Frontier DB backend type — key-value only for SysFi.
pub type FrontierBackend<B, C> = fc_db::kv::Backend<B, C>;

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

/// A set of APIs that ethereum-compatible runtimes must implement.
pub trait EthCompatRuntimeApiCollection<Block: BlockT>:
	sp_api::ApiExt<Block> + fp_rpc::ConvertTransactionRuntimeApi<Block> + fp_rpc::EthereumRuntimeRPCApi<Block>
{
}

impl<Block, Api> EthCompatRuntimeApiCollection<Block> for Api
where
	Block: BlockT,
	Api: sp_api::ApiExt<Block> + fp_rpc::ConvertTransactionRuntimeApi<Block> + fp_rpc::EthereumRuntimeRPCApi<Block>,
{
}

pub async fn spawn_frontier_tasks<B, RA, HF>(
	task_manager: &TaskManager,
	client: Arc<FullClient<B, RA, HF>>,
	backend: Arc<FullBackend<B>>,
	frontier_backend: Arc<FrontierBackend<B, FullClient<B, RA, HF>>>,
	filter_pool: Option<FilterPool>,
	storage_override: Arc<dyn StorageOverride<B>>,
	fee_history_cache: FeeHistoryCache,
	fee_history_cache_limit: FeeHistoryCacheLimit,
	sync: Arc<SyncingService<B>>,
	pubsub_notification_sinks: Arc<
		fc_mapping_sync::EthereumBlockNotificationSinks<fc_mapping_sync::EthereumBlockNotification<B>>,
	>,
) where
	B: BlockT<Hash = H256>,
	RA: ConstructRuntimeApi<B, FullClient<B, RA, HF>>,
	RA: Send + Sync + 'static,
	RA::RuntimeApi: EthCompatRuntimeApiCollection<B>,
	HF: HostFunctions + 'static,
{
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
