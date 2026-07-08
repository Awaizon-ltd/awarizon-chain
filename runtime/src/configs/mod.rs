// This is free and unencumbered software released into the public domain.
//
// Anyone is free to copy, modify, publish, use, compile, sell, or
// distribute this software, either in source code form or as a compiled
// binary, for any purpose, commercial or non-commercial, and by any
// means.
//
// In jurisdictions that recognize copyright laws, the author or authors
// of this software dedicate any and all copyright interest in the
// software to the public domain. We make this dedication for the benefit
// of the public at large and to the detriment of our heirs and
// successors. We intend this dedication to be an overt act of
// relinquishment in perpetuity of all present and future rights to this
// software under copyright law.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
// OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.
//
// For more information, please refer to <http://unlicense.org>

// Substrate and Polkadot dependencies
use frame_support::{
	derive_impl, parameter_types,
	traits::{
		ConstBool, ConstU128, ConstU32, ConstU64, ConstU8, Imbalance, VariantCountOf,
		WithdrawReasons,
	},
	weights::{
		constants::{RocksDbWeight, WEIGHT_REF_TIME_PER_SECOND},
		Weight, WeightToFee,
	},
	PalletId,
};
use frame_system::limits::{BlockLength, BlockWeights};
use pallet_transaction_payment::{ConstFeeMultiplier, FungibleAdapter, Multiplier};
use sp_consensus_aura::sr25519::AuthorityId as AuraId;
use sp_runtime::{traits::{AccountIdConversion, One}, Perbill};
use sp_version::RuntimeVersion;

// Local module imports
use super::{
	AccountId, Aura, AwarizonConsensus, Balance, Balances, Block, BlockNumber, Hash, Nonce,
	PalletInfo, RandomnessFromParentHash, Runtime, RuntimeCall, RuntimeEvent,
	RuntimeFreezeReason, RuntimeHoldReason, RuntimeOrigin, RuntimeTask, Signature, System,
	Timestamp, UncheckedExtrinsic, EXISTENTIAL_DEPOSIT, MICRO_UNIT, SLOT_DURATION, UNIT, VERSION,
};

const NORMAL_DISPATCH_RATIO: Perbill = Perbill::from_percent(75);

parameter_types! {
	pub const BlockHashCount: BlockNumber = 2400;
	pub const Version: RuntimeVersion = VERSION;

	/// We allow for 2 seconds of compute with a 6 second average block time.
	pub RuntimeBlockWeights: BlockWeights = BlockWeights::with_sensible_defaults(
		Weight::from_parts(2u64 * WEIGHT_REF_TIME_PER_SECOND, u64::MAX),
		NORMAL_DISPATCH_RATIO,
	);
	pub RuntimeBlockLength: BlockLength = BlockLength::max_with_normal_ratio(5 * 1024 * 1024, NORMAL_DISPATCH_RATIO);
	pub const SS58Prefix: u8 = 42;
}

/// The default types are being injected by [`derive_impl`](`frame_support::derive_impl`) from
/// [`SoloChainDefaultConfig`](`struct@frame_system::config_preludes::SolochainDefaultConfig`),
/// but overridden as needed.
#[derive_impl(frame_system::config_preludes::SolochainDefaultConfig)]
impl frame_system::Config for Runtime {
	/// The block type for the runtime.
	type Block = Block;
	/// Block & extrinsics weights: base values and limits.
	type BlockWeights = RuntimeBlockWeights;
	/// The maximum length of a block (in bytes).
	type BlockLength = RuntimeBlockLength;
	/// The identifier used to distinguish between accounts.
	type AccountId = AccountId;
	/// The type for storing how many extrinsics an account has signed.
	type Nonce = Nonce;
	/// The type for hashing blocks and tries.
	type Hash = Hash;
	/// Maximum number of block number to block hash mappings to keep (oldest pruned first).
	type BlockHashCount = BlockHashCount;
	/// The weight of database operations that the runtime can invoke.
	type DbWeight = RocksDbWeight;
	/// Version of the runtime.
	type Version = Version;
	/// The data to be stored in an account.
	type AccountData = pallet_balances::AccountData<Balance>;
	/// This is used as an identifier of the chain. 42 is the generic substrate prefix.
	type SS58Prefix = SS58Prefix;
	type MaxConsumers = frame_support::traits::ConstU32<16>;
}

impl pallet_aura::Config for Runtime {
	type AuthorityId = AuraId;
	type DisabledValidators = ();
	type MaxAuthorities = ConstU32<32>;
	type AllowMultipleBlocksPerSlot = ConstBool<false>;
	type SlotDuration = pallet_aura::MinimumPeriodTimesTwo<Runtime>;
}

