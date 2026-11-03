#![cfg_attr(not(feature = "std"), no_std)]

#[cfg(feature = "std")]
include!(concat!(env!("OUT_DIR"), "/wasm_binary.rs"));

pub mod apis;
#[cfg(feature = "runtime-benchmarks")]
mod benchmarks;
pub mod configs;
pub mod precompiles;
#[cfg(test)]
mod tests;

extern crate alloc;
use alloc::vec::Vec;
use codec::{Decode, Encode};
use fp_account::EthereumSignature;
use sp_core::H160;
use sp_runtime::{
	generic, impl_opaque_keys,
	traits::{BlakeTwo256, DispatchInfoOf, Dispatchable, IdentifyAccount, PostDispatchInfoOf, Verify},
	transaction_validity::{TransactionValidity, TransactionValidityError},
	DispatchResultWithInfo,
};
#[cfg(feature = "std")]
use sp_version::NativeVersion;
use sp_version::RuntimeVersion;

pub use frame_system::Call as SystemCall;
pub use pallet_balances::Call as BalancesCall;
pub use pallet_timestamp::Call as TimestampCall;
pub use pallet_awarizon_types;
pub use pallet_awarizon_state;
pub use pallet_awarizon_targeting;
pub use pallet_awarizon_consensus;
pub use pallet_awarizon_identity;
pub use pallet_awarizon_links;
#[cfg(any(feature = "std", test))]
pub use sp_runtime::BuildStorage;

pub mod genesis_config_presets;

pub struct RandomnessFromParentHash;
impl frame_support::traits::Randomness<Hash, BlockNumber> for RandomnessFromParentHash {
    fn random(subject: &[u8]) -> (Hash, BlockNumber) {
        let mut entropy = subject.to_vec();
        entropy.extend_from_slice(frame_system::Pallet::<Runtime>::parent_hash().as_ref());
        let hash = sp_core::hashing::blake2_256(&entropy).into();
        (hash, frame_system::Pallet::<Runtime>::block_number())
    }
}

/// Opaque types. These are used by the CLI to instantiate machinery that don't need to know
/// the specifics of the runtime. They can then be made to be agnostic over specific formats
/// of data like extrinsics, allowing for them to continue syncing the network through upgrades
/// to even the core data structures.
pub mod opaque {
	use super::*;
	use sp_runtime::{
		generic,
		traits::{BlakeTwo256, Hash as HashT},
	};

	pub use sp_runtime::OpaqueExtrinsic as UncheckedExtrinsic;

	/// Opaque block header type.
	pub type Header = generic::Header<BlockNumber, BlakeTwo256>;
	/// Opaque block type.
	pub type Block = generic::Block<Header, UncheckedExtrinsic>;
	/// Opaque block identifier type.
	pub type BlockId = generic::BlockId<Block>;
	/// Opaque block hash type.
	pub type Hash = <BlakeTwo256 as HashT>::Output;
}

impl_opaque_keys! {
	pub struct SessionKeys {
		pub aura: Aura,
		pub grandpa: Grandpa,
	}
}

// To learn more about runtime versioning, see:
// https://docs.substrate.io/main-docs/build/upgrade#runtime-versioning
#[sp_version::runtime_version]
pub const VERSION: RuntimeVersion = RuntimeVersion {
	spec_name: alloc::borrow::Cow::Borrowed("awarizon"),
	impl_name: alloc::borrow::Cow::Borrowed("awarizon-node"),
	authoring_version: 1,
	spec_version: 4,
	impl_version: 1,
	apis: apis::RUNTIME_API_VERSIONS,
	transaction_version: 1,
	system_version: 1,
};

mod block_times {
	/// This determines the average expected block time that we are targeting. Blocks will be
	/// produced at a minimum duration defined by `SLOT_DURATION`. `SLOT_DURATION` is picked up by
	/// `pallet_timestamp` which is in turn picked up by `pallet_aura` to implement `fn
	/// slot_duration()`.
	///
	/// Change this to adjust the block time.
	pub const MILLI_SECS_PER_BLOCK: u64 = 3000;

	// NOTE: Currently it is not possible to change the slot duration after the chain has started.
	// Attempting to do so will brick block production.
	pub const SLOT_DURATION: u64 = MILLI_SECS_PER_BLOCK;
}
pub use block_times::*;

// Time is measured by number of blocks.
pub const MINUTES: BlockNumber = 60_000 / (MILLI_SECS_PER_BLOCK as BlockNumber);
pub const HOURS: BlockNumber = MINUTES * 60;
pub const DAYS: BlockNumber = HOURS * 24;

pub const BLOCK_HASH_COUNT: BlockNumber = 2400;

// Unit = the base number of indivisible units for balances. 18 decimals
// (was 12) — MetaMask hardcodes 18 decimals when displaying any EVM chain's
// native currency, not configurable, so this isn't optional once the
// account model is EVM-native.
pub const UNIT: Balance = 1_000_000_000_000_000_000;
pub const MILLI_UNIT: Balance = UNIT / 1_000;
pub const MICRO_UNIT: Balance = UNIT / 1_000_000;

