use crate::geography::GeographyEnforcer;
use crate::mock::*;
use crate::pallet::{
    ActiveValidators, ConsensusEpoch, Delegations, Error, Event, EpochRewardHistory,
    InsurancePoolBalance, PendingDelegatorRewards, TotalValidatorCount, ValidatorDelegatedStake,
    ValidatorRewardDestination, Validators, YieldReserveRemaining,
};
use crate::performance::PerformanceCalculator;
use crate::{SlashReason, ValidatorInfo};
use frame_support::{assert_noop, assert_ok, traits::Currency, PalletId};
use pallet_awarizon_types::constants::{
    BASE_REWARD_PCT, BPS_DENOMINATOR, FEE_SPLIT_STAKING_PCT, PERF_REWARD_PCT,
    YIELD_RESERVE_DAILY_EMISSION, YIELD_RESERVE_TOTAL,
};
use sp_runtime::traits::AccountIdConversion;

// ================================================================
// PerformanceCalculator unit tests
// ================================================================

#[test]
fn performance_perfect_score_is_10000() {
    assert_eq!(
        PerformanceCalculator::score(10_000, 10_000, 10_000, 10_000),
        10_000
    );
}

#[test]
fn performance_zero_uptime_reduces_score() {
    // uptime=0 loses 50%, rest contributes 2500+1500+1000=5000
    assert_eq!(
        PerformanceCalculator::score(0, 10_000, 10_000, 10_000),
        5_000
    );
}

#[test]
fn performance_score_never_exceeds_10000() {
    // Overflow input values are clamped
    assert_eq!(
        PerformanceCalculator::score(99_999, 99_999, 99_999, 99_999),
        10_000
    );
}

#[test]
fn performance_multiplier_at_zero_is_minimum() {
    // At score 0, multiplier = PERF_MULTIPLIER_MIN_BPS = 5000
    assert_eq!(PerformanceCalculator::multiplier(0), 5_000);
}

#[test]
fn performance_multiplier_at_perfect_is_maximum() {
    // At score 10000, multiplier = PERF_MULTIPLIER_MAX_BPS = 12500
    assert_eq!(PerformanceCalculator::multiplier(10_000), 12_500);
}

#[test]
fn performance_effective_rank_scales_with_stake() {
    // delegated_stake=1_000_000, perfect score → rank = 1_000_000 * 12500/10000 = 1_250_000
    let rank = PerformanceCalculator::effective_rank(1_000_000, 10_000);
    assert_eq!(rank, 1_250_000);
    // zero stake → rank = 0 regardless of score
    assert_eq!(PerformanceCalculator::effective_rank(0, 10_000), 0);
}

// ================================================================
// GeographyEnforcer unit tests
// ================================================================

#[test]
fn geography_first_validator_passes_region_cap() {
    // total=0 is the special case: always allow
    assert!(GeographyEnforcer::check_region_cap(0, 0));
}

#[test]
fn geography_region_cap_allows_up_to_floor_regardless_of_total() {
    // MIN_VALIDATORS_PER_REGION = 3: the first 3 validators in a region are
    // always allowed even when the total validator count is tiny — otherwise
    // the 20% percentage cap alone blocks every region at small totals
    // (e.g. 1/2 = 50% > 20%), making it impossible to ever grow past 1
    // validator.
    assert!(GeographyEnforcer::check_region_cap(1, 0)); // region_count 0 -> 1, within floor
    assert!(GeographyEnforcer::check_region_cap(1, 1)); // region_count 1 -> 2, within floor
    assert!(GeographyEnforcer::check_region_cap(2, 2)); // region_count 2 -> 3, within floor
}

#[test]
fn geography_region_cap_blocks_beyond_floor_at_small_total() {
    // A 4th validator in the same region, with the total still small,
    // exceeds both the floor and the 20% percentage cap.
    assert!(!GeographyEnforcer::check_region_cap(3, 3));
}

#[test]
fn geography_first_validator_passes_country_cap() {
    assert!(GeographyEnforcer::check_country_cap(0, 0));
}

