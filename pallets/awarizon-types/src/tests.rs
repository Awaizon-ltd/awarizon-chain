use super::*;

// ---- AppCategory --------------------------------------------------------

#[test]
fn app_category_to_id_all_variants() {
    assert_eq!(AppCategory::DeFi.to_id(), 0x01);
    assert_eq!(AppCategory::Gaming.to_id(), 0x02);
    assert_eq!(AppCategory::Social.to_id(), 0x03);
    assert_eq!(AppCategory::Productivity.to_id(), 0x04);
    assert_eq!(AppCategory::Infrastructure.to_id(), 0x05);
    assert_eq!(AppCategory::DigitalAssets.to_id(), 0x06);
    assert_eq!(AppCategory::DeveloperTools.to_id(), 0x07);
    assert_eq!(AppCategory::Education.to_id(), 0x08);
}

#[test]
fn app_category_from_id_all_valid() {
    assert_eq!(AppCategory::from_id(0x01), Some(AppCategory::DeFi));
    assert_eq!(AppCategory::from_id(0x02), Some(AppCategory::Gaming));
    assert_eq!(AppCategory::from_id(0x03), Some(AppCategory::Social));
    assert_eq!(AppCategory::from_id(0x04), Some(AppCategory::Productivity));
    assert_eq!(AppCategory::from_id(0x05), Some(AppCategory::Infrastructure));
    assert_eq!(AppCategory::from_id(0x06), Some(AppCategory::DigitalAssets));
    assert_eq!(AppCategory::from_id(0x07), Some(AppCategory::DeveloperTools));
    assert_eq!(AppCategory::from_id(0x08), Some(AppCategory::Education));
}

#[test]
fn app_category_from_id_invalid_returns_none() {
    assert_eq!(AppCategory::from_id(0x09), None);
    assert_eq!(AppCategory::from_id(0x00), None);
    assert_eq!(AppCategory::from_id(0xFF), None);
}

// ---- TargetingCriteria --------------------------------------------------

fn empty_criteria() -> TargetingCriteria {
    TargetingCriteria {
        wallet_age_min: None,
        wallet_age_max: None,
        riz_balance_min: None,
        riz_balance_max: None,
        activity_min: None,
        activity_max: None,
        region_codes: BoundedVec::new(),
        category_history: BoundedVec::new(),
        custom_logic_hash: None,
    }
}

#[test]
fn targeting_criteria_dimension_count_zero_when_empty() {
    assert_eq!(empty_criteria().dimension_count(), 0);
}

#[test]
fn targeting_criteria_dimension_count_each_dimension() {
    // wallet age
    let mut c = empty_criteria();
    c.wallet_age_min = Some(30);
    assert_eq!(c.dimension_count(), 1);

    // balance
    let mut c = empty_criteria();
    c.riz_balance_min = Some(1_000_000);
    assert_eq!(c.dimension_count(), 1);

    // activity
    let mut c = empty_criteria();
    c.activity_max = Some(100);
    assert_eq!(c.dimension_count(), 1);

    // category history
    let mut c = empty_criteria();
    c.category_history = BoundedVec::try_from(vec![AppCategory::Gaming]).unwrap();
    assert_eq!(c.dimension_count(), 1);

    // region codes
    let mut c = empty_criteria();
    c.region_codes = BoundedVec::try_from(vec![1u8, 2u8]).unwrap();
    assert_eq!(c.dimension_count(), 1);

    // custom logic
    let mut c = empty_criteria();
    c.custom_logic_hash = Some([0u8; 32]);
    assert_eq!(c.dimension_count(), 1);

    // all six dimensions
    let mut c = empty_criteria();
    c.wallet_age_min = Some(10);
    c.riz_balance_min = Some(500);
    c.activity_min = Some(1);
    c.category_history = BoundedVec::try_from(vec![AppCategory::DeFi]).unwrap();
    c.region_codes = BoundedVec::try_from(vec![1u8]).unwrap();
    c.custom_logic_hash = Some([1u8; 32]);
    assert_eq!(c.dimension_count(), 6);
}

#[test]
fn targeting_criteria_matches_all_regions_when_empty() {
    assert!(empty_criteria().matches_all_regions());
}