/// Existential deposit.
pub const EXISTENTIAL_DEPOSIT: Balance = MICRO_UNIT;

/// The version information used to identify this runtime when compiled natively.
#[cfg(feature = "std")]
pub fn native_version() -> NativeVersion {
	NativeVersion { runtime_version: VERSION, can_author_with: Default::default() }
}

/// ECDSA/keccak signature over an H160-derived account — not `MultiSignature`
/// (sr25519/ed25519/ecdsa-over-AccountId32). This is what makes `AccountId`
/// below resolve to an Ethereum-shaped H160 instead of a 32-byte key.
pub type Signature = EthereumSignature;

/// Resolves to `fp_account::AccountId20` (i.e. `H160`) via `Signature`'s
/// signer — the same account the chain's EVM side (MetaMask, ethers.js)
/// already uses, not a separate AccountId32.
pub type AccountId = <<Signature as Verify>::Signer as IdentifyAccount>::AccountId;

/// Balance of an account.
pub type Balance = u128;

/// Index of a transaction in the chain.
pub type Nonce = u32;

/// A hash of some data used by the chain.
pub type Hash = sp_core::H256;

/// An index to a block.
pub type BlockNumber = u32;

/// No `MultiAddress`/SS58 lookup needed — the address IS the account id.
pub type Address = AccountId;

/// Block header type as expected by this runtime.
pub type Header = generic::Header<BlockNumber, BlakeTwo256>;

/// Block type as expected by this runtime.
pub type Block = generic::Block<Header, UncheckedExtrinsic>;

/// A Block signed with a Justification
pub type SignedBlock = generic::SignedBlock<Block>;

/// BlockId type as expected by this runtime.
pub type BlockId = generic::BlockId<Block>;

/// The `TransactionExtension` to the basic transaction logic.
pub type TxExtension = (
	frame_system::CheckNonZeroSender<Runtime>,
	frame_system::CheckSpecVersion<Runtime>,
	frame_system::CheckTxVersion<Runtime>,
	frame_system::CheckGenesis<Runtime>,
	frame_system::CheckEra<Runtime>,
	frame_system::CheckNonce<Runtime>,
	frame_system::CheckWeight<Runtime>,
	pallet_transaction_payment::ChargeTransactionPayment<Runtime>,
	frame_metadata_hash_extension::CheckMetadataHash<Runtime>,
	frame_system::WeightReclaim<Runtime>,
);

/// `fp_self_contained::UncheckedExtrinsic`, not the plain `generic` one —
/// this is what lets a raw MetaMask-signed Ethereum transaction ride through
/// as a self-contained extrinsic instead of needing the normal
/// signed-extrinsic pipeline.
pub type UncheckedExtrinsic =
	fp_self_contained::UncheckedExtrinsic<Address, RuntimeCall, Signature, TxExtension>;

/// Checked extrinsic type — signed info is an `H160` (the Ethereum tx's
/// recovered sender) for self-contained (Ethereum) calls.
pub type CheckedExtrinsic =
	fp_self_contained::CheckedExtrinsic<AccountId, RuntimeCall, TxExtension, H160>;

/// The payload being signed in transactions.
pub type SignedPayload = generic::SignedPayload<RuntimeCall, TxExtension>;

/// Converts a raw Ethereum transaction (as submitted over `eth_sendRawTransaction`)
/// into this runtime's `UncheckedExtrinsic`, wrapped in a bare
/// `pallet_ethereum::Call::transact`.
#[derive(Clone)]
pub struct TransactionConverter<B>(core::marker::PhantomData<B>);

impl<B> Default for TransactionConverter<B> {
	fn default() -> Self {
		Self(core::marker::PhantomData)
	}
}

impl<B: sp_runtime::traits::Block> fp_rpc::ConvertTransaction<<B as sp_runtime::traits::Block>::Extrinsic>
	for TransactionConverter<B>
{
	fn convert_transaction(&self, transaction: pallet_ethereum::Transaction) -> <B as sp_runtime::traits::Block>::Extrinsic {
		let extrinsic = UncheckedExtrinsic::new_bare(pallet_ethereum::Call::<Runtime>::transact { transaction }.into());
		let encoded = extrinsic.encode();
		<B as sp_runtime::traits::Block>::Extrinsic::decode(&mut &encoded[..])
			.expect("UncheckedExtrinsic should be decodable from an UncheckedExtrinsic; qed")
	}
}

/// Routes a self-contained (i.e. raw Ethereum-signed) `RuntimeCall` through
/// its own validation/dispatch path instead of the normal signed-extrinsic
/// one — required by `fp_self_contained::UncheckedExtrinsic` above. Every
/// non-`Ethereum` call is simply not self-contained, so this has no effect
/// on how the rest of the chain's (Substrate-signed) extrinsics behave.
impl fp_self_contained::SelfContainedCall for RuntimeCall {
	type SignedInfo = H160;