impl pallet_grandpa::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;

	type WeightInfo = ();
	type MaxAuthorities = ConstU32<32>;
	type MaxNominators = ConstU32<0>;
	type MaxSetIdSessionEntries = ConstU64<0>;

	type KeyOwnerProof = sp_core::Void;
	type EquivocationReportSystem = ();
}

impl pallet_timestamp::Config for Runtime {
	/// A timestamp: milliseconds since the unix epoch.
	type Moment = u64;
	type OnTimestampSet = Aura;
	type MinimumPeriod = ConstU64<{ SLOT_DURATION / 2 }>;
	type WeightInfo = ();
}

impl pallet_balances::Config for Runtime {
	type MaxLocks = ConstU32<50>;
	type MaxReserves = ();
	type ReserveIdentifier = [u8; 8];
	/// The type for recording an account's balance.
	type Balance = Balance;
	/// The ubiquitous event type.
	type RuntimeEvent = RuntimeEvent;
	type DustRemoval = ();
	type ExistentialDeposit = ConstU128<EXISTENTIAL_DEPOSIT>;
	type AccountStore = System;
	type WeightInfo = pallet_balances::weights::SubstrateWeight<Runtime>;
	type FreezeIdentifier = RuntimeFreezeReason;
	type MaxFreezes = VariantCountOf<RuntimeFreezeReason>;
	type RuntimeHoldReason = RuntimeHoldReason;
	type RuntimeFreezeReason = RuntimeFreezeReason;
	type DoneSlashHandler = ();
}

parameter_types! {
	pub FeeMultiplier: Multiplier = Multiplier::one();

	// 1/8 planck per ref_time unit (was a flat 10 planck/unit).
	// A real balances.transfer_keep_alive (call weight + base extrinsic weight +
	// TxExtension pipeline, ~768_500_000 ref_time) now costs roughly
	// 768_500_000 / 8 = 96_062_500 planck ≈ 0.0000961 RIZ, versus ~0.0077 RIZ before —
	// close to the 0.0001 RIZ target.
	pub const WeightFeeNumerator: Balance = 1;
	pub const WeightFeeDenominator: Balance = 8;

	// 10 planck per byte of encoded transaction length (was 100_000).
	// A ~150-byte signed transfer now adds ~1_500 planck (~0.0000000015 RIZ) to the fee.
	pub const LengthFeeCoefficient: Balance = 10;
}

pub struct AwarizonWeightToFee;
impl WeightToFee for AwarizonWeightToFee {
	type Balance = Balance;
	fn weight_to_fee(weight: &Weight) -> Balance {
		let ref_time = weight.ref_time() as Balance;
		ref_time
			.saturating_mul(WeightFeeNumerator::get())
			.saturating_div(WeightFeeDenominator::get())
	}
}

pub struct AwarizonLengthToFee;
impl WeightToFee for AwarizonLengthToFee {
	type Balance = Balance;
	fn weight_to_fee(weight: &Weight) -> Balance {
		let len = weight.ref_time() as Balance;
		len.saturating_mul(LengthFeeCoefficient::get())
	}
}

impl pallet_transaction_payment::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type OnChargeTransaction = FungibleAdapter<Balances, DealWithFees>;
	type OperationalFeeMultiplier = ConstU8<5>;
	type WeightToFee = AwarizonWeightToFee;
	type LengthToFee = AwarizonLengthToFee;
	type FeeMultiplierUpdate = ConstFeeMultiplier<FeeMultiplier>;
	type WeightInfo = pallet_transaction_payment::weights::SubstrateWeight<Runtime>;
}

impl pallet_sudo::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type RuntimeCall = RuntimeCall;
	type WeightInfo = pallet_sudo::weights::SubstrateWeight<Runtime>;
}

/// Configure the pallet-template in pallets/template.
impl pallet_template::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type WeightInfo = pallet_template::weights::SubstrateWeight<Runtime>;
}

parameter_types! {
	pub const VerificationStakeThreshold: u128 = 10_000u128 * 1_000_000_000_000u128;
	pub EngagementPoolAccount: AccountId = PalletId(*b"awz/engp").into_account_truncating();
	pub const MinVestedTransfer: Balance = 1_000_000_000_000u128;
	pub UnvestedFundsAllowedWithdrawReasons: WithdrawReasons =
		WithdrawReasons::except(WithdrawReasons::TRANSFER | WithdrawReasons::RESERVE);

	pub const ValidatorRewardsPalletId: PalletId = PalletId(*b"riz/vldr");
	pub const FeePoolPalletId: PalletId = PalletId(*b"riz/fees");
	pub const InsurancePalletId: PalletId = PalletId(*b"riz/insr");
}

