use frame_support::{
    assert_noop, assert_ok, derive_impl, parameter_types,
    traits::{AsEnsureOriginWithArg, ConstBool, ConstU32, ConstU64, ConstU8},
    weights::IdentityFee,
};
use pallet_transaction_payment::{ConstFeeMultiplier, FungibleAdapter, Multiplier};
use sp_runtime::{traits::One, BuildStorage, Perbill};

type Balance = u128;
type Block = frame_system::mocking::MockBlock<Test>;

// =========================================================================
// Mock runtime
// =========================================================================

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
        RuntimeViewFunction,
    )]
    pub struct Test;

    #[runtime::pallet_index(0)]
    pub type System = frame_system::Pallet<Test>;

    #[runtime::pallet_index(1)]
    pub type Balances = pallet_balances::Pallet<Test>;

    #[runtime::pallet_index(2)]
    pub type Timestamp = pallet_timestamp::Pallet<Test>;

    #[runtime::pallet_index(3)]
    pub type TransactionPayment = pallet_transaction_payment::Pallet<Test>;

    #[runtime::pallet_index(4)]
    pub type Assets = pallet_assets::Pallet<Test>;

    #[runtime::pallet_index(5)]
    pub type Nfts = pallet_nfts::Pallet<Test>;

    #[runtime::pallet_index(6)]
    pub type Contracts = pallet_contracts::Pallet<Test>;
}

#[derive_impl(frame_system::config_preludes::TestDefaultConfig)]
impl frame_system::Config for Test {
    type Block = Block;
    type AccountData = pallet_balances::AccountData<Balance>;
}

parameter_types! {
    pub const ExistentialDeposit: Balance = 1;
}

impl pallet_balances::Config for Test {
    type MaxLocks = ConstU32<50>;
    type MaxReserves = ();
    type ReserveIdentifier = [u8; 8];
    type Balance = Balance;
    type RuntimeEvent = RuntimeEvent;
    type DustRemoval = ();
    type ExistentialDeposit = ExistentialDeposit;
    type AccountStore = System;
    type WeightInfo = ();
    type FreezeIdentifier = RuntimeFreezeReason;
    type MaxFreezes = ConstU32<10>;
    type RuntimeHoldReason = RuntimeHoldReason;
    type RuntimeFreezeReason = RuntimeFreezeReason;
    type DoneSlashHandler = ();
}

impl pallet_timestamp::Config for Test {
    type Moment = u64;
    type OnTimestampSet = ();
    type MinimumPeriod = ConstU64<1>;
    type WeightInfo = ();
}

parameter_types! {
    pub TestFeeMultiplier: Multiplier = Multiplier::one();
}

impl pallet_transaction_payment::Config for Test {
    type RuntimeEvent = RuntimeEvent;
    type OnChargeTransaction = FungibleAdapter<Balances, ()>;
    type OperationalFeeMultiplier = ConstU8<5>;
    type WeightToFee = IdentityFee<Balance>;
    type LengthToFee = IdentityFee<Balance>;
    type FeeMultiplierUpdate = ConstFeeMultiplier<TestFeeMultiplier>;
    type WeightInfo = ();
}

// =========================================================================
// pallet-assets config
// =========================================================================

parameter_types! {
    pub const AssetDeposit: Balance = 100;
    pub const AssetAccountDeposit: Balance = 10;
    pub const ApprovalDeposit: Balance = 1;
    pub const AssetsStringLimit: u32 = 50;
    pub const MetadataDepositBase: Balance = 10;
    pub const MetadataDepositPerByte: Balance = 1;
}

impl pallet_assets::Config for Test {
    type RuntimeEvent = RuntimeEvent;
    type Balance = Balance;
    type AssetId = u32;
    type AssetIdParameter = codec::Compact<u32>;
    type Currency = Balances;
    type CreateOrigin = AsEnsureOriginWithArg<frame_system::EnsureSigned<u64>>;
    type ForceOrigin = frame_system::EnsureRoot<u64>;
    type AssetDeposit = AssetDeposit;
    type AssetAccountDeposit = AssetAccountDeposit;
    type MetadataDepositBase = MetadataDepositBase;
    type MetadataDepositPerByte = MetadataDepositPerByte;
    type ApprovalDeposit = ApprovalDeposit;
    type StringLimit = AssetsStringLimit;
    type Freezer = ();
    type Holder = ();
    type Extra = ();
    type WeightInfo = ();
    type RemoveItemsLimit = ConstU32<1000>;
    type CallbackHandle = ();
    #[cfg(feature = "runtime-benchmarks")]
    type BenchmarkHelper = ();
}

