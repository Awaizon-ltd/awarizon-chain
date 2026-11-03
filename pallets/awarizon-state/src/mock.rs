use frame_support::{construct_runtime, derive_impl, parameter_types, traits::ConstU32};
use sp_runtime::BuildStorage;

pub type Block = frame_system::mocking::MockBlock<Test>;

construct_runtime!(
    pub enum Test {
        System: frame_system,
        Balances: pallet_balances,
        AwarizonState: crate,
    }
);

#[derive_impl(frame_system::config_preludes::TestDefaultConfig)]
impl frame_system::Config for Test {
    type Block = Block;
    type AccountData = pallet_balances::AccountData<u128>;
}

parameter_types! {
    pub const ExistentialDeposit: u128 = 1;
    pub const VerificationStakeThreshold: u128 = 1_000_000_000_000u128; // 1 RIZ for testing
    pub const InboxStateReserveAccountId: u64 = 999u64;
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

// OCW unsigned transaction support for tests
type TestExtrinsic = sp_runtime::testing::TestXt<crate::Call<Test>, ()>;

impl frame_system::offchain::CreateTransactionBase<crate::Call<Test>> for Test {
    type Extrinsic = TestExtrinsic;
    type RuntimeCall = crate::Call<Test>;
}

impl frame_system::offchain::CreateInherent<crate::Call<Test>> for Test {
    fn create_inherent(call: crate::Call<Test>) -> TestExtrinsic {
        TestExtrinsic::new_bare(call)
    }
}

impl crate::Config for Test {
    type RuntimeEvent = RuntimeEvent;
    type Currency = Balances;
    type VerificationStakeThreshold = VerificationStakeThreshold;
    type InboxStateReserveAccount = InboxStateReserveAccountId;
    type AuthorityId = crate::crypto::AwarizonAuthId;
    type RewardDistributor = ();
}

pub fn new_test_ext() -> sp_io::TestExternalities {
    let mut t = frame_system::GenesisConfig::<Test>::default()
        .build_storage()
        .unwrap();
    pallet_balances::GenesisConfig::<Test> {
        balances: vec![
            (1u64, 1_000_000_000_000_000u128),
            (2u64, 1_000_000_000_000_000u128),
            (999u64, 10_000_000_000_000_000u128), // 10,000 RIZ to cover reward payouts
        ],
        ..Default::default()
    }
    .assimilate_storage(&mut t)
    .unwrap();
    t.into()
}