/// Routes transaction fees into the epoch fee pool instead of burning them, and notifies
/// awarizon-consensus so it can include them in the next `distribute_epoch_rewards` call.
pub struct DealWithFees;

impl frame_support::traits::OnUnbalanced<frame_support::traits::fungible::Credit<AccountId, Balances>>
	for DealWithFees
{
	fn on_nonzero_unbalanced(fees: frame_support::traits::fungible::Credit<AccountId, Balances>) {
		let amount: Balance = fees.peek();
		let fee_pool: AccountId = FeePoolPalletId::get().into_account_truncating();
		let _ = <Balances as frame_support::traits::fungible::Balanced<AccountId>>::resolve(
			&fee_pool, fees,
		);
		AwarizonConsensus::deposit_fee(amount);
	}
}

impl<C> frame_system::offchain::CreateTransactionBase<C> for Runtime
where
	RuntimeCall: From<C>,
{
	type Extrinsic = UncheckedExtrinsic;
	type RuntimeCall = RuntimeCall;
}

impl<C> frame_system::offchain::CreateInherent<C> for Runtime
where
	RuntimeCall: From<C>,
{
	fn create_inherent(call: RuntimeCall) -> UncheckedExtrinsic {
		UncheckedExtrinsic::new_bare(call)
	}
}

impl pallet_awarizon_state::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type Currency = Balances;
	type VerificationStakeThreshold = VerificationStakeThreshold;
	type InboxStateReserveAccount = EngagementPoolAccount;
	type AuthorityId = pallet_awarizon_state::crypto::AwarizonAuthId;
	type RewardDistributor = AwarizonConsensus;
}

parameter_types! {
	pub const AssetDeposit: Balance = 100 * UNIT;
	pub const AssetAccountDeposit: Balance = 1 * UNIT;
	pub const ApprovalDeposit: Balance = 1 * UNIT;
	pub const AssetsStringLimit: u32 = 50;
	pub const MetadataDepositBase: Balance = 10 * UNIT;
	pub const MetadataDepositPerByte: Balance = 1 * MICRO_UNIT;
}

impl pallet_assets::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type Balance = Balance;
	type AssetId = u32;
	type AssetIdParameter = codec::Compact<u32>;
	type Currency = Balances;
	type CreateOrigin = frame_support::traits::AsEnsureOriginWithArg<
		frame_system::EnsureSigned<AccountId>,
	>;
	type ForceOrigin = frame_system::EnsureRoot<AccountId>;
	type AssetDeposit = AssetDeposit;
	type AssetAccountDeposit = AssetAccountDeposit;
	type MetadataDepositBase = MetadataDepositBase;
	type MetadataDepositPerByte = MetadataDepositPerByte;
	type ApprovalDeposit = ApprovalDeposit;
	type StringLimit = AssetsStringLimit;
	type Freezer = ();
	type Holder = ();
	type Extra = ();
	type WeightInfo = pallet_assets::weights::SubstrateWeight<Runtime>;
	type RemoveItemsLimit = frame_support::traits::ConstU32<1000>;
	type CallbackHandle = ();
	#[cfg(feature = "runtime-benchmarks")]
	type BenchmarkHelper = ();
}

parameter_types! {
	pub const NftsCollectionDeposit: Balance = 100 * UNIT;
	pub const NftsItemDeposit: Balance = 1 * UNIT;
	pub const NftsMetadataDepositBase: Balance = 10 * UNIT;
	pub const NftsAttributeDepositBase: Balance = 1 * UNIT;
	pub const NftsDepositPerByte: Balance = 1 * MICRO_UNIT;
	pub const NftsStringLimit: u32 = 256;
	pub const NftsKeyLimit: u32 = 64;
	pub const NftsValueLimit: u32 = 256;
	pub const NftsApprovalsLimit: u32 = 20;
	pub const NftsItemAttributesApprovalsLimit: u32 = 30;
	pub const NftsMaxTips: u32 = 10;
	pub const NftsMaxDeadlineDuration: BlockNumber = 12 * 28800;
	pub storage NftsFeatures: pallet_nfts::PalletFeatures = pallet_nfts::PalletFeatures::all_enabled();
}