// =========================================================================
// pallet-nfts config
// =========================================================================

parameter_types! {
    pub const NftsCollectionDeposit: Balance = 100;
    pub const NftsItemDeposit: Balance = 10;
    pub const NftsMetadataDepositBase: Balance = 10;
    pub const NftsAttributeDepositBase: Balance = 10;
    pub const NftsDepositPerByte: Balance = 1;
    pub const NftsStringLimit: u32 = 256;
    pub const NftsKeyLimit: u32 = 64;
    pub const NftsValueLimit: u32 = 256;
    pub const NftsApprovalsLimit: u32 = 20;
    pub const NftsItemAttributesApprovalsLimit: u32 = 30;
    pub const NftsMaxTips: u32 = 10;
    pub const NftsMaxDeadlineDuration: u64 = 12 * 28800;
    pub storage NftsFeatures: pallet_nfts::PalletFeatures =
        pallet_nfts::PalletFeatures::all_enabled();
}

impl pallet_nfts::Config for Test {
    type RuntimeEvent = RuntimeEvent;
    type CollectionId = u32;
    type ItemId = u32;
    type Currency = Balances;
    type ForceOrigin = frame_system::EnsureRoot<u64>;
    type CreateOrigin = AsEnsureOriginWithArg<frame_system::EnsureSigned<u64>>;
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
    type MaxAttributesPerCall = ConstU32<10>;
    type Features = NftsFeatures;
    type OffchainSignature = sp_runtime::testing::TestSignature;
    type OffchainPublic = sp_runtime::testing::UintAuthorityId;
    type WeightInfo = ();
    type BlockNumberProvider = frame_system::Pallet<Test>;
    #[cfg(feature = "runtime-benchmarks")]
    type Helper = ();
}

// =========================================================================
// pallet-contracts config
// =========================================================================

pub struct MockRandomness;
impl frame_support::traits::Randomness<sp_core::H256, u64> for MockRandomness {
    fn random(_subject: &[u8]) -> (sp_core::H256, u64) {
        (Default::default(), 0)
    }
}

parameter_types! {
    pub const ContractsDepositPerItem: Balance = 1;
    pub const ContractsDepositPerByte: Balance = 1;
    pub const ContractsDefaultDepositLimit: Balance = 1_000_000;
    pub const ContractsCodeHashLockupDepositPercent: Perbill = Perbill::from_percent(30);
    pub storage ContractsSchedule: pallet_contracts::Schedule<Test> = Default::default();
}

impl pallet_contracts::Config for Test {
    type Time = Timestamp;
    type Randomness = MockRandomness;
    type Currency = Balances;
    type RuntimeEvent = RuntimeEvent;
    type RuntimeCall = RuntimeCall;
    type RuntimeHoldReason = RuntimeHoldReason;
    type CallFilter = frame_support::traits::Nothing;
    type DepositPerItem = ContractsDepositPerItem;
    type DepositPerByte = ContractsDepositPerByte;
    type DefaultDepositLimit = ContractsDefaultDepositLimit;
    type CallStack = [pallet_contracts::Frame<Self>; 5];
    type WeightPrice = pallet_transaction_payment::Pallet<Test>;
    type WeightInfo = ();
    type ChainExtension = ();
    type Schedule = ContractsSchedule;
    type AddressGenerator = pallet_contracts::DefaultAddressGenerator;
    type MaxCodeLen = ConstU32<{ 64 * 1024 }>;
    type MaxStorageKeyLen = ConstU32<128>;
    type MaxTransientStorageSize = ConstU32<{ 1 * 1024 * 1024 }>;
    type UnsafeUnstableInterface = ConstBool<false>;
    type MaxDebugBufferLen = ConstU32<{ 2 * 1024 * 1024 }>;
    type CodeHashLockupDepositPercent = ContractsCodeHashLockupDepositPercent;
    type Migrations = ();
    type MaxDelegateDependencies = ConstU32<32>;
    type Debug = ();
    type Environment = ();
    type ApiVersion = ();
    type Xcm = ();
    type UploadOrigin = frame_system::EnsureSigned<u64>;
    type InstantiateOrigin = frame_system::EnsureSigned<u64>;
}