#[test]
fn geography_country_cap_allows_up_to_floor_regardless_of_total() {
    // MIN_VALIDATORS_PER_COUNTRY = 2, same rationale as the region floor.
    assert!(GeographyEnforcer::check_country_cap(1, 0)); // country_count 0 -> 1, within floor
    assert!(GeographyEnforcer::check_country_cap(1, 1)); // country_count 1 -> 2, within floor
}

#[test]
fn geography_country_cap_blocks_beyond_floor_at_small_total() {
    assert!(!GeographyEnforcer::check_country_cap(2, 2));
}

#[test]
fn geography_max_per_region_is_20pct() {
    assert_eq!(GeographyEnforcer::max_per_region(100), 20);
    assert_eq!(GeographyEnforcer::max_per_region(50), 10);
}

#[test]
fn geography_max_per_country_is_10pct() {
    assert_eq!(GeographyEnforcer::max_per_country(100), 10);
    assert_eq!(GeographyEnforcer::max_per_country(50), 5);
}

// ================================================================
// Pallet extrinsic tests
// ================================================================

const V1: u64 = 1;
const V2: u64 = 2;
const V3: u64 = 3;

const REGION_NA: u8 = 0x01;
const REGION_EU: u8 = 0x03;
const COUNTRY_US: u8 = 0x10;
const COUNTRY_DE: u8 = 0x20;
const STAKE: u128 = 1_000;

#[test]
fn register_validator_ok() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonConsensus::register_validator(
            RuntimeOrigin::signed(V1),
            STAKE,
            REGION_NA,
            COUNTRY_US,
        ));
        let info = Validators::<Test>::get(V1).expect("validator stored");
        assert_eq!(info.self_stake, STAKE);
        assert_eq!(info.region_code, REGION_NA);
        assert!(info.is_active);
        assert_eq!(TotalValidatorCount::<Test>::get(), 1);
    });
}

#[test]
fn register_validator_duplicate_fails() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonConsensus::register_validator(
            RuntimeOrigin::signed(V1),
            STAKE,
            REGION_NA,
            COUNTRY_US,
        ));
        assert_noop!(
            AwarizonConsensus::register_validator(
                RuntimeOrigin::signed(V1),
                STAKE,
                REGION_NA,
                COUNTRY_US,
            ),
            Error::<Test>::ValidatorAlreadyRegistered
        );
    });
}

#[test]
fn register_validator_insufficient_stake_fails() {
    new_test_ext().execute_with(|| {
        assert_noop!(
            AwarizonConsensus::register_validator(
                RuntimeOrigin::signed(V1),
                STAKE - 1, // below MinValidatorStake=1000
                REGION_NA,
                COUNTRY_US,
            ),
            Error::<Test>::InsufficientStake
        );
    });
}

#[test]
fn delegate_stake_ok() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonConsensus::register_validator(
            RuntimeOrigin::signed(V1),
            STAKE,
            REGION_NA,
            COUNTRY_US,
        ));
        let delegation_amount = 500u128;
        assert_ok!(AwarizonConsensus::delegate_stake(
            RuntimeOrigin::signed(V2),
            V1,
            delegation_amount,
        ));
        let d = Delegations::<Test>::get(V2, V1).expect("delegation stored");
        assert_eq!(d.amount, delegation_amount);
        assert_eq!(ValidatorDelegatedStake::<Test>::get(V1), delegation_amount);
        let info = Validators::<Test>::get(V1).unwrap();
        assert_eq!(info.delegated_stake, delegation_amount);
    });
}

#[test]
fn delegate_stake_fails_to_self() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonConsensus::register_validator(
            RuntimeOrigin::signed(V1),
            STAKE,
            REGION_NA,
            COUNTRY_US,
        ));
        assert_noop!(
            AwarizonConsensus::delegate_stake(RuntimeOrigin::signed(V1), V1, 500),
            Error::<Test>::CannotDelegateToSelf
        );
    });
}

#[test]
fn delegate_stake_fails_validator_not_found() {
    new_test_ext().execute_with(|| {
        assert_noop!(
            AwarizonConsensus::delegate_stake(RuntimeOrigin::signed(V2), V1, 500),
            Error::<Test>::ValidatorNotFound
        );
    });
}

