use std::{collections::BTreeMap, sync::Arc};

use jsonrpsee::RpcModule;
use sc_client_api::{
	backend::{Backend, StorageProvider},
	client::BlockchainEvents,
	AuxStore, UsageProvider,
};
use sc_network::service::traits::NetworkService;
use sc_network_sync::SyncingService;
use sc_rpc::SubscriptionTaskExecutor;
use sc_transaction_pool_api::TransactionPool;
use sp_api::{CallApiAt, ProvideRuntimeApi};
use sp_block_builder::BlockBuilder as BlockBuilderApi;
use sp_blockchain::{Error as BlockChainError, HeaderBackend, HeaderMetadata};
use sp_consensus_aura::{sr25519::AuthorityId as AuraId, AuraApi};
use sp_core::H256;
use sp_inherents::CreateInherentDataProviders;
use sp_runtime::traits::Block as BlockT;

pub use fc_rpc::{EthBlockDataCacheTask, EthConfig};
pub use fc_rpc_core::types::{FeeHistoryCache, FeeHistoryCacheLimit, FilterPool};
use fc_storage::StorageOverride;
use fp_rpc::{ConvertTransaction, ConvertTransactionRuntimeApi, EthereumRuntimeRPCApi};

/// Extra dependencies for Ethereum compatibility.
pub struct EthDeps<B: BlockT, C, P, CT, CIDP> {
	pub client: Arc<C>,
	pub pool: Arc<P>,
	pub graph: Arc<P>,
	pub converter: Option<CT>,
	pub is_authority: bool,
	pub enable_dev_signer: bool,
	pub network: Arc<dyn NetworkService>,
	pub sync: Arc<SyncingService<B>>,
	pub frontier_backend: Arc<dyn fc_api::Backend<B>>,
	pub storage_override: Arc<dyn StorageOverride<B>>,
	pub block_data_cache: Arc<EthBlockDataCacheTask<B>>,
	pub filter_pool: Option<FilterPool>,
	pub max_past_logs: u32,
	pub fee_history_cache: FeeHistoryCache,
	pub fee_history_cache_limit: FeeHistoryCacheLimit,
	pub execute_gas_limit_multiplier: u64,
	pub forced_parent_hashes: Option<BTreeMap<H256, H256>>,
	pub pending_create_inherent_data_providers: CIDP,
}

/// Instantiate Ethereum-compatible RPC extensions.
pub fn create_eth<B, C, BE, P, CT, CIDP, EC>(
	mut io: RpcModule<()>,
	deps: EthDeps<B, C, P, CT, CIDP>,
	subscription_task_executor: SubscriptionTaskExecutor,
	pubsub_notification_sinks: Arc<
		fc_mapping_sync::EthereumBlockNotificationSinks<fc_mapping_sync::EthereumBlockNotification<B>>,
	>,
) -> Result<RpcModule<()>, Box<dyn std::error::Error + Send + Sync>>
where
	B: BlockT,
	C: CallApiAt<B> + ProvideRuntimeApi<B>,
	C::Api: AuraApi<B, AuraId> + BlockBuilderApi<B> + ConvertTransactionRuntimeApi<B> + EthereumRuntimeRPCApi<B>,
	C: HeaderBackend<B> + HeaderMetadata<B, Error = BlockChainError>,
	C: BlockchainEvents<B> + AuxStore + UsageProvider<B> + StorageProvider<B, BE> + 'static,
	BE: Backend<B> + 'static,
	P: TransactionPool<Block = B, Hash = B::Hash> + 'static,
	CT: ConvertTransaction<<B as BlockT>::Extrinsic> + Send + Sync + 'static,
	CIDP: CreateInherentDataProviders<B, ()> + Send + 'static,
	EC: EthConfig<B, C>,
{
	use fc_rpc::{
		pending::AuraConsensusDataProvider, Eth, EthApiServer, EthDevSigner, EthFilter, EthFilterApiServer,
		EthPubSub, EthPubSubApiServer, EthSigner, Net, NetApiServer, TxPool, TxPoolApiServer, Web3, Web3ApiServer,
	};

	let EthDeps {
		client,
		pool,
		graph,
		converter,
		is_authority,
		enable_dev_signer,
		network,
		sync,
		frontier_backend,
		storage_override,
		block_data_cache,
		filter_pool,
		max_past_logs,
		fee_history_cache,
		fee_history_cache_limit,
		execute_gas_limit_multiplier,
		forced_parent_hashes,
		pending_create_inherent_data_providers,
	} = deps;

	let mut signers = Vec::new();
	if enable_dev_signer {
		signers.push(Box::new(EthDevSigner::new()) as Box<dyn EthSigner>);
	}

	io.merge(
		Eth::<B, C, P, CT, BE, CIDP, EC>::new(
			client.clone(),
			pool.clone(),
			graph.clone(),
			converter,
			sync.clone(),
			signers,
			storage_override.clone(),
			frontier_backend.clone(),
			is_authority,
			block_data_cache.clone(),
			fee_history_cache,
			fee_history_cache_limit,
			execute_gas_limit_multiplier,
			forced_parent_hashes,
			pending_create_inherent_data_providers,
			Some(Box::new(AuraConsensusDataProvider::new(client.clone()))),
		)
		.replace_config::<EC>()
		.into_rpc(),
	)?;

	if let Some(filter_pool) = filter_pool {
		io.merge(
			EthFilter::new(
				client.clone(),
				frontier_backend.clone(),
				graph.clone(),
				filter_pool,
				500_usize,
				max_past_logs,
				block_data_cache.clone(),
			)
			.into_rpc(),
		)?;
	}

	io.merge(
		EthPubSub::new(
			pool,
			client.clone(),
			sync,
			subscription_task_executor,
			storage_override.clone(),
			pubsub_notification_sinks,
		)
		.into_rpc(),
	)?;

	io.merge(Net::new(client.clone(), network, true).into_rpc())?;
	io.merge(Web3::new(client.clone()).into_rpc())?;
	io.merge(TxPool::new(client, graph).into_rpc())?;

	Ok(io)
}