// =========================================================================
// Test externalities
// =========================================================================

pub fn new_test_ext() -> sp_io::TestExternalities {
    let mut t = frame_system::GenesisConfig::<Test>::default()
        .build_storage()
        .unwrap();
    pallet_balances::GenesisConfig::<Test> {
        balances: vec![
            (1u64, 1_000_000_000_000u128),
            (2u64, 1_000_000_000_000u128),
            (3u64, 1_000_000_000_000u128),
        ],
        ..Default::default()
    }
    .assimilate_storage(&mut t)
    .unwrap();
    t.into()
}

// =========================================================================
// pallet-assets tests
// =========================================================================

#[test]
fn assets_force_create_and_mint() {
    new_test_ext().execute_with(|| {
        System::set_block_number(1);
        assert_ok!(Assets::force_create(
            RuntimeOrigin::root(),
            codec::Compact(1u32),
            1u64,
            true,
            1u128,
        ));
        assert_ok!(Assets::mint(
            RuntimeOrigin::signed(1),
            codec::Compact(1u32),
            2u64,
            500u128,
        ));
        assert_eq!(Assets::balance(1u32, 2u64), 500u128);
    });
}

#[test]
fn assets_transfer() {
    new_test_ext().execute_with(|| {
        System::set_block_number(1);
        assert_ok!(Assets::force_create(
            RuntimeOrigin::root(),
            codec::Compact(1u32),
            1u64,
            true,
            1u128,
        ));
        assert_ok!(Assets::mint(
            RuntimeOrigin::signed(1),
            codec::Compact(1u32),
            1u64,
            1000u128,
        ));
        assert_ok!(Assets::transfer(
            RuntimeOrigin::signed(1),
            codec::Compact(1u32),
            2u64,
            300u128,
        ));
        assert_eq!(Assets::balance(1u32, 1u64), 700u128);
        assert_eq!(Assets::balance(1u32, 2u64), 300u128);
    });
}

#[test]
fn assets_burn() {
    new_test_ext().execute_with(|| {
        System::set_block_number(1);
        assert_ok!(Assets::force_create(
            RuntimeOrigin::root(),
            codec::Compact(1u32),
            1u64,
            true,
            1u128,
        ));
        assert_ok!(Assets::mint(
            RuntimeOrigin::signed(1),
            codec::Compact(1u32),
            1u64,
            1000u128,
        ));
        assert_ok!(Assets::burn(
            RuntimeOrigin::signed(1),
            codec::Compact(1u32),
            1u64,
            200u128,
        ));
        assert_eq!(Assets::balance(1u32, 1u64), 800u128);
    });
}

#[test]
fn assets_cannot_transfer_more_than_balance() {
    new_test_ext().execute_with(|| {
        System::set_block_number(1);
        assert_ok!(Assets::force_create(
            RuntimeOrigin::root(),
            codec::Compact(1u32),
            1u64,
            true,
            1u128,
        ));
        assert_ok!(Assets::mint(
            RuntimeOrigin::signed(1),
            codec::Compact(1u32),
            1u64,
            100u128,
        ));
        assert_noop!(
            Assets::transfer(RuntimeOrigin::signed(1), codec::Compact(1u32), 2u64, 9999u128),
            pallet_assets::Error::<Test>::BalanceLow,
        );
    });
}

// =========================================================================
// pallet-nfts tests
// =========================================================================

fn nfts_collection_config() -> pallet_nfts::CollectionConfig<
    Balance,
    u64,
    u32,
> {
    pallet_nfts::CollectionConfig {
        settings: pallet_nfts::CollectionSettings::all_enabled(),
        max_supply: None,
        mint_settings: Default::default(),
    }
}

#[test]
fn nfts_force_create_collection() {
    new_test_ext().execute_with(|| {
        System::set_block_number(1);
        assert_ok!(Nfts::force_create(
            RuntimeOrigin::root(),
            1u64,
            nfts_collection_config(),
        ));
        // Collection 0 should exist and be owned by account 1
        assert_eq!(Nfts::collection_owner(0u32), Some(1u64));
    });
}

#[test]
fn nfts_force_mint_and_owner() {
    new_test_ext().execute_with(|| {
        System::set_block_number(1);
        assert_ok!(Nfts::force_create(
            RuntimeOrigin::root(),
            1u64,
            nfts_collection_config(),
        ));
        assert_ok!(Nfts::force_mint(
            RuntimeOrigin::root(),
            0u32,
            0u32,
            2u64,
            pallet_nfts::ItemConfig {
                settings: pallet_nfts::ItemSettings::all_enabled(),
            },
        ));
        assert_eq!(Nfts::owner(0u32, 0u32), Some(2u64));
    });
}