#[test]
fn delegate_stake_fails_already_delegated() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonConsensus::register_validator(
            RuntimeOrigin::signed(V1),
            STAKE,
            REGION_NA,
            COUNTRY_US,
        ));
        assert_ok!(AwarizonConsensus::delegate_stake(
            RuntimeOrigin::signed(V2),
            V1,
            500,
        ));
        assert_noop!(
            AwarizonConsensus::delegate_stake(RuntimeOrigin::signed(V2), V1, 500),
            Error::<Test>::AlreadyDelegated
        );
    });
}

#[test]
fn undelegate_stake_ok() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonConsensus::register_validator(
            RuntimeOrigin::signed(V1),
            STAKE,
            REGION_NA,
            COUNTRY_US,
        ));
        assert_ok!(AwarizonConsensus::delegate_stake(
            RuntimeOrigin::signed(V2),
            V1,
            500,
        ));
        assert_ok!(AwarizonConsensus::undelegate_stake(
            RuntimeOrigin::signed(V2),
            V1,
        ));
        assert!(Delegations::<Test>::get(V2, V1).is_none());
        assert_eq!(ValidatorDelegatedStake::<Test>::get(V1), 0);
    });
}

#[test]
fn undelegate_stake_fails_not_found() {
    new_test_ext().execute_with(|| {
        assert_noop!(
            AwarizonConsensus::undelegate_stake(RuntimeOrigin::signed(V2), V1),
            Error::<Test>::DelegationNotFound
        );
    });
}

#[test]
fn update_performance_ok() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonConsensus::register_validator(
            RuntimeOrigin::signed(V1),
            STAKE,
            REGION_NA,
            COUNTRY_US,
        ));
        assert_ok!(AwarizonConsensus::update_performance(
            RuntimeOrigin::signed(V2), // any signed origin
            V1,
            9_000, // uptime
            8_000, // finality
            9_500, // blocks
        ));
        let info = Validators::<Test>::get(V1).unwrap();
        assert_eq!(info.uptime_bps, 9_000);
        assert_eq!(info.finality_bps, 8_000);
        assert_eq!(info.blocks_bps, 9_500);
    });
}

#[test]
fn update_performance_fails_not_found() {
    new_test_ext().execute_with(|| {
        assert_noop!(
            AwarizonConsensus::update_performance(
                RuntimeOrigin::signed(V2),
                V1,
                10_000,
                10_000,
                10_000,
            ),
            Error::<Test>::ValidatorNotFound
        );
    });
}

#[test]
fn run_epoch_election_selects_registered_validator() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonConsensus::register_validator(
            RuntimeOrigin::signed(V1),
            STAKE,
            REGION_NA,
            COUNTRY_US,
        ));
        assert_ok!(AwarizonConsensus::run_epoch_election(
            RuntimeOrigin::signed(V2),
            1,
        ));
        let active = ActiveValidators::<Test>::get();
        assert!(active.contains(&V1));
        assert_eq!(ConsensusEpoch::<Test>::get(), 1);
    });
}

#[test]
fn slash_validator_deactivates_after_three_slashes() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonConsensus::register_validator(
            RuntimeOrigin::signed(V1),
            STAKE,
            REGION_NA,
            COUNTRY_US,
        ));
        assert_eq!(TotalValidatorCount::<Test>::get(), 1);
        // First slash
        assert_ok!(AwarizonConsensus::slash_validator(
            RuntimeOrigin::root(),
            V1,
            0x01,
        ));
        let info = Validators::<Test>::get(V1).unwrap();
        assert!(info.is_active, "still active after first slash");
        assert_eq!(info.slash_count, 1);
        // Second slash
        assert_ok!(AwarizonConsensus::slash_validator(
            RuntimeOrigin::root(),
            V1,
            0x01,
        ));
        let info = Validators::<Test>::get(V1).unwrap();
        assert!(info.is_active, "still active after second slash");
        // Third slash — triggers deactivation
        assert_ok!(AwarizonConsensus::slash_validator(
            RuntimeOrigin::root(),
            V1,
            0x01,
        ));
        let info = Validators::<Test>::get(V1).unwrap();
        assert!(!info.is_active, "deactivated after third slash");
        assert_eq!(TotalValidatorCount::<Test>::get(), 0, "count decremented");
    });
}

