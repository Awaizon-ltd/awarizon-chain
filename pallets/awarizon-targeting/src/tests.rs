use crate::mock::*;
use crate::pallet::{CampaignBloomFilters, TargetingMatchCache};
use crate::{bloom::BloomFilter, matcher::TargetingMatcher};
use frame_support::{assert_noop, assert_ok, BoundedVec};
use pallet_awarizon_types::{
    AppCategory, AppManifest, Campaign, CampaignStatus, DeveloperProfile, DeveloperStatus,
    InboxRecord, InboxRecordStatus, TargetingCriteria,
};

type AccountId = u64;
type BlockNumber = u64;

// ================================================================
// HELPERS
// ================================================================

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

fn insert_test_campaign(campaign_id: [u8; 32], targeting: TargetingCriteria) {
    let campaign = Campaign {
        campaign_id,
        developer: 1u64,
        manifest_hash: [1u8; 32],
        targeting,
        status: CampaignStatus::Active,
        created_at: 0u64,
        expires_at: 100_000u64,
        max_deliveries: 1000,
        current_deliveries: 0,
        storage_fee_paid: 0,
    };
    pallet_awarizon_state::Campaigns::<Test>::insert(campaign_id, campaign);
}

// ================================================================
// BLOOM FILTER UNIT TESTS
// ================================================================

#[test]
fn bloom_new_is_all_zeros() {
    let filter = BloomFilter::new();
    assert!(filter.as_bytes().iter().all(|&b| b == 0));
}

#[test]
fn bloom_add_sets_bits() {
    let mut filter = BloomFilter::new();
    filter.add(b"hello");
    assert!(!filter.as_bytes().iter().all(|&b| b == 0));
}

#[test]
fn bloom_might_contain_true_for_added_item() {
    let mut filter = BloomFilter::new();
    filter.add(b"awarizon");
    assert!(filter.might_contain(b"awarizon"));
}

#[test]
fn bloom_might_contain_false_for_never_added_item() {
    let filter = BloomFilter::new();
    // Empty filter: no bits set, so any lookup will find a missing bit
    assert!(!filter.might_contain(b"definitely_not_in_filter_xyz_999"));
}

#[test]
fn bloom_from_targeting_criteria_non_empty_when_criteria_set() {
    let criteria = TargetingCriteria {
        wallet_age_min: Some(30u32),
        wallet_age_max: Some(3650u32),
        riz_balance_min: None,
        riz_balance_max: None,
        activity_min: Some(5u32),
        activity_max: None,
        region_codes: BoundedVec::try_from(vec![1u8, 2u8]).unwrap(),
        category_history: BoundedVec::new(),
        custom_logic_hash: None,
    };
    let filter = BloomFilter::from_targeting_criteria(&criteria);
    assert!(!filter.as_bytes().iter().all(|&b| b == 0));
}

#[test]
fn bloom_from_empty_criteria_stays_all_zeros() {
    let filter = BloomFilter::from_targeting_criteria(&empty_criteria());
    assert!(filter.as_bytes().iter().all(|&b| b == 0));
}

// ================================================================
// TARGETING MATCHER UNIT TESTS
// ================================================================

#[test]
fn matcher_matches_when_all_criteria_none() {
    let criteria = empty_criteria();
    assert!(TargetingMatcher::matches_precisely(
        &criteria, 100, 50, &[0x01, 0x02], 5, 1_000_000
    ));
}

#[test]
fn matcher_fails_when_age_below_min() {
    let criteria = TargetingCriteria { wallet_age_min: Some(365), ..empty_criteria() };
    assert!(!TargetingMatcher::matches_precisely(
        &criteria, 100, 50, &[], 0, 0
    ));
}

#[test]
fn matcher_fails_when_age_above_max() {
    let criteria = TargetingCriteria { wallet_age_max: Some(365), ..empty_criteria() };
    assert!(!TargetingMatcher::matches_precisely(
        &criteria, 1000, 50, &[], 0, 0
    ));
}

#[test]
fn matcher_fails_when_balance_below_min() {
    let criteria = TargetingCriteria {
        riz_balance_min: Some(1_000_000_000_000u128),
        ..empty_criteria()
    };
    assert!(!TargetingMatcher::matches_precisely(
        &criteria, 100, 50, &[], 0, 500_000_000_000u128
    ));
}

#[test]
fn matcher_fails_when_region_not_in_list() {
    let criteria = TargetingCriteria {
        region_codes: BoundedVec::try_from(vec![1u8, 2u8]).unwrap(),
        ..empty_criteria()
    };
    assert!(!TargetingMatcher::matches_precisely(
        &criteria, 100, 50, &[], 99, 0
    ));
}

#[test]
fn matcher_passes_when_region_list_is_empty() {
    let criteria = empty_criteria(); // region_codes is empty — all regions pass
    assert!(TargetingMatcher::matches_precisely(
        &criteria, 100, 50, &[], 42, 0
    ));
}

#[test]
fn matcher_fails_when_no_matching_category() {
    let criteria = TargetingCriteria {
        category_history: BoundedVec::try_from(vec![AppCategory::DeFi]).unwrap(),
        ..empty_criteria()
    };
    // Wallet history contains Gaming (0x02) but criteria requires DeFi (0x01)
    assert!(!TargetingMatcher::matches_precisely(
        &criteria, 100, 50, &[AppCategory::Gaming.to_id()], 0, 0
    ));
}

