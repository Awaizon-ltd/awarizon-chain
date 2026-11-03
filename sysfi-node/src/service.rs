//! Service and ServiceFactory implementation. Aura+Grandpa only — no manual
//! sealing (unlike Frontier's own template, which supports both) since SysFi
//! is meant to behave like a real chain, matching Awarizon's own node.
//!
//! Concrete (not generic over the runtime/client types), matching Awarizon's
//! own `node/src/service.rs` — SysFi only ever has one runtime instantiation,
//! so there's no need to keep this generic the way Frontier's own template
//! does (which caused real trait-inference ambiguity when copied as-is).

use std::{sync::Arc, time::Duration};

use futures::prelude::*;
use sc_client_api::{Backend as BackendT, BlockBackend};
use sc_consensus_aura::{ImportQueueParams, SlotProportion, StartAuraParams};
use sc_consensus_grandpa::SharedVoterState;
use sc_service::{error::Error as ServiceError, Configuration, TaskManager, WarpSyncConfig};
use sc_telemetry::{Telemetry, TelemetryWorker};
use sc_transaction_pool_api::OffchainTransactionPoolFactory;
use sp_consensus_aura::sr25519::AuthorityPair as AuraPair;
use sp_runtime::traits::Block as BlockT;

use sysfi_runtime::{opaque::Block, RuntimeApi, TransactionConverter};

pub use crate::eth::db_config_dir;
use crate::eth::{
	new_frontier_partial, spawn_frontier_tasks, EthConfiguration, FrontierBackend,
	FrontierBlockImport, FrontierPartialComponents, StorageOverrideHandler,
};

pub type HostFunctions =
	(sp_io::SubstrateHostFunctions, cumulus_primitives_proof_size_hostfunction::storage_proof_size::HostFunctions);

pub(crate) type FullClient =
	sc_service::TFullClient<Block, RuntimeApi, sc_executor::WasmExecutor<HostFunctions>>;
type FullBackend = sc_service::TFullBackend<Block>;
type FullSelectChain = sc_consensus::LongestChain<FullBackend, Block>;

/// The minimum period of blocks on which justifications will be imported and generated.
const GRANDPA_JUSTIFICATION_PERIOD: u32 = 512;

pub type Service = sc_service::PartialComponents<
	FullClient,
	FullBackend,
	FullSelectChain,
	sc_consensus::DefaultImportQueue<Block>,
	sc_transaction_pool::TransactionPoolHandle<Block, FullClient>,
	(
		sc_consensus::BoxBlockImport<Block>,
		sc_consensus_grandpa::LinkHalf<Block, FullClient, FullSelectChain>,
		Option<Telemetry>,
		Arc<FrontierBackend<Block, FullClient>>,
		Arc<dyn fc_storage::StorageOverride<Block>>,
	),
>;