#[test]
fn slash_validator_fails_not_found() {
    new_test_ext().execute_with(|| {
        assert_noop!(
            AwarizonConsensus::slash_validator(RuntimeOrigin::root(), V1, 0x01),
            Error::<Test>::ValidatorNotFound
        );
    });
}

// ================================================================
// Staking economy: commission, epoch rewards, claims, slashing
//
// NOTE: EPOCH_LENGTH_BLOCKS is ~28,800 blocks (~1 day of real block time),
// so a live dev node cannot practically wait out a real epoch boundary in
// a test session. These tests exercise `distribute_epoch_rewards` and the
// new extrinsics directly against the mock runtime instead, which is the
// same code path awarizon-state's advance_epoch/ocw_advance_epoch call
// through the `EpochRewardDistributor` hook once a real epoch elapses.
// ================================================================

fn yield_reserve_account() -> u64 {
    PalletId(*b"riz/vldr").into_account_truncating()
}

fn fee_pool_account() -> u64 {
    PalletId(*b"riz/fees").into_account_truncating()
}

fn insurance_account() -> u64 {
    PalletId(*b"riz/insr").into_account_truncating()
}

fn last_event() -> RuntimeEvent {
    System::events().pop().expect("an event was emitted").event
}

#[test]
fn set_commission_ok_and_rejects_over_max() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonConsensus::register_validator(
            RuntimeOrigin::signed(V1),
            STAKE,
            REGION_NA,
            COUNTRY_US,
        ));
        assert_ok!(AwarizonConsensus::set_commission(RuntimeOrigin::signed(V1), 15));
        assert_eq!(Validators::<Test>::get(V1).unwrap().commission, 15);
        assert_noop!(
            AwarizonConsensus::set_commission(RuntimeOrigin::signed(V1), 21),
            Error::<Test>::CommissionTooHigh
        );
    });
}

#[test]
fn distribute_epoch_rewards_pays_validator_and_delegator() {
    new_test_ext().execute_with(|| {
        System::set_block_number(1); // events aren't recorded at block 0
        assert_ok!(AwarizonConsensus::register_validator(
            RuntimeOrigin::signed(V1),
            STAKE,
            REGION_NA,
            COUNTRY_US,
        ));
        assert_ok!(AwarizonConsensus::set_commission(RuntimeOrigin::signed(V1), 10));
        assert_ok!(AwarizonConsensus::delegate_stake(RuntimeOrigin::signed(V2), V1, 500));

        // Back the "fees" counter with real currency, matching how DealWithFees
        // credits the fee pool account for every real transaction fee.
        let fee_amt = 10_000u128;
        Balances::make_free_balance_be(&fee_pool_account(), fee_amt);
        AwarizonConsensus::deposit_fee(fee_amt);
        assert_eq!(crate::pallet::EpochFeesCollected::<Test>::get(), fee_amt);

        // Fund the yield reserve and initialize its counter so the daily
        // emission transfer inside distribute_epoch_rewards can succeed.
        Balances::make_free_balance_be(&yield_reserve_account(), YIELD_RESERVE_TOTAL);
        YieldReserveRemaining::<Test>::put(YIELD_RESERVE_TOTAL);

        assert_ok!(AwarizonConsensus::distribute_epoch_rewards(1));

        // Yield reserve decreased by exactly one day's emission.
        assert_eq!(
            YieldReserveRemaining::<Test>::get(),
            YIELD_RESERVE_TOTAL - YIELD_RESERVE_DAILY_EMISSION
        );

        // Validator earned self-stake share + commission on the delegator pool.
        let info = Validators::<Test>::get(V1).unwrap();
        assert!(info.pending_validator_reward > 0, "validator should have a pending reward");

        // Delegator earned its share, net of commission.
        let delegator_reward = PendingDelegatorRewards::<Test>::get(V2, V1);
        assert!(delegator_reward > 0, "delegator should have a pending reward");

        assert!(matches!(
            last_event(),
            RuntimeEvent::AwarizonConsensus(Event::RewardsDistributed { epoch: 1, .. })
        ));
        assert!(EpochRewardHistory::<Test>::get(1).is_some());

        // Claims actually move real currency out of the fee pool escrow.
        let v1_balance_before = Balances::free_balance(V1);
        assert_ok!(AwarizonConsensus::claim_validator_reward(RuntimeOrigin::signed(V1)));
        assert_eq!(Balances::free_balance(V1), v1_balance_before + info.pending_validator_reward);
        assert_eq!(Validators::<Test>::get(V1).unwrap().pending_validator_reward, 0);

        let v2_balance_before = Balances::free_balance(V2);
        assert_ok!(AwarizonConsensus::claim_delegation_reward(RuntimeOrigin::signed(V2), V1));
        assert_eq!(Balances::free_balance(V2), v2_balance_before + delegator_reward);
        assert_eq!(PendingDelegatorRewards::<Test>::get(V2, V1), 0);
    });
}