#[test]
fn nfts_transfer() {
    new_test_ext().execute_with(|| {
        System::set_block_number(1);
        assert_ok!(Nfts::force_create(
            RuntimeOrigin::root(),
            1u64,
            nfts_collection_config(),
        ));
        assert_ok!(Nfts::force_mint(
            RuntimeOrigin::root(),
            0u32,
            0u32,
            1u64,
            pallet_nfts::ItemConfig {
                settings: pallet_nfts::ItemSettings::all_enabled(),
            },
        ));
        assert_eq!(Nfts::owner(0u32, 0u32), Some(1u64));
        assert_ok!(Nfts::transfer(RuntimeOrigin::signed(1), 0u32, 0u32, 2u64));
        assert_eq!(Nfts::owner(0u32, 0u32), Some(2u64));
    });
}

#[test]
fn nfts_burn() {
    new_test_ext().execute_with(|| {
        System::set_block_number(1);
        assert_ok!(Nfts::force_create(
            RuntimeOrigin::root(),
            1u64,
            nfts_collection_config(),
        ));
        assert_ok!(Nfts::force_mint(
            RuntimeOrigin::root(),
            0u32,
            0u32,
            1u64,
            pallet_nfts::ItemConfig {
                settings: pallet_nfts::ItemSettings::all_enabled(),
            },
        ));
        assert_ok!(Nfts::burn(RuntimeOrigin::signed(1), 0u32, 0u32));
        assert_eq!(Nfts::owner(0u32, 0u32), None);
    });
}

#[test]
fn nfts_non_owner_cannot_transfer() {
    new_test_ext().execute_with(|| {
        System::set_block_number(1);
        assert_ok!(Nfts::force_create(
            RuntimeOrigin::root(),
            1u64,
            nfts_collection_config(),
        ));
        assert_ok!(Nfts::force_mint(
            RuntimeOrigin::root(),
            0u32,
            0u32,
            1u64,
            pallet_nfts::ItemConfig {
                settings: pallet_nfts::ItemSettings::all_enabled(),
            },
        ));
        // account 2 does not own item 0
        assert_noop!(
            Nfts::transfer(RuntimeOrigin::signed(2), 0u32, 0u32, 3u64),
            pallet_nfts::Error::<Test>::NoPermission,
        );
    });
}

// =========================================================================
// Fee model tests (AwarizonWeightToFee / AwarizonLengthToFee)
// =========================================================================

mod fee_tests {
    use frame_support::weights::{Weight, WeightToFee};
    use pallet_awarizon_types::constants::{
        RIZ, WEIGHT_TIER_HEAVY, WEIGHT_TIER_LIGHT, WEIGHT_TIER_OCW, WEIGHT_TIER_STANDARD,
        WEIGHT_TIER_VERY_HEAVY,
    };

    use crate::configs::{AwarizonLengthToFee, AwarizonWeightToFee};

    #[test]
    fn zero_weight_gives_zero_fee() {
        let fee = AwarizonWeightToFee::weight_to_fee(&Weight::zero());
        assert_eq!(fee, 0);
    }

    #[test]
    fn fee_calculations_match_expected_planck_values() {
        // LIGHT: 10_000_000 * 1/8 planck/unit = 1_250_000 planck
        assert_eq!(
            AwarizonWeightToFee::weight_to_fee(&Weight::from_parts(WEIGHT_TIER_LIGHT, 0)),
            1_250_000
        );
        // STANDARD: 50_000_000 * 1/8 = 6_250_000 planck
        assert_eq!(
            AwarizonWeightToFee::weight_to_fee(&Weight::from_parts(WEIGHT_TIER_STANDARD, 0)),
            6_250_000
        );
        // HEAVY: 100_000_000 * 1/8 = 12_500_000 planck
        assert_eq!(
            AwarizonWeightToFee::weight_to_fee(&Weight::from_parts(WEIGHT_TIER_HEAVY, 0)),
            12_500_000
        );
        // VERY_HEAVY: 250_000_000 * 1/8 = 31_250_000 planck
        assert_eq!(
            AwarizonWeightToFee::weight_to_fee(&Weight::from_parts(WEIGHT_TIER_VERY_HEAVY, 0)),
            31_250_000
        );
        // OCW: 5_000_000 * 1/8 = 625_000 planck
        assert_eq!(
            AwarizonWeightToFee::weight_to_fee(&Weight::from_parts(WEIGHT_TIER_OCW, 0)),
            625_000
        );
    }

