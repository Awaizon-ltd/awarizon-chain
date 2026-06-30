use crate::geography::GeographyEnforcer;
use crate::mock::*;
use crate::pallet::{
    ActiveValidators, ConsensusEpoch, Delegations, Error, TotalValidatorCount, ValidatorDelegatedStake,
    Validators,
};
use crate::performance::PerformanceCalculator;
use frame_support::{assert_noop, assert_ok};

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
fn geography_region_cap_blocks_at_total_one() {
    // After 1 validator selected, adding any validator from a new region gives ratio 1/2 = 50% > 20%
    assert!(!GeographyEnforcer::check_region_cap(1, 0));
    // Same region also blocked
    assert!(!GeographyEnforcer::check_region_cap(1, 1));
}

#[test]
fn geography_first_validator_passes_country_cap() {
    assert!(GeographyEnforcer::check_country_cap(0, 0));
}

#[test]
fn geography_country_cap_blocks_at_total_one() {
    // 1/2 = 50% > 10%
    assert!(!GeographyEnforcer::check_country_cap(1, 0));
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