#[test]
fn claim_all_delegation_rewards_clears_every_validator() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonConsensus::register_validator(
            RuntimeOrigin::signed(V1),
            STAKE,
            REGION_NA,
            COUNTRY_US,
        ));
        Balances::make_free_balance_be(&fee_pool_account(), 1_000_000u128);
        crate::pallet::PendingDelegatorRewards::<Test>::insert(V2, V1, 100u128);

        let before = Balances::free_balance(V2);
        assert_ok!(AwarizonConsensus::claim_all_delegation_rewards(RuntimeOrigin::signed(V2)));
        assert_eq!(Balances::free_balance(V2), before + 100);
        assert_eq!(PendingDelegatorRewards::<Test>::iter_prefix(V2).count(), 0);
    });
}

#[test]
fn report_offline_slashes_and_funds_insurance_pool() {
    new_test_ext().execute_with(|| {
        System::set_block_number(1); // events aren't recorded at block 0
        // Large enough stakes that the 1% slash and the insurance payout's
        // "10% of pool" cap don't floor to zero under integer division.
        assert_ok!(AwarizonConsensus::register_validator(
            RuntimeOrigin::signed(V1),
            1_000_000,
            REGION_NA,
            COUNTRY_US,
        ));
        assert_ok!(AwarizonConsensus::delegate_stake(RuntimeOrigin::signed(V2), V1, 500_000));

        assert_noop!(
            AwarizonConsensus::report_offline(RuntimeOrigin::signed(V3), V1, 50),
            Error::<Test>::InsufficientEvidence
        );

        assert_ok!(AwarizonConsensus::report_offline(RuntimeOrigin::signed(V3), V1, 100));

        let info = Validators::<Test>::get(V1).unwrap();
        assert_eq!(info.slash_count, 1);
        assert!(info.is_active, "1% offline slash should not deactivate");
        assert!(InsurancePoolBalance::<Test>::get() > 0);
        assert!(Balances::free_balance(insurance_account()) > 0);

        assert!(matches!(
            last_event(),
            RuntimeEvent::AwarizonConsensus(Event::MisbehaviorSlashed {
                reason: SlashReason::Offline,
                ..
            })
        ));

        // Delegator can now claim pro-rata compensation from the insurance pool.
        let before = Balances::free_balance(V2);
        assert_ok!(AwarizonConsensus::claim_slash_compensation(RuntimeOrigin::signed(V2), V1));
        assert!(Balances::free_balance(V2) > before);
    });
}

#[test]
fn report_double_sign_requires_root_and_deactivates() {
    new_test_ext().execute_with(|| {
        System::set_block_number(1); // events aren't recorded at block 0
        assert_ok!(AwarizonConsensus::register_validator(
            RuntimeOrigin::signed(V1),
            STAKE,
            REGION_NA,
            COUNTRY_US,
        ));
        assert_noop!(
            AwarizonConsensus::report_double_sign(RuntimeOrigin::signed(V2), V1),
            frame_support::error::BadOrigin
        );
        assert_ok!(AwarizonConsensus::report_double_sign(RuntimeOrigin::root(), V1));
        assert!(!Validators::<Test>::get(V1).unwrap().is_active);
        assert!(matches!(
            last_event(),
            RuntimeEvent::AwarizonConsensus(Event::MisbehaviorSlashed {
                reason: SlashReason::DoubleSign,
                ..
            })
        ));
    });
}