#[test]
fn targeting_criteria_does_not_match_all_regions_when_set() {
    let mut c = empty_criteria();
    c.region_codes = BoundedVec::try_from(vec![42u8]).unwrap();
    assert!(!c.matches_all_regions());
}

// ---- EngagementEvent ----------------------------------------------------

fn make_event(session_secs: u32, interactions: u32) -> EngagementEvent<u32, u32> {
    EngagementEvent {
        wallet: 1u32,
        record_id: [0u8; 32],
        session_duration_seconds: session_secs,
        interaction_count: interactions,
        submitted_at: 0u32,
    }
}

#[test]
fn engagement_event_is_valid_when_meets_minimums() {
    assert!(make_event(MIN_SESSION_SECONDS, MIN_INTERACTIONS).is_valid());
    assert!(make_event(300, 10).is_valid());
}

#[test]
fn engagement_event_invalid_when_session_too_short() {
    assert!(!make_event(MIN_SESSION_SECONDS - 1, MIN_INTERACTIONS).is_valid());
}

#[test]
fn engagement_event_invalid_when_too_few_interactions() {
    assert!(!make_event(MIN_SESSION_SECONDS, MIN_INTERACTIONS - 1).is_valid());
}

// ---- ValidatorPerformance -----------------------------------------------

fn perfect_validator() -> ValidatorPerformance<u32> {
    ValidatorPerformance {
        validator: 1u32,
        uptime_bps: 10_000,
        finality_score_bps: 10_000,
        blocks_produced_bps: 10_000,
        slash_history_bps: 10_000,
        effective_stake: 1_000_000,
        delegated_stake: 0,
    }
}

fn zero_validator() -> ValidatorPerformance<u32> {
    ValidatorPerformance {
        validator: 1u32,
        uptime_bps: 0,
        finality_score_bps: 0,
        blocks_produced_bps: 0,
        slash_history_bps: 0,
        effective_stake: 0,
        delegated_stake: 0,
    }
}

#[test]
fn validator_performance_score_does_not_exceed_10000() {
    assert!(perfect_validator().performance_score_bps() <= 10_000);
    assert!(zero_validator().performance_score_bps() <= 10_000);
}

#[test]
fn validator_performance_score_perfect_equals_10000() {
    assert_eq!(perfect_validator().performance_score_bps(), 10_000);
}

#[test]
fn validator_performance_score_zero_equals_zero() {
    assert_eq!(zero_validator().performance_score_bps(), 0);
}

#[test]
fn validator_multiplier_stays_in_range() {
    let min = PERF_MULTIPLIER_MIN_BPS;
    let max = PERF_MULTIPLIER_MAX_BPS;

    let perfect = perfect_validator().performance_multiplier_bps();
    assert!(perfect >= min && perfect <= max, "perfect={perfect}");

    let zero = zero_validator().performance_multiplier_bps();
    assert!(zero >= min && zero <= max, "zero={zero}");
}

#[test]
fn validator_multiplier_perfect_equals_max() {
    assert_eq!(perfect_validator().performance_multiplier_bps(), PERF_MULTIPLIER_MAX_BPS);
}

#[test]
fn validator_multiplier_zero_equals_min() {
    assert_eq!(zero_validator().performance_multiplier_bps(), PERF_MULTIPLIER_MIN_BPS);
}

// ---- Constants ----------------------------------------------------------

#[test]
fn inbox_state_reserve_spells_inboxx() {
    assert_eq!(INBOX_STATE_RESERVE[0], b'I');
    assert_eq!(INBOX_STATE_RESERVE[1], b'N');
    assert_eq!(INBOX_STATE_RESERVE[2], b'B');
    assert_eq!(INBOX_STATE_RESERVE[3], b'O');
    assert_eq!(INBOX_STATE_RESERVE[4], b'X');
    assert_eq!(INBOX_STATE_RESERVE[5], b'X');
    // remaining bytes must be zero
    assert!(INBOX_STATE_RESERVE[6..].iter().all(|&b| b == 0));
}

#[test]
fn riz_constant_equals_one_trillion_planck() {
    assert_eq!(RIZ, 1_000_000_000_000u128);
}

#[test]
fn micro_riz_equals_one_million_planck() {
    assert_eq!(MICRO_RIZ, 1_000_000u128);
}
