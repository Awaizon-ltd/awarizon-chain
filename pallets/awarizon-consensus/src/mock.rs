use frame_support::{construct_runtime, derive_impl, parameter_types, traits::ConstU32, PalletId};
use sp_runtime::BuildStorage;

pub type Block = frame_system::mocking::MockBlock<Test>;

construct_runtime!(
    pub enum Test {
        System: frame_system,
        Balances: pallet_balances,
        AwarizonConsensus: crate,
    }
);

#[derive_impl(frame_system::config_preludes::TestDefaultConfig)]
impl frame_system::Config for Test {
    type Block = Block;
    type AccountData = pallet_balances::AccountData<u128>;
}

parameter_types! {
    pub const ExistentialDeposit: u128 = 1;
    pub const MinValidatorStakeVal: u128 = 1_000u128;
    pub const ValidatorRewardsPalletIdVal: PalletId = PalletId(*b"riz/vldr");
    pub const FeePoolPalletIdVal: PalletId = PalletId(*b"riz/fees");
    pub const InsurancePalletIdVal: PalletId = PalletId(*b"riz/insr");
    pub const InboxReserveAccountVal: u64 = 999u64;
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

impl crate::Config for Test {
    type RuntimeEvent = RuntimeEvent;
    type Currency = Balances;
    type MinValidatorStake = MinValidatorStakeVal;
    type ValidatorRewardsPalletId = ValidatorRewardsPalletIdVal;
    type FeePoolPalletId = FeePoolPalletIdVal;
    type InsurancePalletId = InsurancePalletIdVal;
    type InboxReserveAccount = InboxReserveAccountVal;
    type ForceOrigin = frame_system::EnsureRoot<u64>;
}

pub fn new_test_ext() -> sp_io::TestExternalities {
    let mut t = frame_system::GenesisConfig::<Test>::default()
        .build_storage()
        .unwrap();
    pallet_balances::GenesisConfig::<Test> {
        balances: vec![
            (1u64, 1_000_000_000_000_000u128),
            (2u64, 1_000_000_000_000_000u128),
            (3u64, 1_000_000_000_000_000u128),
            (4u64, 1_000_000_000_000_000u128),
            (5u64, 1_000_000_000_000_000u128),
        ],
        ..Default::default()
    }
    .assimilate_storage(&mut t)
    .unwrap();
    t.into()
}