#[test]
fn matcher_passes_when_category_history_is_empty() {
    let criteria = empty_criteria(); // category_history empty — no filter
    assert!(TargetingMatcher::matches_precisely(
        &criteria, 100, 50, &[AppCategory::Gaming.to_id()], 0, 0
    ));
}

#[test]
fn matcher_passes_when_wallet_meets_all_criteria() {
    let criteria = TargetingCriteria {
        wallet_age_min: Some(30),
        wallet_age_max: Some(3650),
        riz_balance_min: Some(1_000_000_000_000u128),
        riz_balance_max: None,
        activity_min: Some(5),
        activity_max: None,
        region_codes: BoundedVec::try_from(vec![1u8]).unwrap(),
        category_history: BoundedVec::try_from(vec![AppCategory::Gaming]).unwrap(),
        custom_logic_hash: None,
    };
    assert!(TargetingMatcher::matches_precisely(
        &criteria,
        365,   // age = 365 days, within [30, 3650]
        10,    // activity = 10, meets min 5
        &[AppCategory::Gaming.to_id()], // has Gaming
        1u8,   // region 1 in allowed list
        2_000_000_000_000u128, // balance > min
    ));
}

// ================================================================
// PALLET INTEGRATION TESTS
// ================================================================

const DEV: AccountId = 1u64;
const USER: AccountId = 2u64;
const CAMPAIGN_ID: [u8; 32] = [42u8; 32];

#[test]
fn build_bloom_filter_fails_for_unknown_campaign() {
    new_test_ext().execute_with(|| {
        assert_noop!(
            AwarizonTargeting::build_bloom_filter(
                RuntimeOrigin::signed(DEV),
                [99u8; 32],
            ),
            crate::pallet::Error::<Test>::CampaignNotFound
        );
    });
}

#[test]
fn build_bloom_filter_succeeds_and_stores_bytes() {
    new_test_ext().execute_with(|| {
        insert_test_campaign(CAMPAIGN_ID, empty_criteria());
        assert_ok!(AwarizonTargeting::build_bloom_filter(
            RuntimeOrigin::signed(DEV),
            CAMPAIGN_ID,
        ));
        let stored = CampaignBloomFilters::<Test>::get(CAMPAIGN_ID);
        assert!(stored.is_some());
        assert_eq!(stored.unwrap().len(), 8192);
    });
}

#[test]
fn check_wallet_match_empty_criteria_always_matches() {
    new_test_ext().execute_with(|| {
        insert_test_campaign(CAMPAIGN_ID, empty_criteria());
        assert_ok!(AwarizonTargeting::check_wallet_match(
            RuntimeOrigin::signed(DEV),
            CAMPAIGN_ID,
            USER,
        ));
        assert!(TargetingMatchCache::<Test>::get(CAMPAIGN_ID, USER));
    });
}

#[test]
fn check_wallet_match_fails_for_unknown_campaign() {
    new_test_ext().execute_with(|| {
        assert_noop!(
            AwarizonTargeting::check_wallet_match(
                RuntimeOrigin::signed(DEV),
                [99u8; 32],
                USER,
            ),
            crate::pallet::Error::<Test>::CampaignNotFound
        );
    });
}

#[test]
fn run_targeting_batch_counts_matches_correctly() {
    new_test_ext().execute_with(|| {
        // Campaign requires wallet_age_min = 200
        let criteria = TargetingCriteria {
            wallet_age_min: Some(200),
            ..empty_criteria()
        };
        insert_test_campaign(CAMPAIGN_ID, criteria);

        // DEV has age 50 (no match), USER has age 300 (match)
        pallet_awarizon_state::WalletAgeIndex::<Test>::insert(DEV, 50u32);
        pallet_awarizon_state::WalletAgeIndex::<Test>::insert(USER, 300u32);

        let wallets: BoundedVec<AccountId, frame_support::traits::ConstU32<100>> =
            BoundedVec::try_from(vec![DEV, USER]).unwrap();

        assert_ok!(AwarizonTargeting::run_targeting_batch(
            RuntimeOrigin::signed(DEV),
            CAMPAIGN_ID,
            wallets,
        ));

        // DEV should not match, USER should match
        assert!(!TargetingMatchCache::<Test>::get(CAMPAIGN_ID, DEV));
        assert!(TargetingMatchCache::<Test>::get(CAMPAIGN_ID, USER));
    });
}

#[test]
fn run_targeting_batch_fails_with_no_candidates() {
    new_test_ext().execute_with(|| {
        insert_test_campaign(CAMPAIGN_ID, empty_criteria());
        let empty: BoundedVec<AccountId, frame_support::traits::ConstU32<100>> =
            BoundedVec::new();
        assert_noop!(
            AwarizonTargeting::run_targeting_batch(
                RuntimeOrigin::signed(DEV),
                CAMPAIGN_ID,
                empty,
            ),
            crate::pallet::Error::<Test>::NoCandidates
        );
    });
}
