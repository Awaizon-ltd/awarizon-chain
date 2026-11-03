//! A collection of node-specific RPC methods — Awarizon's own native
//! endpoints (unchanged from before this migration) plus, now, the
//! Ethereum-compatible (`eth_*`/`net_*`/`web3_*`/`txpool_*`) surface from
//! `rpc::eth`.

use std::sync::Arc;

use jsonrpsee::RpcModule;
use sc_client_api::{backend::StorageProvider, client::BlockchainEvents, AuxStore, UsageProvider};
use sc_rpc::SubscriptionTaskExecutor;
use sc_transaction_pool_api::TransactionPool;
use solochain_template_runtime::{opaque::Block, AccountId, Balance, Nonce};
use sp_api::{CallApiAt, ProvideRuntimeApi};
use sp_block_builder::BlockBuilder;
use sp_blockchain::{Error as BlockChainError, HeaderBackend, HeaderMetadata};
use sp_consensus_aura::sr25519::AuthorityId as AuraId;
use sp_inherents::CreateInherentDataProviders;

mod eth;
pub use self::eth::{create_eth, EthDeps};

/// Full client dependencies.
pub struct FullDeps<C, P, CT, CIDP> {
	/// The client instance to use.
	pub client: Arc<C>,
	/// Transaction pool instance.
	pub pool: Arc<P>,
	/// Ethereum-compatibility specific dependencies.
	pub eth: EthDeps<Block, C, P, CT, CIDP>,
}

// Concrete `TFullBackend<Block>` (not generic over `BE`, unlike
// sysfi-node's rpc layer) — awarizon_rpc.rs's `AwarizonRpcServer` impl
// already hardcodes `StorageProvider<Block, TFullBackend<Block>>`, matching
// Awarizon's node being concrete rather than generic over backend/runtime
// types (same reasoning as `service.rs`/`eth.rs`).
type FullBackend = sc_service::TFullBackend<Block>;

pub struct DefaultEthConfig<C>(std::marker::PhantomData<C>);

impl<C> fc_rpc::EthConfig<Block, C> for DefaultEthConfig<C>
where
	C: StorageProvider<Block, FullBackend> + Sync + Send + 'static,
{
	type EstimateGasAdapter = ();
	type RuntimeStorageOverride =
		fc_rpc::frontier_backend_client::SystemAccountId20StorageOverride<Block, C, FullBackend>;
}

/// Instantiate all full RPC extensions.
pub fn create_full<C, P, CT, CIDP>(
	deps: FullDeps<C, P, CT, CIDP>,
	subscription_task_executor: SubscriptionTaskExecutor,
	pubsub_notification_sinks: Arc<
		fc_mapping_sync::EthereumBlockNotificationSinks<fc_mapping_sync::EthereumBlockNotification<Block>>,
	>,
) -> Result<RpcModule<()>, Box<dyn std::error::Error + Send + Sync>>
where
	C: CallApiAt<Block> + ProvideRuntimeApi<Block>,
	C::Api: BlockBuilder<Block>,
	C::Api: sp_consensus_aura::AuraApi<Block, AuraId>,
	C::Api: substrate_frame_rpc_system::AccountNonceApi<Block, AccountId, Nonce>,
	C::Api: pallet_transaction_payment_rpc::TransactionPaymentRuntimeApi<Block, Balance>,
	C::Api: fp_rpc::ConvertTransactionRuntimeApi<Block>,
	C::Api: fp_rpc::EthereumRuntimeRPCApi<Block>,
	C: HeaderBackend<Block> + HeaderMetadata<Block, Error = BlockChainError> + 'static,
	C: BlockchainEvents<Block> + AuxStore + UsageProvider<Block> + StorageProvider<Block, FullBackend>,
	C: Send + Sync + 'static,
	P: TransactionPool<Block = Block, Hash = <Block as sp_runtime::traits::Block>::Hash> + 'static,
	CIDP: CreateInherentDataProviders<Block, ()> + Send + 'static,
	CT: fp_rpc::ConvertTransaction<<Block as sp_runtime::traits::Block>::Extrinsic> + Send + Sync + 'static,
{
	use crate::awarizon_rpc::{AwarizonRpcImpl, AwarizonRpcServer};
	use pallet_transaction_payment_rpc::{TransactionPayment, TransactionPaymentApiServer};
	use substrate_frame_rpc_system::{System, SystemApiServer};

	let mut module = RpcModule::new(());
	let FullDeps { client, pool, eth } = deps;

	module.merge(System::new(client.clone(), pool).into_rpc())?;
	let awarizon = AwarizonRpcImpl::<_, Block>::new(client.clone());
	module.merge(TransactionPayment::new(client.clone()).into_rpc())?;
	module.merge(awarizon.into_rpc())?;

	// Ethereum compatibility RPCs (eth_*, net_*, web3_*, txpool_*). BE is
	// spelled out explicitly (FullBackend) rather than left for inference —
	// `create_eth`'s own generic BE param has nothing in this call's
	// argument types to infer it from on its own.
	let module = create_eth::<Block, C, FullBackend, P, CT, CIDP, DefaultEthConfig<C>>(
		module,
		eth,
		subscription_task_executor,
		pubsub_notification_sinks,
	)?;

	Ok(module)
}