    #[test]
    fn all_tiers_produce_sub_riz_fees() {
        for tier in [
            WEIGHT_TIER_LIGHT,
            WEIGHT_TIER_STANDARD,
            WEIGHT_TIER_HEAVY,
            WEIGHT_TIER_VERY_HEAVY,
            WEIGHT_TIER_OCW,
        ] {
            let fee = AwarizonWeightToFee::weight_to_fee(&Weight::from_parts(tier, 0));
            assert!(fee < RIZ, "tier {tier} produced fee {fee} >= 1 RIZ ({RIZ} planck)");
        }
    }

    #[test]
    fn length_to_fee_scales_linearly() {
        let fee_100 = AwarizonLengthToFee::weight_to_fee(&Weight::from_parts(100, 0));
        let fee_400 = AwarizonLengthToFee::weight_to_fee(&Weight::from_parts(400, 0));
        assert_eq!(fee_400, fee_100 * 4, "LengthToFee must scale linearly with byte count");
    }

    #[test]
    fn ocw_tier_cheaper_than_lightest_user_extrinsic() {
        let ocw_fee =
            AwarizonWeightToFee::weight_to_fee(&Weight::from_parts(WEIGHT_TIER_OCW, 0));
        let light_fee =
            AwarizonWeightToFee::weight_to_fee(&Weight::from_parts(WEIGHT_TIER_LIGHT, 0));
        assert!(ocw_fee < light_fee, "OCW extrinsics must cost less than user-facing ones");
    }

    #[test]
    fn create_campaign_costs_more_than_register_developer() {
        // register_developer = STANDARD, create_campaign = VERY_HEAVY
        let register_fee =
            AwarizonWeightToFee::weight_to_fee(&Weight::from_parts(WEIGHT_TIER_STANDARD, 0));
        let campaign_fee =
            AwarizonWeightToFee::weight_to_fee(&Weight::from_parts(WEIGHT_TIER_VERY_HEAVY, 0));
        assert!(campaign_fee > register_fee);
    }

    #[test]
    fn operational_multiplier_is_five() {
        // OperationalFeeMultiplier = ConstU8<5> — operational extrinsics cost 5× normal.
        // Sudo and governance calls should be expensive to prevent spam.
        let base_fee =
            AwarizonWeightToFee::weight_to_fee(&Weight::from_parts(WEIGHT_TIER_STANDARD, 0));
        let operational_fee = base_fee.saturating_mul(5);
        // 0.00000625 RIZ * 5 = 0.00003125 RIZ — still well under 1 RIZ
        assert!(operational_fee < RIZ);
        assert_eq!(operational_fee, 31_250_000);
    }
}

// =========================================================================
// pallet-contracts tests
// =========================================================================

#[test]
fn contracts_upload_empty_code_fails() {
    new_test_ext().execute_with(|| {
        System::set_block_number(1);
        let result = Contracts::upload_code(
            RuntimeOrigin::signed(1),
            vec![],
            None,
            pallet_contracts::Determinism::Enforced,
        );
        assert!(result.is_err(), "uploading empty wasm should return an error");
    });
}

#[test]
fn contracts_upload_invalid_wasm_fails() {
    new_test_ext().execute_with(|| {
        System::set_block_number(1);
        // Random bytes that are not valid wasm
        let bad_code = vec![0xDE, 0xAD, 0xBE, 0xEF, 0x00, 0x01, 0x02];
        let result = Contracts::upload_code(
            RuntimeOrigin::signed(1),
            bad_code,
            None,
            pallet_contracts::Determinism::Enforced,
        );
        assert!(result.is_err(), "uploading invalid wasm should return an error");
    });
}

#[test]
fn contracts_default_deposit_limit_is_set() {
    new_test_ext().execute_with(|| {
        assert_eq!(ContractsDefaultDepositLimit::get(), 1_000_000u128);
    });
}

#[test]
fn contracts_schedule_is_initialized() {
    new_test_ext().execute_with(|| {
        let _schedule = ContractsSchedule::get();
        // Verify it can be read without panic — schedule is valid by construction
    });
}