	fn is_self_contained(&self) -> bool {
		match self {
			RuntimeCall::Ethereum(call) => call.is_self_contained(),
			_ => false,
		}
	}

	fn check_self_contained(&self) -> Option<Result<Self::SignedInfo, TransactionValidityError>> {
		match self {
			RuntimeCall::Ethereum(call) => call.check_self_contained(),
			_ => None,
		}
	}

	fn validate_self_contained(
		&self,
		info: &Self::SignedInfo,
		dispatch_info: &DispatchInfoOf<RuntimeCall>,
		len: usize,
	) -> Option<TransactionValidity> {
		match self {
			RuntimeCall::Ethereum(call) => call.validate_self_contained(info, dispatch_info, len),
			_ => None,
		}
	}

	fn pre_dispatch_self_contained(
		&self,
		info: &Self::SignedInfo,
		dispatch_info: &DispatchInfoOf<RuntimeCall>,
		len: usize,
	) -> Option<Result<(), TransactionValidityError>> {
		match self {
			RuntimeCall::Ethereum(call) => call.pre_dispatch_self_contained(info, dispatch_info, len),
			_ => None,
		}
	}

	fn apply_self_contained(
		self,
		info: Self::SignedInfo,
	) -> Option<DispatchResultWithInfo<PostDispatchInfoOf<Self>>> {
		match self {
			call @ RuntimeCall::Ethereum(pallet_ethereum::Call::transact { .. }) => {
				Some(call.dispatch(RuntimeOrigin::from(pallet_ethereum::RawOrigin::EthereumTransaction(info))))
			}
			_ => None,
		}
	}
}

/// All migrations of the runtime, aside from the ones declared in the pallets.
///
/// This can be a tuple of types, each implementing `OnRuntimeUpgrade`.
#[allow(unused_parens)]
type Migrations = ();

/// Executive: handles dispatch to the various modules.
pub type Executive = frame_executive::Executive<
	Runtime,
	Block,
	frame_system::ChainContext<Runtime>,
	Runtime,
	AllPalletsWithSystem,
	Migrations,
>;

// Create the runtime by composing the FRAME pallets that were previously configured.
#[frame_support::runtime]
mod runtime {
	#[runtime::runtime]
	#[runtime::derive(
		RuntimeCall,
		RuntimeEvent,
		RuntimeError,
		RuntimeOrigin,
		RuntimeFreezeReason,
		RuntimeHoldReason,
		RuntimeSlashReason,
		RuntimeLockId,
		RuntimeTask,
		RuntimeViewFunction
	)]
	pub struct Runtime;

	#[runtime::pallet_index(0)]
	pub type System = frame_system;

	#[runtime::pallet_index(1)]
	pub type Timestamp = pallet_timestamp;

	#[runtime::pallet_index(2)]
	pub type Aura = pallet_aura;

	#[runtime::pallet_index(3)]
	pub type Grandpa = pallet_grandpa;

	#[runtime::pallet_index(4)]
	pub type Balances = pallet_balances;

	#[runtime::pallet_index(5)]
	pub type TransactionPayment = pallet_transaction_payment;

	#[runtime::pallet_index(6)]
	pub type Sudo = pallet_sudo;

	// Include the custom logic from the pallet-template in the runtime.
	#[runtime::pallet_index(7)]
	pub type Template = pallet_template;

	#[runtime::pallet_index(8)]
	pub type AwarizonState = pallet_awarizon_state;

	#[runtime::pallet_index(9)]
	pub type AwarizonTargeting = pallet_awarizon_targeting;

	#[runtime::pallet_index(10)]
	pub type AwarizonConsensus = pallet_awarizon_consensus;

	#[runtime::pallet_index(11)]
	pub type Assets = pallet_assets;

	#[runtime::pallet_index(12)]
	pub type Nfts = pallet_nfts;

	#[runtime::pallet_index(13)]
	pub type Contracts = pallet_contracts;

	#[runtime::pallet_index(14)]
	pub type Vesting = pallet_vesting;

	#[runtime::pallet_index(15)]
	pub type AwarizonIdentity = pallet_awarizon_identity;

	#[runtime::pallet_index(16)]
	pub type AwarizonLinks = pallet_awarizon_links;

	#[runtime::pallet_index(17)]
	pub type AwarizonDex = pallet_awarizon_dex;

	// Frontier/EVM — appended after all existing pallets rather than inserted
	// mid-list (unlike sysfi-runtime, which puts these at indices 7-10) so
	// none of pallets 0-17 above get renumbered.
	#[runtime::pallet_index(18)]
	pub type Ethereum = pallet_ethereum;

	#[runtime::pallet_index(19)]
	pub type EVM = pallet_evm;

	#[runtime::pallet_index(20)]
	pub type EVMChainId = pallet_evm_chain_id;

	#[runtime::pallet_index(21)]
	pub type BaseFee = pallet_base_fee;
}