impl pallet_nfts::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type CollectionId = u32;
	type ItemId = u32;
	type Currency = Balances;
	type ForceOrigin = frame_system::EnsureRoot<AccountId>;
	type CreateOrigin = frame_support::traits::AsEnsureOriginWithArg<
		frame_system::EnsureSigned<AccountId>,
	>;
	type Locker = ();
	type CollectionDeposit = NftsCollectionDeposit;
	type ItemDeposit = NftsItemDeposit;
	type MetadataDepositBase = NftsMetadataDepositBase;
	type AttributeDepositBase = NftsAttributeDepositBase;
	type DepositPerByte = NftsDepositPerByte;
	type StringLimit = NftsStringLimit;
	type KeyLimit = NftsKeyLimit;
	type ValueLimit = NftsValueLimit;
	type ApprovalsLimit = NftsApprovalsLimit;
	type ItemAttributesApprovalsLimit = NftsItemAttributesApprovalsLimit;
	type MaxTips = NftsMaxTips;
	type MaxDeadlineDuration = NftsMaxDeadlineDuration;
	type MaxAttributesPerCall = frame_support::traits::ConstU32<10>;
	type Features = NftsFeatures;
	type OffchainSignature = Signature;
	type OffchainPublic = <Signature as sp_runtime::traits::Verify>::Signer;
	type WeightInfo = pallet_nfts::weights::SubstrateWeight<Runtime>;
	type BlockNumberProvider = frame_system::Pallet<Runtime>;
	#[cfg(feature = "runtime-benchmarks")]
	type Helper = ();
}

parameter_types! {
	pub const ContractsDepositPerItem: Balance = 1 * MICRO_UNIT;
	pub const ContractsDepositPerByte: Balance = MICRO_UNIT / 100;
	pub const ContractsDefaultDepositLimit: Balance = 10 * UNIT;
	pub const ContractsCodeHashLockupDepositPercent: sp_runtime::Perbill =
		sp_runtime::Perbill::from_percent(30);
	pub storage ContractsSchedule: pallet_contracts::Schedule<Runtime> = Default::default();
}

impl pallet_contracts::Config for Runtime {
	type Time = Timestamp;
	type Randomness = RandomnessFromParentHash;
	type Currency = Balances;
	type RuntimeEvent = RuntimeEvent;
	type RuntimeCall = RuntimeCall;
	type RuntimeHoldReason = RuntimeHoldReason;
	type CallFilter = frame_support::traits::Nothing;
	type DepositPerItem = ContractsDepositPerItem;
	type DepositPerByte = ContractsDepositPerByte;
	type DefaultDepositLimit = ContractsDefaultDepositLimit;
	type CallStack = [pallet_contracts::Frame<Self>; 5];
	type WeightPrice = pallet_transaction_payment::Pallet<Runtime>;
	type WeightInfo = pallet_contracts::weights::SubstrateWeight<Runtime>;
	type ChainExtension = ();
	type Schedule = ContractsSchedule;
	type AddressGenerator = pallet_contracts::DefaultAddressGenerator;
	type MaxCodeLen = frame_support::traits::ConstU32<128_000>;
	type MaxStorageKeyLen = frame_support::traits::ConstU32<128>;
	type MaxTransientStorageSize = frame_support::traits::ConstU32<{ 1 * 1024 * 1024 }>;
	type UnsafeUnstableInterface = frame_support::traits::ConstBool<false>;
	type MaxDebugBufferLen = frame_support::traits::ConstU32<{ 2 * 1024 * 1024 }>;
	type CodeHashLockupDepositPercent = ContractsCodeHashLockupDepositPercent;
	type Migrations = ();
	type MaxDelegateDependencies = frame_support::traits::ConstU32<32>;
	type Debug = ();
	type Environment = ();
	type ApiVersion = ();
	type Xcm = ();
	type UploadOrigin = frame_system::EnsureSigned<AccountId>;
	type InstantiateOrigin = frame_system::EnsureSigned<AccountId>;
}

impl pallet_awarizon_targeting::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
}

impl pallet_awarizon_consensus::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type Currency = Balances;
	type MinValidatorStake = ConstU128<{ 100_000 * 1_000_000_000_000u128 }>;
	type ValidatorRewardsPalletId = ValidatorRewardsPalletId;
	type FeePoolPalletId = FeePoolPalletId;
	type InsurancePalletId = InsurancePalletId;
	type InboxReserveAccount = EngagementPoolAccount;
	type ForceOrigin = frame_system::EnsureRoot<AccountId>;
}

impl pallet_vesting::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type Currency = Balances;
	type BlockNumberToBalance = sp_runtime::traits::ConvertInto;
	type MinVestedTransfer = MinVestedTransfer;
	type WeightInfo = pallet_vesting::weights::SubstrateWeight<Runtime>;
	type UnvestedFundsAllowedWithdrawReasons = UnvestedFundsAllowedWithdrawReasons;
	type BlockNumberProvider = System;
	const MAX_VESTING_SCHEDULES: u32 = 3;
}

impl pallet_awarizon_identity::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type WeightInfo = ();
}

impl pallet_awarizon_links::Config for Runtime {
	type RuntimeEvent = RuntimeEvent;
	type WeightInfo = ();
}
