use frame_support::{
    construct_runtime, derive_impl, parameter_types,
    traits::{AsEnsureOriginWithArg, ConstU32},
    PalletId,
};
use sp_runtime::BuildStorage;

pub type Block = frame_system::mocking::MockBlock<Test>;

construct_runtime!(
    pub enum Test {
        System: frame_system,
        Balances: pallet_balances,
        Assets: pallet_assets,
        AwarizonDex: crate,
    }
);

#[derive_impl(frame_system::config_preludes::TestDefaultConfig)]
impl frame_system::Config for Test {
    type Block = Block;
    type AccountData = pallet_balances::AccountData<u128>;
}

const RIZ: u128 = 1_000_000_000_000u128;

parameter_types! {
    pub const ExistentialDeposit: u128 = 1;
    // Nonzero, matching runtime/src/configs/mod.rs — a zero deposit here would let a
    // pool account with no balance yet "pay" a deposit trivially, masking ordering bugs
    // like requiring `Assets::set` to reserve a deposit before the account is funded.
    pub const AssetDeposit: u128 = 100 * RIZ;
    pub const AssetAccountDeposit: u128 = 1 * RIZ;
    pub const MetadataDepositBase: u128 = 10 * RIZ;
    pub const MetadataDepositPerByte: u128 = 1_000_000u128;
    pub const ApprovalDeposit: u128 = 1 * RIZ;
    pub const AssetsStringLimit: u32 = 50;
    pub const DexPalletIdVal: PalletId = PalletId(*b"riz/dexx");
    pub const MinimumLiquidityVal: u128 = 1_000u128;
    pub const MaxRouterHopsVal: u32 = 3;
}

impl pallet_balances::Config for Test {
    type MaxLocks = ConstU32<50>;
    type MaxReserves = ();
    type ReserveIdentifier = [u8; 8];
    type Balance = u128;
    type RuntimeEvent = RuntimeEvent;
    type DustRemoval = ();
    type ExistentialDeposit = ExistentialDeposit;
    type AccountStore = System;
    type WeightInfo = ();
    type FreezeIdentifier = ();
    type MaxFreezes = ConstU32<0>;
    type RuntimeHoldReason = RuntimeHoldReason;
    type RuntimeFreezeReason = RuntimeFreezeReason;
    type DoneSlashHandler = ();
}

impl pallet_assets::Config for Test {
    type RuntimeEvent = RuntimeEvent;
    type Balance = u128;
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

impl crate::Config for Test {
    type RuntimeEvent = RuntimeEvent;
    type Currency = Balances;
    type Assets = Assets;
    type PalletId = DexPalletIdVal;
    type MinimumLiquidity = MinimumLiquidityVal;
    type MaxRouterHops = MaxRouterHopsVal;
    type FeeDepositor = ();
}

pub fn new_test_ext() -> sp_io::TestExternalities {
    let mut t = frame_system::GenesisConfig::<Test>::default().build_storage().unwrap();
    pallet_balances::GenesisConfig::<Test> {
        balances: vec![
            (1u64, 1_000_000_000_000_000_000u128),
            (2u64, 1_000_000_000_000_000_000u128),
            (3u64, 1_000_000_000_000_000_000u128),
        ],
        ..Default::default()
    }
    .assimilate_storage(&mut t)
    .unwrap();
    t.into()
}