pub fn new_partial(config: &Configuration, _eth_config: &EthConfiguration) -> Result<Service, ServiceError> {
	let telemetry = config
		.telemetry_endpoints
		.clone()
		.filter(|x| !x.is_empty())
		.map(|endpoints| -> Result<_, sc_telemetry::Error> {
			let worker = TelemetryWorker::new(16)?;
			let telemetry = worker.handle().new_telemetry(endpoints);
			Ok((worker, telemetry))
		})
		.transpose()?;

	let executor = sc_service::new_wasm_executor::<HostFunctions>(&config.executor);
	let (client, backend, keystore_container, task_manager) = sc_service::new_full_parts::<Block, RuntimeApi, _>(
		config,
		telemetry.as_ref().map(|(_, telemetry)| telemetry.handle()),
		executor,
	)?;
	let client = Arc::new(client);

	let telemetry = telemetry.map(|(worker, telemetry)| {
		task_manager.spawn_handle().spawn("telemetry", None, worker.run());
		telemetry
	});

	let select_chain = sc_consensus::LongestChain::new(backend.clone());

	let transaction_pool = Arc::from(
		sc_transaction_pool::Builder::new(task_manager.spawn_essential_handle(), client.clone(), config.role.is_authority().into())
			.with_options(config.transaction_pool.clone())
			.with_prometheus(config.prometheus_registry())
			.build(),
	);

	let (grandpa_block_import, grandpa_link) = sc_consensus_grandpa::block_import(
		client.clone(),
		GRANDPA_JUSTIFICATION_PERIOD,
		&client,
		select_chain.clone(),
		telemetry.as_ref().map(|x| x.handle()),
	)?;

	let storage_override = Arc::new(StorageOverrideHandler::<Block, _, _>::new(client.clone()));
	let frontier_backend = Arc::new(fc_db::kv::Backend::open(Arc::clone(&client), &config.database, &db_config_dir(config))?);

	let frontier_block_import = FrontierBlockImport::new(grandpa_block_import.clone(), client.clone());
	let aura_block_import: sc_consensus::BoxBlockImport<Block> = Box::new(frontier_block_import.clone());

	let cidp_client = client.clone();
	let import_queue = sc_consensus_aura::import_queue::<AuraPair, _, _, _, _, _>(ImportQueueParams {
		block_import: frontier_block_import,
		justification_import: Some(Box::new(grandpa_block_import)),
		client: client.clone(),
		create_inherent_data_providers: move |parent_hash, _| {
			let cidp_client = cidp_client.clone();
			async move {
				let slot_duration = sc_consensus_aura::standalone::slot_duration_at(&*cidp_client, parent_hash)?;
				let timestamp = sp_timestamp::InherentDataProvider::from_system_time();
				let slot = sp_consensus_aura::inherents::InherentDataProvider::from_timestamp_and_slot_duration(
					*timestamp,
					slot_duration,
				);
				Ok((slot, timestamp))
			}
		},
		spawner: &task_manager.spawn_essential_handle(),
		registry: config.prometheus_registry(),
		check_for_equivocation: Default::default(),
		telemetry: telemetry.as_ref().map(|x| x.handle()),
		compatibility_mode: Default::default(),
	})?;

	Ok(sc_service::PartialComponents {
		client,
		backend,
		task_manager,
		import_queue,
		keystore_container,
		select_chain,
		transaction_pool,
		other: (aura_block_import, grandpa_link, telemetry, frontier_backend, storage_override),
	})
}

