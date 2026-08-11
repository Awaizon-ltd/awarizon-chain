use crate::{mock::*, types::*, Error, LPBalances, Pools, ProtocolFeeDestination};
use frame_support::{assert_noop, assert_ok};

const RIZ: u128 = 1_000_000_000_000u128;

fn create_token(id: u32, admin: u64) {
    assert_ok!(Assets::force_create(RuntimeOrigin::root(), id.into(), admin, true, 1));
}

fn mint_token(id: u32, admin: u64, to: u64, amount: u128) {
    assert_ok!(Assets::mint(RuntimeOrigin::signed(admin), id.into(), to, amount));
}

#[test]
fn create_pool_riz_pair_works() {
    new_test_ext().execute_with(|| {
        create_token(1, 1);
        mint_token(1, 1, 1, 1_000 * RIZ);

        assert_ok!(AwarizonDex::create_pool(
            RuntimeOrigin::signed(1),
            Asset::Native,
            Asset::Token(1),
            100 * RIZ,
            100 * RIZ,
            100,
        ));

        let pool_id = PoolId::new(Asset::Native, Asset::Token(1));
        let pool = Pools::<Test>::get(&pool_id).unwrap();
        assert_eq!(pool.reserve_a, 100 * RIZ);
        assert_eq!(pool.reserve_b, 100 * RIZ);

        // sqrt(100 RIZ * 100 RIZ) - MINIMUM_LIQUIDITY locked forever.
        let expected_lp = pool.lp_total_supply - MinimumLiquidityVal::get();
        assert_eq!(LPBalances::<Test>::get(1u64, &pool_id), expected_lp);
    });
}

#[test]
fn create_pool_rejects_duplicate() {
    new_test_ext().execute_with(|| {
        create_token(1, 1);
        mint_token(1, 1, 1, 1_000 * RIZ);
        assert_ok!(AwarizonDex::create_pool(
            RuntimeOrigin::signed(1),
            Asset::Native,
            Asset::Token(1),
            100 * RIZ,
            100 * RIZ,
            100,
        ));
        assert_noop!(
            AwarizonDex::create_pool(
                RuntimeOrigin::signed(1),
                Asset::Native,
                Asset::Token(1),
                100 * RIZ,
                100 * RIZ,
                100,
            ),
            Error::<Test>::PoolAlreadyExists
        );
    });
}

#[test]
fn create_pool_rejects_below_minimum() {
    new_test_ext().execute_with(|| {
        create_token(1, 1);
        mint_token(1, 1, 1, 1_000 * RIZ);
        assert_noop!(
            AwarizonDex::create_pool(
                RuntimeOrigin::signed(1),
                Asset::Native,
                Asset::Token(1),
                1,
                1,
                100,
            ),
            Error::<Test>::BelowMinimumLiquidity
        );
    });
}

#[test]
fn create_pool_rejects_expired_deadline() {
    new_test_ext().execute_with(|| {
        create_token(1, 1);
        mint_token(1, 1, 1, 1_000 * RIZ);
        System::set_block_number(50);
        assert_noop!(
            AwarizonDex::create_pool(
                RuntimeOrigin::signed(1),
                Asset::Native,
                Asset::Token(1),
                100 * RIZ,
                100 * RIZ,
                10,
            ),
            Error::<Test>::DeadlineExceeded
        );
    });
}

#[test]
fn add_and_remove_liquidity_round_trips() {
    new_test_ext().execute_with(|| {
        create_token(1, 1);
        mint_token(1, 1, 1, 1_000 * RIZ);
        assert_ok!(AwarizonDex::create_pool(
            RuntimeOrigin::signed(1),
            Asset::Native,
            Asset::Token(1),
            100 * RIZ,
            100 * RIZ,
            100,
        ));

        let pool_id = PoolId::new(Asset::Native, Asset::Token(1));

        assert_ok!(AwarizonDex::add_liquidity(
            RuntimeOrigin::signed(1),
            Asset::Native,
            Asset::Token(1),
            50 * RIZ,
            50 * RIZ,
            1,
            1,
            100,
        ));
        let pool_after_add = Pools::<Test>::get(&pool_id).unwrap();
        assert_eq!(pool_after_add.reserve_a, 150 * RIZ);
        assert_eq!(pool_after_add.reserve_b, 150 * RIZ);

        let lp_balance = LPBalances::<Test>::get(1u64, &pool_id);
        assert_ok!(AwarizonDex::remove_liquidity(
            RuntimeOrigin::signed(1),
            Asset::Native,
            Asset::Token(1),
            lp_balance,
            1,
            1,
            100,
        ));
        let pool_after_remove = Pools::<Test>::get(&pool_id).unwrap();
        // Only the permanently-locked MINIMUM_LIQUIDITY worth of LP remains.
        assert_eq!(LPBalances::<Test>::get(1u64, &pool_id), 0);
        assert!(pool_after_remove.reserve_a > 0);
        assert!(pool_after_remove.reserve_b > 0);
    });
}