#[test]
fn three_layer_distribution_works() {
    new_test_ext().execute_with(|| {
        System::set_block_number(1); // events aren't recorded at block 0

        let v1_stake = 100_000u128;
        let v3_stake = 100_000u128;
        let delegation_amt = 500u128;

        // V1 registers normally (total=0 -> 1 always clears the geography cap).
        assert_ok!(AwarizonConsensus::register_validator(
            RuntimeOrigin::signed(V1),
            v1_stake,
            REGION_NA,
            COUNTRY_US,
        ));
        assert_ok!(AwarizonConsensus::delegate_stake(RuntimeOrigin::signed(V2), V1, delegation_amt));

        // V3 is inserted directly as a second active validator with a lower
        // uptime score, rather than through register_validator, since region/
        // country assignment is orthogonal to what this test checks:
        // distribute_epoch_rewards only reads `Validators::iter()` filtered
        // by `is_active`, not the capped ActiveValidators set, so a direct
        // insert exercises the exact same code path.
        Validators::<Test>::insert(V3, ValidatorInfo {
            account: V3,
            self_stake: v3_stake,
            delegated_stake: 0,
            region_code: REGION_EU,
            country_code: COUNTRY_DE,
            uptime_bps: 5_000, // half of V1's default 10_000
            finality_bps: 10_000,
            blocks_bps: 10_000,
            slash_count: 0,
            is_active: true,
            epoch_registered: 0,
            commission: 10,
            pending_validator_reward: 0,
        });

        let fee_amt = 10_000u128;
        Balances::make_free_balance_be(&fee_pool_account(), fee_amt);
        AwarizonConsensus::deposit_fee(fee_amt);
        Balances::make_free_balance_be(&yield_reserve_account(), YIELD_RESERVE_TOTAL);
        YieldReserveRemaining::<Test>::put(YIELD_RESERVE_TOTAL);

        assert_ok!(AwarizonConsensus::distribute_epoch_rewards(1));

        // ── Reference computation mirroring distribute_epoch_rewards ──
        let yield_emission = YIELD_RESERVE_DAILY_EMISSION.min(YIELD_RESERVE_TOTAL);
        let total_pool = fee_amt + yield_emission;
        let staking_pool = total_pool * FEE_SPLIT_STAKING_PCT as u128 / 100;
        let base_pool = staking_pool * BASE_REWARD_PCT as u128 / 100;
        let perf_pool = staking_pool * PERF_REWARD_PCT as u128 / 100;
        let stake_pool = staking_pool - base_pool - perf_pool;

        let active_count = 2u128;
        let base_per_validator = base_pool / active_count;
        let perf_max_per_validator = perf_pool / active_count;

        let v1_total_stake = v1_stake + delegation_amt;
        let v3_total_stake = v3_stake;
        let total_active_stake = v1_total_stake + v3_total_stake;

        let v1_perf_bonus = perf_max_per_validator * 10_000 / BPS_DENOMINATOR;
        let v3_perf_bonus = perf_max_per_validator * 5_000 / BPS_DENOMINATOR;
        assert!(v1_perf_bonus > v3_perf_bonus, "higher uptime must earn a bigger performance bonus");
        assert_eq!(v1_perf_bonus, 2 * v3_perf_bonus, "perf bonus scales linearly with uptime_bps");

        let v1_stake_pool = stake_pool * v1_total_stake / total_active_stake;
        let v1_self_portion = v1_stake_pool * v1_stake / v1_total_stake;
        let v1_delegator_pool = v1_stake_pool - v1_self_portion;
        let v1_commission = v1_delegator_pool * 10 / 100; // default commission = 10%
        let v1_delegator_distributable = v1_delegator_pool - v1_commission;

        let v3_stake_pool = stake_pool * v3_total_stake / total_active_stake;
        // V3 has no delegated stake, so its entire stake-pool share is self_portion.
        let v3_self_portion = v3_stake_pool;

        let expected_v1 = base_per_validator + v1_perf_bonus + v1_self_portion + v1_commission;
        let expected_v3 = base_per_validator + v3_perf_bonus + v3_self_portion;

        let info_v1 = Validators::<Test>::get(V1).unwrap();
        let info_v3 = Validators::<Test>::get(V3).unwrap();
        assert_eq!(info_v1.pending_validator_reward, expected_v1);
        assert_eq!(info_v3.pending_validator_reward, expected_v3);

        // Base layer alone is identical for both validators (same input,
        // `base_per_validator`, feeds both expected totals above) — the only
        // reason V1 and V3 end up with different totals is layers 2 and 3.
        assert_eq!(base_per_validator, base_pool / active_count);

        assert_eq!(PendingDelegatorRewards::<Test>::get(V2, V1), v1_delegator_distributable);
        assert!(PendingDelegatorRewards::<Test>::get(V2, V1) > 0);

        assert!(matches!(
            last_event(),
            RuntimeEvent::AwarizonConsensus(Event::RewardsDistributed { epoch: 1, .. })
        ));
    });
}