/// Builds a new service for a full client.
pub async fn new_full<N: sc_network::NetworkBackend<Block, <Block as BlockT>::Hash>>(
	mut config: Configuration,
	eth_config: EthConfiguration,
) -> Result<TaskManager, ServiceError> {
	let sc_service::PartialComponents {
		client,
		backend,
		mut task_manager,
		import_queue,
		keystore_container,
		select_chain,
		transaction_pool,
		other: (block_import, grandpa_link, mut telemetry, frontier_backend, storage_override),
	} = new_partial(&config, &eth_config)?;

	let FrontierPartialComponents { filter_pool, fee_history_cache, fee_history_cache_limit } =
		new_frontier_partial(&eth_config)?;

	let mut net_config =
		sc_network::config::FullNetworkConfiguration::<Block, <Block as BlockT>::Hash, N>::new(
			&config.network,
			config.prometheus_registry().cloned(),
		);
	let metrics = N::register_notification_metrics(config.prometheus_registry());

	let peer_store_handle = net_config.peer_store_handle();
	let grandpa_protocol_name = sc_consensus_grandpa::protocol_standard_name(
		&client.block_hash(0).ok().flatten().expect("Genesis block exists; qed"),
		&config.chain_spec,
	);
	let (grandpa_protocol_config, grandpa_notification_service) =
		sc_consensus_grandpa::grandpa_peers_set_config::<_, N>(grandpa_protocol_name.clone(), metrics.clone(), peer_store_handle);
	net_config.add_notification_protocol(grandpa_protocol_config);

	let warp_sync = Arc::new(sc_consensus_grandpa::warp_proof::NetworkProvider::new(
		backend.clone(),
		grandpa_link.shared_authority_set().clone(),
		Vec::default(),
	));

	let (network, system_rpc_tx, tx_handler_controller, sync_service) =
		sc_service::build_network(sc_service::BuildNetworkParams {
			config: &config,
			net_config,
			client: client.clone(),
			transaction_pool: transaction_pool.clone(),
			spawn_handle: task_manager.spawn_handle(),
			import_queue,
			block_announce_validator_builder: None,
			warp_sync_config: Some(WarpSyncConfig::WithProvider(warp_sync)),
			block_relay: None,
			metrics,
		})?;

	if config.offchain_worker.enabled {
		let offchain_workers = sc_offchain::OffchainWorkers::new(sc_offchain::OffchainWorkerOptions {
			runtime_api_provider: client.clone(),
			is_validator: config.role.is_authority(),
			keystore: Some(keystore_container.keystore()),
			offchain_db: backend.offchain_storage(),
			transaction_pool: Some(OffchainTransactionPoolFactory::new(transaction_pool.clone())),
			network_provider: Arc::new(network.clone()),
			enable_http_requests: true,
			custom_extensions: |_| vec![],
		})?;
		task_manager.spawn_handle().spawn(
			"offchain-workers-runner",
			"offchain-worker",
			offchain_workers.run(client.clone(), task_manager.spawn_handle()).boxed(),
		);
	}

	let role = config.role;
	let force_authoring = config.force_authoring;
	let backoff_authoring_blocks: Option<()> = None;
	let name = config.network.node_name.clone();
	let enable_grandpa = !config.disable_grandpa;
	let prometheus_registry = config.prometheus_registry().cloned();

	let pubsub_notification_sinks: fc_mapping_sync::EthereumBlockNotificationSinks<
		fc_mapping_sync::EthereumBlockNotification<Block>,
	> = Default::default();
	let pubsub_notification_sinks = Arc::new(pubsub_notification_sinks);

	// for ethereum-compatibility rpc.
	config.rpc.id_provider = Some(Box::new(fc_rpc::EthereumSubIdProvider));

	let rpc_extensions_builder = {
		let client = client.clone();
		let pool = transaction_pool.clone();
		let network = network.clone();
		let sync_service = sync_service.clone();

		let is_authority = role.is_authority();
		let enable_dev_signer = eth_config.enable_dev_signer;
		let max_past_logs = eth_config.max_past_logs;
		let execute_gas_limit_multiplier = eth_config.execute_gas_limit_multiplier;
		let filter_pool = filter_pool.clone();
		let frontier_backend = frontier_backend.clone();
		let pubsub_notification_sinks = pubsub_notification_sinks.clone();
		let storage_override = storage_override.clone();
		let fee_history_cache = fee_history_cache.clone();
		let block_data_cache = Arc::new(fc_rpc::EthBlockDataCacheTask::new(
			task_manager.spawn_handle(),
			storage_override.clone(),
			eth_config.eth_log_block_cache,
			eth_config.eth_statuses_cache,
			prometheus_registry.clone(),
		));

		let slot_duration = sc_consensus_aura::slot_duration(&*client)?;
		let pending_create_inherent_data_providers = move |_, ()| async move {
			let current = sp_timestamp::InherentDataProvider::from_system_time();
			let next_slot = current.timestamp().as_millis() + slot_duration.as_millis();
			let timestamp = sp_timestamp::InherentDataProvider::new(next_slot.into());
			let slot =
				sp_consensus_aura::inherents::InherentDataProvider::from_timestamp_and_slot_duration(*timestamp, slot_duration);
			Ok((slot, timestamp))
		};

		Box::new(move |subscription_task_executor| {
			let eth_deps = crate::rpc::EthDeps {
				client: client.clone(),
				pool: pool.clone(),
				graph: pool.clone(),
				converter: Some(TransactionConverter::<Block>::default()),
				is_authority,
				enable_dev_signer,
				network: network.clone(),
				sync: sync_service.clone(),
				frontier_backend: frontier_backend.clone(),
				storage_override: storage_override.clone(),
				block_data_cache: block_data_cache.clone(),
				filter_pool: filter_pool.clone(),
				max_past_logs,
				fee_history_cache: fee_history_cache.clone(),
				fee_history_cache_limit,
				execute_gas_limit_multiplier,
				forced_parent_hashes: None,
				pending_create_inherent_data_providers,
			};
			let deps = crate::rpc::FullDeps { client: client.clone(), pool: pool.clone(), eth: eth_deps };
			crate::rpc::create_full(deps, subscription_task_executor, pubsub_notification_sinks.clone()).map_err(Into::into)
		})
	};

	let _rpc_handlers = sc_service::spawn_tasks(sc_service::SpawnTasksParams {
		network: Arc::new(network.clone()),
		client: client.clone(),
		keystore: keystore_container.keystore(),
		task_manager: &mut task_manager,
		transaction_pool: transaction_pool.clone(),
		rpc_builder: rpc_extensions_builder,
		backend: backend.clone(),
		system_rpc_tx,
		tx_handler_controller,
		sync_service: sync_service.clone(),
		config,
		telemetry: telemetry.as_mut(),
	})?;

	spawn_frontier_tasks(
		&task_manager,
		client.clone(),
		backend,
		frontier_backend,
		filter_pool,
		storage_override,
		fee_history_cache,
		fee_history_cache_limit,
		sync_service.clone(),
		pubsub_notification_sinks,
	)
	.await;

	if role.is_authority() {
		let proposer_factory = sc_basic_authorship::ProposerFactory::new(
			task_manager.spawn_handle(),
			client.clone(),
			transaction_pool.clone(),
			prometheus_registry.as_ref(),
			telemetry.as_ref().map(|x| x.handle()),
		);

		let slot_duration = sc_consensus_aura::slot_duration(&*client)?;

		let aura = sc_consensus_aura::start_aura::<AuraPair, _, _, _, _, _, _, _, _, _, _>(StartAuraParams {
			slot_duration,
			client,
			select_chain,
			block_import,
			proposer_factory,
			create_inherent_data_providers: move |_, ()| async move {
				let timestamp = sp_timestamp::InherentDataProvider::from_system_time();
				let slot =
					sp_consensus_aura::inherents::InherentDataProvider::from_timestamp_and_slot_duration(*timestamp, slot_duration);
				Ok((slot, timestamp))
			},
			force_authoring,
			backoff_authoring_blocks,
			keystore: keystore_container.keystore(),
			sync_oracle: sync_service.clone(),
			justification_sync_link: sync_service.clone(),
			block_proposal_slot_portion: SlotProportion::new(2f32 / 3f32),
			max_block_proposal_slot_portion: None,
			telemetry: telemetry.as_ref().map(|x| x.handle()),
			compatibility_mode: Default::default(),
		})?;

		task_manager.spawn_essential_handle().spawn_blocking("aura", Some("block-authoring"), aura);
	}

	if enable_grandpa {
		let keystore = if role.is_authority() { Some(keystore_container.keystore()) } else { None };

		let grandpa_config = sc_consensus_grandpa::Config {
			gossip_duration: Duration::from_millis(333),
			justification_generation_period: GRANDPA_JUSTIFICATION_PERIOD,
			name: Some(name),
			observer_enabled: false,
			keystore,
			local_role: role,
			telemetry: telemetry.as_ref().map(|x| x.handle()),
			protocol_name: grandpa_protocol_name,
		};

		let grandpa_config = sc_consensus_grandpa::GrandpaParams {
			config: grandpa_config,
			link: grandpa_link,
			network,
			sync: Arc::new(sync_service),
			notification_service: grandpa_notification_service,
			voting_rule: sc_consensus_grandpa::VotingRulesBuilder::default().build(),
			prometheus_registry,
			shared_voter_state: SharedVoterState::empty(),
			telemetry: telemetry.as_ref().map(|x| x.handle()),
			offchain_tx_pool_factory: OffchainTransactionPoolFactory::new(transaction_pool),
		};

		task_manager.spawn_essential_handle().spawn_blocking(
			"grandpa-voter",
			None,
			sc_consensus_grandpa::run_grandpa_voter(grandpa_config)?,
		);
	}

	Ok(task_manager)
}

pub async fn build_full(config: Configuration, eth_config: EthConfiguration) -> Result<TaskManager, ServiceError> {
	new_full::<sc_network::NetworkWorker<Block, <Block as BlockT>::Hash>>(config, eth_config).await
}

#[allow(clippy::type_complexity)]
pub fn new_chain_ops(
	config: &mut Configuration,
	eth_config: &EthConfiguration,
) -> Result<
	(Arc<FullClient>, Arc<FullBackend>, sc_consensus::DefaultImportQueue<Block>, TaskManager, Arc<FrontierBackend<Block, FullClient>>),
	ServiceError,
> {
	config.keystore = sc_service::config::KeystoreConfig::InMemory;
	let sc_service::PartialComponents { client, backend, import_queue, task_manager, other, .. } =
		new_partial(config, eth_config)?;
	Ok((client, backend, import_queue, task_manager, other.3))
}