#[test]
fn swap_exact_in_direct_pool() {
    new_test_ext().execute_with(|| {
        create_token(1, 1);
        mint_token(1, 1, 1, 1_000 * RIZ);
        mint_token(1, 1, 2, 1_000 * RIZ);
        assert_ok!(AwarizonDex::create_pool(
            RuntimeOrigin::signed(1),
            Asset::Native,
            Asset::Token(1),
            1_000 * RIZ,
            1_000 * RIZ,
            100,
        ));

        let balance_before = Balances::free_balance(2);
        assert_ok!(AwarizonDex::swap_exact_in(
            RuntimeOrigin::signed(2),
            Asset::Token(1),
            Asset::Native,
            10 * RIZ,
            1,
            100,
        ));
        let balance_after = Balances::free_balance(2);
        assert!(balance_after > balance_before, "trader should receive RIZ out");
    });
}

#[test]
fn swap_exact_in_rejects_slippage() {
    new_test_ext().execute_with(|| {
        create_token(1, 1);
        mint_token(1, 1, 1, 1_000 * RIZ);
        mint_token(1, 1, 2, 1_000 * RIZ);
        assert_ok!(AwarizonDex::create_pool(
            RuntimeOrigin::signed(1),
            Asset::Native,
            Asset::Token(1),
            1_000 * RIZ,
            1_000 * RIZ,
            100,
        ));

        assert_noop!(
            AwarizonDex::swap_exact_in(
                RuntimeOrigin::signed(2),
                Asset::Token(1),
                Asset::Native,
                10 * RIZ,
                10 * RIZ, // impossibly high minimum out given fees + slippage
                100,
            ),
            Error::<Test>::SlippageExceeded
        );
    });
}

#[test]
fn swap_multi_hop_via_riz() {
    new_test_ext().execute_with(|| {
        create_token(1, 1);
        create_token(2, 1);
        mint_token(1, 1, 1, 1_000 * RIZ);
        mint_token(2, 1, 1, 1_000 * RIZ);
        mint_token(1, 1, 2, 1_000 * RIZ);

        assert_ok!(AwarizonDex::create_pool(
            RuntimeOrigin::signed(1),
            Asset::Native,
            Asset::Token(1),
            1_000 * RIZ,
            1_000 * RIZ,
            100,
        ));
        assert_ok!(AwarizonDex::create_pool(
            RuntimeOrigin::signed(1),
            Asset::Native,
            Asset::Token(2),
            1_000 * RIZ,
            1_000 * RIZ,
            100,
        ));

        let token2_before = Assets::balance(2, 2);
        assert_ok!(AwarizonDex::swap_exact_in(
            RuntimeOrigin::signed(2),
            Asset::Token(1),
            Asset::Token(2),
            10 * RIZ,
            1,
            100,
        ));
        let token2_after = Assets::balance(2, 2);
        assert!(token2_after > token2_before, "trader should receive Token(2) via RIZ hop");
    });
}

#[test]
fn treasury_mode_routes_native_fee_to_fee_pool_account() {
    new_test_ext().execute_with(|| {
        use sp_runtime::traits::AccountIdConversion;
        let fee_pool: u64 = pallet_awarizon_types::constants::FEE_POOL_PALLET_ID.into_account_truncating();

        create_token(1, 1);
        mint_token(1, 1, 1, 1_000 * RIZ);
        assert_ok!(AwarizonDex::create_pool(
            RuntimeOrigin::signed(1),
            Asset::Native,
            Asset::Token(1),
            1_000 * RIZ,
            1_000 * RIZ,
            100,
        ));
        assert_ok!(AwarizonDex::set_fee_destination(RuntimeOrigin::root(), FeeDestination::Treasury));

        let fee_pool_before = Balances::free_balance(fee_pool);
        // asset_in = Native, so the protocol burn slice is carved out of the RIZ leg —
        // that's the case FeeDestination::Treasury actually forwards anywhere today.
        assert_ok!(AwarizonDex::swap_exact_in(
            RuntimeOrigin::signed(2),
            Asset::Native,
            Asset::Token(1),
            10 * RIZ,
            1,
            100,
        ));
        let fee_pool_after = Balances::free_balance(fee_pool);
        assert!(
            fee_pool_after > fee_pool_before,
            "native RIZ protocol fee should land in awarizon-consensus's fee pool account"
        );
    });
}

#[test]
fn set_fee_destination_requires_root() {
    new_test_ext().execute_with(|| {
        assert_noop!(
            AwarizonDex::set_fee_destination(RuntimeOrigin::signed(1), FeeDestination::Treasury),
            sp_runtime::DispatchError::BadOrigin
        );
        assert_ok!(AwarizonDex::set_fee_destination(RuntimeOrigin::root(), FeeDestination::Treasury));
        assert_eq!(ProtocolFeeDestination::<Test>::get(), FeeDestination::Treasury);
    });
}