#[test]
fn active_validators_bounded_vec_caps_at_21() {
    // ActiveValidators/EpochValidatorRankings/the `selected` local in
    // run_epoch_election all share BoundedVec<AccountId, ConstU32<21>>.
    // Fast, deterministic proof that the bound itself truncates correctly,
    // independent of geography-cap mechanics (see
    // run_epoch_election_caps_active_set_at_21 for the end-to-end version
    // through real registrations).
    let twenty_one: Vec<u64> = (1..=21).collect();
    let ok: frame_support::BoundedVec<u64, frame_support::traits::ConstU32<21>> =
        twenty_one.try_into().expect("21 elements must fit");
    assert_eq!(ok.len(), 21);

    let twenty_two: Vec<u64> = (1..=22).collect();
    let rejected: Result<frame_support::BoundedVec<u64, frame_support::traits::ConstU32<21>>, _> =
        twenty_two.try_into();
    assert!(rejected.is_err(), "22 elements must not fit a ConstU32<21> bound");
}

#[test]
fn run_epoch_election_caps_active_set_at_21() {
    new_test_ext().execute_with(|| {
        // 25 candidates spread across 9 regions (max 3 each) and 13
        // countries (max 2 each) — comfortably within
        // MIN_VALIDATORS_PER_REGION/COUNTRY, so every one clears the
        // geography check regardless of selection order. The only thing
        // left to cap the active set is the BoundedVec<_, ConstU32<21>>
        // bound itself.
        for i in 0..25u64 {
            let acct = 100 + i;
            Balances::make_free_balance_be(&acct, 10_000u128);
            let region = (i % 9) as u8 + 1;
            let country = (i % 13) as u8 + 1;
            assert_ok!(AwarizonConsensus::register_validator(
                RuntimeOrigin::signed(acct),
                STAKE,
                region,
                country,
            ));
        }
        assert_eq!(TotalValidatorCount::<Test>::get(), 25);

        assert_ok!(AwarizonConsensus::run_epoch_election(RuntimeOrigin::signed(V1), 1));
        let active = ActiveValidators::<Test>::get();
        assert_eq!(active.len(), 21, "active set must be capped at MAX_ACTIVE_VALIDATORS");
    });
}

#[test]
fn init_yield_reserve_requires_root() {
    new_test_ext().execute_with(|| {
        assert_noop!(
            AwarizonConsensus::init_yield_reserve(RuntimeOrigin::signed(V1)),
            frame_support::error::BadOrigin
        );
        assert_ok!(AwarizonConsensus::init_yield_reserve(RuntimeOrigin::root()));
        assert_eq!(YieldReserveRemaining::<Test>::get(), YIELD_RESERVE_TOTAL);
    });
}

// ================================================================
// Reward destination (Validator-as-a-Service)
// ================================================================

#[test]
fn set_reward_destination_requires_registered_validator() {
    new_test_ext().execute_with(|| {
        assert_noop!(
            AwarizonConsensus::set_reward_destination(RuntimeOrigin::signed(V1), V2),
            Error::<Test>::NotAValidator
        );
        assert_noop!(
            AwarizonConsensus::clear_reward_destination(RuntimeOrigin::signed(V1)),
            Error::<Test>::NotAValidator
        );
    });
}

#[test]
fn claim_validator_reward_routes_to_destination_when_set() {
    // Genesis only seeds accounts 1-5 (see mock::new_test_ext) — deliberately
    // outside that range so the assertion below actually proves the
    // destination-routed transfer works for a wallet that never held a
    // balance before, not just one that already happened to have funds.
    const CUSTOMER: u64 = 500_000;

    new_test_ext().execute_with(|| {
        System::set_block_number(1); // events aren't recorded at block 0
        assert_ok!(AwarizonConsensus::register_validator(
            RuntimeOrigin::signed(V1),
            STAKE,
            REGION_NA,
            COUNTRY_US,
        ));
        Balances::make_free_balance_be(&fee_pool_account(), 1_000_000u128);
        Validators::<Test>::mutate(V1, |maybe| {
            maybe.as_mut().unwrap().pending_validator_reward = 500u128;
        });

        assert_eq!(Balances::free_balance(CUSTOMER), 0);

        assert_ok!(AwarizonConsensus::set_reward_destination(RuntimeOrigin::signed(V1), CUSTOMER));
        assert!(matches!(
            last_event(),
            RuntimeEvent::AwarizonConsensus(Event::RewardDestinationSet {
                validator: V1,
                destination: CUSTOMER,
            })
        ));
        assert_eq!(ValidatorRewardDestination::<Test>::get(V1), Some(CUSTOMER));

        let v1_before = Balances::free_balance(V1);
        assert_ok!(AwarizonConsensus::claim_validator_reward(RuntimeOrigin::signed(V1)));

        // Reward landed at the destination, not the validator.
        assert_eq!(Balances::free_balance(CUSTOMER), 500);
        assert_eq!(Balances::free_balance(V1), v1_before);
        assert_eq!(Validators::<Test>::get(V1).unwrap().pending_validator_reward, 0);
        assert!(matches!(
            last_event(),
            RuntimeEvent::AwarizonConsensus(Event::ValidatorRewardClaimed {
                validator: V1,
                amount: 500,
            })
        ));

        // Clearing restores self-payout for the next claim.
        assert_ok!(AwarizonConsensus::clear_reward_destination(RuntimeOrigin::signed(V1)));
        assert!(matches!(
            last_event(),
            RuntimeEvent::AwarizonConsensus(Event::RewardDestinationCleared { validator: V1 })
        ));
        assert_eq!(ValidatorRewardDestination::<Test>::get(V1), None);

        Validators::<Test>::mutate(V1, |maybe| {
            maybe.as_mut().unwrap().pending_validator_reward = 200u128;
        });
        let v1_before = Balances::free_balance(V1);
        assert_ok!(AwarizonConsensus::claim_validator_reward(RuntimeOrigin::signed(V1)));
        assert_eq!(Balances::free_balance(V1), v1_before + 200);
        // Destination account received nothing further from this second claim.
        assert_eq!(Balances::free_balance(CUSTOMER), 500);
    });
}

#[test]
fn claim_validator_reward_without_destination_still_pays_self() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonConsensus::register_validator(
            RuntimeOrigin::signed(V1),
            STAKE,
            REGION_NA,
            COUNTRY_US,
        ));
        Balances::make_free_balance_be(&fee_pool_account(), 1_000_000u128);
        Validators::<Test>::mutate(V1, |maybe| {
            maybe.as_mut().unwrap().pending_validator_reward = 300u128;
        });

        let before = Balances::free_balance(V1);
        assert_ok!(AwarizonConsensus::claim_validator_reward(RuntimeOrigin::signed(V1)));
        assert_eq!(Balances::free_balance(V1), before + 300);
    });
}
