use super::pallet::*;
use crate::mock::*;
use frame_support::{assert_noop, assert_ok, BoundedVec};
use pallet_awarizon_types::{
    AppCategory, AppManifest, Campaign, CampaignStatus, DeveloperProfile, DeveloperStatus,
    InboxRecord, InboxRecordStatus, TargetingCriteria,
};

// TestDefaultConfig uses u64 for AccountId and u64 for BlockNumber.
type AccountId = u64;
type BlockNumber = u64;

// ---- helpers ------------------------------------------------------------

fn empty_targeting() -> TargetingCriteria {
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

fn make_dev_profile(account: AccountId) -> DeveloperProfile<AccountId, BlockNumber> {
    DeveloperProfile {
        account,
        staked_riz: 1_000_000_000_000u128,
        status: DeveloperStatus::Verified,
        first_distribution_block: Some(1u64),
        violation_count: 0,
        total_campaigns: 0,
        total_deliveries: 0,
    }
}

fn make_manifest(developer: AccountId) -> AppManifest<AccountId, BlockNumber> {
    AppManifest {
        manifest_hash: [1u8; 32],
        developer,
        category: AppCategory::Gaming,
        registered_at: 1u64,
        metadata_uri: BoundedVec::try_from(b"ipfs://test".to_vec()).unwrap(),
    }
}

fn make_campaign(developer: AccountId) -> Campaign<AccountId, BlockNumber> {
    Campaign {
        campaign_id: [2u8; 32],
        developer,
        manifest_hash: [1u8; 32],
        targeting: empty_targeting(),
        status: CampaignStatus::Active,
        created_at: 1u64,
        expires_at: 100u64,
        max_deliveries: 1000,
        current_deliveries: 0,
        storage_fee_paid: 500_000,
    }
}

fn make_inbox_record(developer: AccountId) -> InboxRecord<AccountId, BlockNumber> {
    InboxRecord {
        record_id: [3u8; 32],
        campaign_id: [2u8; 32],
        developer,
        manifest_hash: [1u8; 32],
        category: AppCategory::Gaming,
        status: InboxRecordStatus::Delivered,
        delivered_at: 5u64,
        engaged_at: None,
        reward_claimed: false,
    }
}

// ---- DeveloperProfiles --------------------------------------------------

#[test]
fn developer_profiles_insert_and_retrieve() {
    new_test_ext().execute_with(|| {
        let dev = 1u64;
        let profile = make_dev_profile(dev);
        DeveloperProfiles::<Test>::insert(dev, profile.clone());
        let stored = DeveloperProfiles::<Test>::get(dev).expect("profile must exist");
        assert_eq!(stored, profile);
    });
}

#[test]
fn developer_profiles_missing_returns_none() {
    new_test_ext().execute_with(|| {
        assert!(DeveloperProfiles::<Test>::get(99u64).is_none());
    });
}

// ---- AppManifests -------------------------------------------------------

#[test]
fn app_manifests_insert_and_retrieve() {
    new_test_ext().execute_with(|| {
        let manifest = make_manifest(1u64);
        AppManifests::<Test>::insert([1u8; 32], manifest.clone());
        let stored = AppManifests::<Test>::get([1u8; 32]).expect("manifest must exist");
        assert_eq!(stored, manifest);
    });
}

// ---- Campaigns ----------------------------------------------------------

#[test]
fn campaigns_insert_and_retrieve() {
    new_test_ext().execute_with(|| {
        let campaign = make_campaign(1u64);
        Campaigns::<Test>::insert([2u8; 32], campaign.clone());
        let stored = Campaigns::<Test>::get([2u8; 32]).expect("campaign must exist");
        assert_eq!(stored, campaign);
    });
}

// ---- InboxRecords (DoubleMap) -------------------------------------------

#[test]
fn inbox_records_insert_and_retrieve() {
    new_test_ext().execute_with(|| {
        let wallet = 10u64;
        let record = make_inbox_record(1u64);
        InboxRecords::<Test>::insert(wallet, [3u8; 32], record.clone());
        let stored = InboxRecords::<Test>::get(wallet, [3u8; 32]).expect("record must exist");
        assert_eq!(stored, record);
    });
}

#[test]
fn inbox_records_different_wallets_isolated() {
    new_test_ext().execute_with(|| {
        let record = make_inbox_record(1u64);
        InboxRecords::<Test>::insert(10u64, [3u8; 32], record);
        assert!(InboxRecords::<Test>::get(11u64, [3u8; 32]).is_none());
    });
}

// ---- ValueQuery defaults ------------------------------------------------

#[test]
fn wallet_inbox_count_defaults_to_zero() {
    new_test_ext().execute_with(|| {
        assert_eq!(WalletInboxCount::<Test>::get(42u64), 0u32);
    });
}

#[test]
fn total_deliveries_defaults_to_zero() {
    new_test_ext().execute_with(|| {
        assert_eq!(TotalDeliveries::<Test>::get(), 0u64);
    });
}

#[test]
fn active_campaign_count_defaults_to_zero() {
    new_test_ext().execute_with(|| {
        assert_eq!(ActiveCampaignCount::<Test>::get(), 0u64);
    });
}

#[test]
fn total_staked_defaults_to_zero() {
    new_test_ext().execute_with(|| {
        assert_eq!(TotalStaked::<Test>::get(), 0u128);
    });
}

#[test]
fn current_epoch_defaults_to_zero() {
    new_test_ext().execute_with(|| {
        assert_eq!(CurrentEpoch::<Test>::get(), 0u64);
    });
}

#[test]
fn developer_stakes_defaults_to_zero_for_unknown_developer() {
    new_test_ext().execute_with(|| {
        assert_eq!(DeveloperStakes::<Test>::get(99u64), 0u128);
    });
}

// ---- WalletCategoryHistory ----------------------------------------------

#[test]
fn wallet_category_history_store_and_retrieve() {
    new_test_ext().execute_with(|| {
        let wallet = 5u64;
        let history: BoundedVec<u8, frame_support::traits::ConstU32<8>> =
            BoundedVec::try_from(vec![0x01u8, 0x02u8, 0x03u8]).unwrap();
        WalletCategoryHistory::<Test>::insert(wallet, history.clone());
        let stored = WalletCategoryHistory::<Test>::get(wallet);
        assert_eq!(stored, history);
    });
}

#[test]
fn wallet_category_history_defaults_to_empty() {
    new_test_ext().execute_with(|| {
        let history = WalletCategoryHistory::<Test>::get(99u64);
        assert!(history.is_empty());
    });
}

// ---- Epoch tracking -----------------------------------------------------

#[test]
fn epoch_values_can_be_updated() {
    new_test_ext().execute_with(|| {
        CurrentEpoch::<Test>::put(5u64);
        EpochStartBlock::<Test>::put(1500u64);
        assert_eq!(CurrentEpoch::<Test>::get(), 5u64);
        assert_eq!(EpochStartBlock::<Test>::get(), 1500u64);
    });
}

// ---- Staking ------------------------------------------------------------

#[test]
fn developer_stakes_can_be_set_and_retrieved() {
    new_test_ext().execute_with(|| {
        let dev = 7u64;
        DeveloperStakes::<Test>::insert(dev, 5_000_000_000_000u128);
        assert_eq!(DeveloperStakes::<Test>::get(dev), 5_000_000_000_000u128);
    });
}

#[test]
fn total_staked_can_be_updated() {
    new_test_ext().execute_with(|| {
        TotalStaked::<Test>::put(100_000_000_000_000u128);
        assert_eq!(TotalStaked::<Test>::get(), 100_000_000_000_000u128);
    });
}

// ================================================================
// INTEGRATION TESTS — extrinsic dispatch
// ================================================================

const DEV: AccountId = 1u64;
const USER: AccountId = 2u64;
const STAKE: u128 = 1_000_000_000_000u128; // 1 RIZ = mock threshold

fn setup_verified_developer(dev: AccountId) {
    assert_ok!(AwarizonState::register_developer(RuntimeOrigin::signed(dev)));
    assert_ok!(AwarizonState::stake_riz(RuntimeOrigin::signed(dev), STAKE));
}

fn setup_manifest(dev: AccountId, hash: [u8; 32]) {
    let uri = BoundedVec::truncate_from(b"ipfs://test".to_vec());
    assert_ok!(AwarizonState::register_manifest(
        RuntimeOrigin::signed(dev),
        hash,
        AppCategory::Gaming,
        uri,
    ));
}

fn setup_campaign(dev: AccountId, campaign_id: [u8; 32], manifest_hash: [u8; 32]) {
    assert_ok!(AwarizonState::create_campaign(
        RuntimeOrigin::signed(dev),
        campaign_id,
        manifest_hash,
        empty_targeting(),
        1u32,
        1000u64,
    ));
}

// ---- register_developer -------------------------------------------------

#[test]
fn register_developer_works() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonState::register_developer(RuntimeOrigin::signed(DEV)));
        let profile = DeveloperProfiles::<Test>::get(DEV).expect("profile must exist");
        assert_eq!(profile.account, DEV);
        assert_eq!(profile.status, DeveloperStatus::Unverified);
        assert_eq!(profile.staked_riz, 0u128);
    });
}

#[test]
fn register_developer_fails_if_duplicate() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonState::register_developer(RuntimeOrigin::signed(DEV)));
        assert_noop!(
            AwarizonState::register_developer(RuntimeOrigin::signed(DEV)),
            Error::<Test>::DeveloperAlreadyRegistered
        );
    });
}

// ---- stake_riz ----------------------------------------------------------

#[test]
fn stake_riz_auto_verifies_at_threshold() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonState::register_developer(RuntimeOrigin::signed(DEV)));
        assert_ok!(AwarizonState::stake_riz(RuntimeOrigin::signed(DEV), STAKE));
        let profile = DeveloperProfiles::<Test>::get(DEV).expect("profile must exist");
        assert_eq!(profile.status, DeveloperStatus::Verified);
        assert_eq!(profile.staked_riz, STAKE);
        assert_eq!(DeveloperStakes::<Test>::get(DEV), STAKE);
        assert_eq!(TotalStaked::<Test>::get(), STAKE);
    });
}

#[test]
fn stake_riz_fails_if_not_registered() {
    new_test_ext().execute_with(|| {
        assert_noop!(
            AwarizonState::stake_riz(RuntimeOrigin::signed(DEV), STAKE),
            Error::<Test>::DeveloperNotFound
        );
    });
}

// ---- register_manifest --------------------------------------------------

#[test]
fn register_manifest_works() {
    new_test_ext().execute_with(|| {
        let hash = [10u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, hash);
        assert!(AppManifests::<Test>::get(hash).is_some());
        assert_eq!(DeveloperManifests::<Test>::get(DEV).len(), 1);
    });
}

#[test]
fn register_manifest_fails_if_not_verified() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonState::register_developer(RuntimeOrigin::signed(DEV)));
        let uri = BoundedVec::truncate_from(b"ipfs://test".to_vec());
        assert_noop!(
            AwarizonState::register_manifest(
                RuntimeOrigin::signed(DEV),
                [10u8; 32],
                AppCategory::Gaming,
                uri,
            ),
            Error::<Test>::DeveloperNotVerified
        );
    });
}

#[test]
fn register_manifest_fails_if_duplicate() {
    new_test_ext().execute_with(|| {
        let hash = [10u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, hash);
        let uri = BoundedVec::truncate_from(b"ipfs://test".to_vec());
        assert_noop!(
            AwarizonState::register_manifest(
                RuntimeOrigin::signed(DEV),
                hash,
                AppCategory::Gaming,
                uri,
            ),
            Error::<Test>::ManifestAlreadyRegistered
        );
    });
}

// ---- create_campaign ----------------------------------------------------

#[test]
fn create_campaign_works() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        let campaign = Campaigns::<Test>::get(campaign_id).expect("campaign must exist");
        assert_eq!(campaign.developer, DEV);
        assert_eq!(campaign.status, CampaignStatus::Active);
        assert_eq!(ActiveCampaignCount::<Test>::get(), 1u64);
        assert_eq!(DeveloperProfiles::<Test>::get(DEV).unwrap().total_campaigns, 1u32);
    });
}

#[test]
fn create_campaign_fails_if_not_verified() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonState::register_developer(RuntimeOrigin::signed(DEV)));
        assert_noop!(
            AwarizonState::create_campaign(
                RuntimeOrigin::signed(DEV),
                [20u8; 32],
                [10u8; 32],
                empty_targeting(),
                1u32,
                1000u64,
            ),
            Error::<Test>::DeveloperNotVerified
        );
    });
}

// ---- deliver_to_inbox ---------------------------------------------------

#[test]
fn deliver_to_inbox_works() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        let record_id = [30u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        assert_ok!(AwarizonState::deliver_to_inbox(
            RuntimeOrigin::signed(DEV),
            USER,
            campaign_id,
            record_id,
        ));
        let record = InboxRecords::<Test>::get(USER, record_id).expect("record must exist");
        assert_eq!(record.status, InboxRecordStatus::Delivered);
        assert_eq!(WalletInboxCount::<Test>::get(USER), 1u32);
        assert_eq!(TotalDeliveries::<Test>::get(), 1u64);
    });
}

#[test]
fn deliver_to_inbox_fails_if_campaign_terminated() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        assert_ok!(AwarizonState::terminate_campaign(
            RuntimeOrigin::signed(DEV),
            campaign_id,
        ));
        assert_noop!(
            AwarizonState::deliver_to_inbox(
                RuntimeOrigin::signed(DEV),
                USER,
                campaign_id,
                [30u8; 32],
            ),
            Error::<Test>::CampaignNotActive
        );
    });
}

// ---- terminate_campaign -------------------------------------------------

#[test]
fn terminate_campaign_works() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        assert_ok!(AwarizonState::terminate_campaign(
            RuntimeOrigin::signed(DEV),
            campaign_id,
        ));
        let campaign = Campaigns::<Test>::get(campaign_id).expect("campaign must exist");
        assert_eq!(campaign.status, CampaignStatus::Terminated);
        assert_eq!(ActiveCampaignCount::<Test>::get(), 0u64);
    });
}

#[test]
fn terminate_campaign_fails_if_unauthorized() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        assert_noop!(
            AwarizonState::terminate_campaign(RuntimeOrigin::signed(USER), campaign_id),
            Error::<Test>::Unauthorized
        );
    });
}

// ---- dismiss_inbox_record -----------------------------------------------

#[test]
fn dismiss_inbox_record_works() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        let record_id = [30u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        assert_ok!(AwarizonState::deliver_to_inbox(
            RuntimeOrigin::signed(DEV),
            USER,
            campaign_id,
            record_id,
        ));
        assert_ok!(AwarizonState::dismiss_inbox_record(
            RuntimeOrigin::signed(USER),
            record_id,
        ));
        let record = InboxRecords::<Test>::get(USER, record_id).expect("record must exist");
        assert_eq!(record.status, InboxRecordStatus::Dismissed);
        assert_eq!(WalletInboxCount::<Test>::get(USER), 0u32);
    });
}

#[test]
fn dismiss_inbox_record_fails_if_already_engaged() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        let record_id = [30u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        assert_ok!(AwarizonState::deliver_to_inbox(
            RuntimeOrigin::signed(DEV),
            USER,
            campaign_id,
            record_id,
        ));
        assert_ok!(AwarizonState::submit_engagement(
            RuntimeOrigin::signed(USER),
            record_id,
            pallet_awarizon_types::MIN_SESSION_SECONDS,
            pallet_awarizon_types::MIN_INTERACTIONS,
        ));
        assert_noop!(
            AwarizonState::dismiss_inbox_record(RuntimeOrigin::signed(USER), record_id),
            Error::<Test>::InboxAlreadyDelivered
        );
    });
}

// ---- submit_engagement --------------------------------------------------

#[test]
fn submit_engagement_works() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        let record_id = [30u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        assert_ok!(AwarizonState::deliver_to_inbox(
            RuntimeOrigin::signed(DEV),
            USER,
            campaign_id,
            record_id,
        ));
        assert_ok!(AwarizonState::submit_engagement(
            RuntimeOrigin::signed(USER),
            record_id,
            pallet_awarizon_types::MIN_SESSION_SECONDS,
            pallet_awarizon_types::MIN_INTERACTIONS,
        ));
        let record = InboxRecords::<Test>::get(USER, record_id).expect("record must exist");
        assert_eq!(record.status, InboxRecordStatus::Engaged);
        assert!(record.engaged_at.is_some());
        assert_eq!(DailyEngagementCount::<Test>::get(USER), 1u32);
    });
}

#[test]
fn submit_engagement_fails_invalid_session() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        let record_id = [30u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        assert_ok!(AwarizonState::deliver_to_inbox(
            RuntimeOrigin::signed(DEV),
            USER,
            campaign_id,
            record_id,
        ));
        assert_noop!(
            AwarizonState::submit_engagement(
                RuntimeOrigin::signed(USER),
                record_id,
                0u32, // session too short
                pallet_awarizon_types::MIN_INTERACTIONS,
            ),
            Error::<Test>::EngagementInvalid
        );
    });
}

#[test]
fn submit_engagement_fails_if_already_engaged() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        let record_id = [30u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        assert_ok!(AwarizonState::deliver_to_inbox(
            RuntimeOrigin::signed(DEV),
            USER,
            campaign_id,
            record_id,
        ));
        assert_ok!(AwarizonState::submit_engagement(
            RuntimeOrigin::signed(USER),
            record_id,
            pallet_awarizon_types::MIN_SESSION_SECONDS,
            pallet_awarizon_types::MIN_INTERACTIONS,
        ));
        assert_noop!(
            AwarizonState::submit_engagement(
                RuntimeOrigin::signed(USER),
                record_id,
                pallet_awarizon_types::MIN_SESSION_SECONDS,
                pallet_awarizon_types::MIN_INTERACTIONS,
            ),
            Error::<Test>::EngagementInvalid
        );
    });
}

// ================================================================
// PHASE 4 INTEGRATION TESTS
// ================================================================

// ---- claim_reward -------------------------------------------------------

fn setup_engaged_record(
    dev: AccountId,
    user: AccountId,
    manifest_hash: [u8; 32],
    campaign_id: [u8; 32],
    record_id: [u8; 32],
) {
    setup_verified_developer(dev);
    setup_manifest(dev, manifest_hash);
    setup_campaign(dev, campaign_id, manifest_hash);
    assert_ok!(AwarizonState::deliver_to_inbox(
        RuntimeOrigin::signed(dev),
        user,
        campaign_id,
        record_id,
    ));
    assert_ok!(AwarizonState::submit_engagement(
        RuntimeOrigin::signed(user),
        record_id,
        pallet_awarizon_types::MIN_SESSION_SECONDS,
        pallet_awarizon_types::MIN_INTERACTIONS,
    ));
}

#[test]
fn claim_reward_works_gaming_category() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        let record_id = [30u8; 32];
        setup_engaged_record(DEV, USER, manifest_hash, campaign_id, record_id);
        let balance_before = pallet_balances::Pallet::<Test>::free_balance(USER);
        assert_ok!(AwarizonState::claim_reward(RuntimeOrigin::signed(USER), record_id));
        let balance_after = pallet_balances::Pallet::<Test>::free_balance(USER);
        // Gaming category → 1.5 RIZ
        assert_eq!(balance_after - balance_before, 1_500_000_000_000u128);
        let record = InboxRecords::<Test>::get(USER, record_id).expect("record must exist");
        assert!(record.reward_claimed);
    });
}

#[test]
fn claim_reward_fails_if_not_engaged() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        let record_id = [30u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        assert_ok!(AwarizonState::deliver_to_inbox(
            RuntimeOrigin::signed(DEV),
            USER,
            campaign_id,
            record_id,
        ));
        // Record is Delivered, not Engaged
        assert_noop!(
            AwarizonState::claim_reward(RuntimeOrigin::signed(USER), record_id),
            Error::<Test>::EngagementInvalid
        );
    });
}

#[test]
fn claim_reward_fails_if_already_claimed() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        let record_id = [30u8; 32];
        setup_engaged_record(DEV, USER, manifest_hash, campaign_id, record_id);
        assert_ok!(AwarizonState::claim_reward(RuntimeOrigin::signed(USER), record_id));
        assert_noop!(
            AwarizonState::claim_reward(RuntimeOrigin::signed(USER), record_id),
            Error::<Test>::EngagementInvalid
        );
    });
}

// ---- update_wallet_index ------------------------------------------------

#[test]
fn update_wallet_index_increments_total_wallets_once() {
    new_test_ext().execute_with(|| {
        let history: BoundedVec<u8, frame_support::traits::ConstU32<8>> =
            BoundedVec::try_from(vec![0x01u8]).unwrap();
        assert_ok!(AwarizonState::update_wallet_index(
            RuntimeOrigin::signed(USER),
            365u32,
            50u32,
            history.clone(),
            1u8,
        ));
        assert_eq!(TotalWallets::<Test>::get(), 1u64);
        assert_eq!(WalletAgeIndex::<Test>::get(USER), Some(365u32));
        assert_eq!(WalletActivityIndex::<Test>::get(USER), Some(50u32));
        assert_eq!(WalletRegionCode::<Test>::get(USER), Some(1u8));
        // Second call — TotalWallets must not increment again
        assert_ok!(AwarizonState::update_wallet_index(
            RuntimeOrigin::signed(USER),
            366u32,
            51u32,
            history,
            2u8,
        ));
        assert_eq!(TotalWallets::<Test>::get(), 1u64);
    });
}

#[test]
fn update_wallet_index_multiple_unique_wallets() {
    new_test_ext().execute_with(|| {
        let history: BoundedVec<u8, frame_support::traits::ConstU32<8>> = BoundedVec::new();
        assert_ok!(AwarizonState::update_wallet_index(
            RuntimeOrigin::signed(DEV),
            100u32, 10u32, history.clone(), 0u8,
        ));
        assert_ok!(AwarizonState::update_wallet_index(
            RuntimeOrigin::signed(USER),
            200u32, 20u32, history, 0u8,
        ));
        assert_eq!(TotalWallets::<Test>::get(), 2u64);
    });
}

// ---- advance_epoch -------------------------------------------------------

#[test]
fn advance_epoch_fails_before_epoch_length() {
    new_test_ext().execute_with(|| {
        frame_system::Pallet::<Test>::set_block_number(0u64);
        EpochStartBlock::<Test>::put(0u64);
        assert_noop!(
            AwarizonState::advance_epoch(RuntimeOrigin::signed(DEV)),
            Error::<Test>::EpochNotReady
        );
    });
}

#[test]
fn advance_epoch_works_after_epoch_length() {
    new_test_ext().execute_with(|| {
        let epoch_len = pallet_awarizon_types::EPOCH_LENGTH_BLOCKS as u64;
        frame_system::Pallet::<Test>::set_block_number(epoch_len);
        EpochStartBlock::<Test>::put(0u64);
        assert_ok!(AwarizonState::advance_epoch(RuntimeOrigin::signed(DEV)));
        assert_eq!(CurrentEpoch::<Test>::get(), 1u64);
        assert_eq!(EpochStartBlock::<Test>::get(), epoch_len);
    });
}

#[test]
fn advance_epoch_increments_sequentially() {
    new_test_ext().execute_with(|| {
        let epoch_len = pallet_awarizon_types::EPOCH_LENGTH_BLOCKS as u64;
        frame_system::Pallet::<Test>::set_block_number(epoch_len);
        EpochStartBlock::<Test>::put(0u64);
        assert_ok!(AwarizonState::advance_epoch(RuntimeOrigin::signed(DEV)));
        frame_system::Pallet::<Test>::set_block_number(epoch_len * 2);
        assert_ok!(AwarizonState::advance_epoch(RuntimeOrigin::signed(DEV)));
        assert_eq!(CurrentEpoch::<Test>::get(), 2u64);
    });
}

// ---- expire_campaign -----------------------------------------------------

#[test]
fn expire_campaign_fails_before_expiry() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        // Campaign expires_at = 0 + 28_800; current block = 0
        assert_noop!(
            AwarizonState::expire_campaign(RuntimeOrigin::signed(USER), campaign_id),
            Error::<Test>::NotExpiredYet
        );
    });
}

#[test]
fn expire_campaign_works_after_expiry() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        let epoch_len = pallet_awarizon_types::EPOCH_LENGTH_BLOCKS as u64;
        frame_system::Pallet::<Test>::set_block_number(epoch_len);
        assert_ok!(AwarizonState::expire_campaign(RuntimeOrigin::signed(USER), campaign_id));
        let campaign = Campaigns::<Test>::get(campaign_id).expect("campaign must exist");
        assert_eq!(campaign.status, CampaignStatus::Expired);
    });
}

#[test]
fn expire_campaign_decrements_active_count() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        assert_eq!(ActiveCampaignCount::<Test>::get(), 1u64);
        let epoch_len = pallet_awarizon_types::EPOCH_LENGTH_BLOCKS as u64;
        frame_system::Pallet::<Test>::set_block_number(epoch_len);
        assert_ok!(AwarizonState::expire_campaign(RuntimeOrigin::signed(USER), campaign_id));
        assert_eq!(ActiveCampaignCount::<Test>::get(), 0u64);
    });
}

// ---- reset_daily_engagement ----------------------------------------------

#[test]
fn reset_daily_engagement_works_first_time() {
    new_test_ext().execute_with(|| {
        DailyEngagementCount::<Test>::insert(USER, 5u32);
        assert_ok!(AwarizonState::reset_daily_engagement(RuntimeOrigin::signed(USER)));
        assert_eq!(DailyEngagementCount::<Test>::get(USER), 0u32);
        assert!(LastEngagementResetBlock::<Test>::get(USER).is_some());
    });
}

#[test]
fn reset_daily_engagement_fails_too_soon() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonState::reset_daily_engagement(RuntimeOrigin::signed(USER)));
        // Immediately call again — not a full day elapsed
        assert_noop!(
            AwarizonState::reset_daily_engagement(RuntimeOrigin::signed(USER)),
            Error::<Test>::ResetNotReady
        );
    });
}

// ---- fee burning --------------------------------------------------------

#[test]
fn create_campaign_burns_20_percent_of_storage_fee() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        let storage_fee: u128 = pallet_awarizon_types::BASE_STORAGE_RATE_PLANCK_PER_BYTE_PER_EPOCH
            .saturating_mul(pallet_awarizon_types::MANIFEST_STORAGE_BYTES as u128)
            .saturating_mul(1u128); // duration_days = 1
        let burn_amount = storage_fee / 5;
        let remaining = storage_fee - burn_amount;
        setup_campaign(DEV, campaign_id, manifest_hash);
        assert_eq!(InboxStateReserveBalance::<Test>::get(), remaining);
    });
}

// ================================================================
// PHASE 8: OCW UNSIGNED EXTRINSIC TESTS
// ================================================================

#[test]
fn ocw_expire_campaign_works_via_none_origin() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        let epoch_len = pallet_awarizon_types::EPOCH_LENGTH_BLOCKS as u64;
        frame_system::Pallet::<Test>::set_block_number(epoch_len);
        assert_ok!(AwarizonState::ocw_expire_campaign(
            RuntimeOrigin::none(),
            campaign_id,
            epoch_len,
        ));
        let campaign = Campaigns::<Test>::get(campaign_id).expect("campaign must exist");
        assert_eq!(campaign.status, CampaignStatus::Expired);
        assert_eq!(ActiveCampaignCount::<Test>::get(), 0u64);
    });
}

#[test]
fn ocw_expire_campaign_fails_if_not_expired() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        frame_system::Pallet::<Test>::set_block_number(1u64);
        assert_noop!(
            AwarizonState::ocw_expire_campaign(RuntimeOrigin::none(), campaign_id, 1u64),
            Error::<Test>::NotExpiredYet
        );
    });
}

#[test]
fn ocw_expire_campaign_rejects_signed_origin() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        let epoch_len = pallet_awarizon_types::EPOCH_LENGTH_BLOCKS as u64;
        frame_system::Pallet::<Test>::set_block_number(epoch_len);
        assert_noop!(
            AwarizonState::ocw_expire_campaign(RuntimeOrigin::signed(DEV), campaign_id, epoch_len),
            frame_support::error::BadOrigin
        );
    });
}

#[test]
fn ocw_advance_epoch_works_via_none_origin() {
    new_test_ext().execute_with(|| {
        let epoch_len = pallet_awarizon_types::EPOCH_LENGTH_BLOCKS as u64;
        frame_system::Pallet::<Test>::set_block_number(epoch_len);
        EpochStartBlock::<Test>::put(0u64);
        assert_ok!(AwarizonState::ocw_advance_epoch(RuntimeOrigin::none(), epoch_len));
        assert_eq!(CurrentEpoch::<Test>::get(), 1u64);
        assert_eq!(EpochStartBlock::<Test>::get(), epoch_len);
    });
}

#[test]
fn ocw_advance_epoch_fails_before_epoch_length() {
    new_test_ext().execute_with(|| {
        frame_system::Pallet::<Test>::set_block_number(0u64);
        EpochStartBlock::<Test>::put(0u64);
        assert_noop!(
            AwarizonState::ocw_advance_epoch(RuntimeOrigin::none(), 0u64),
            Error::<Test>::EpochNotReady
        );
    });
}

#[test]
fn ocw_advance_epoch_rejects_signed_origin() {
    new_test_ext().execute_with(|| {
        let epoch_len = pallet_awarizon_types::EPOCH_LENGTH_BLOCKS as u64;
        frame_system::Pallet::<Test>::set_block_number(epoch_len);
        assert_noop!(
            AwarizonState::ocw_advance_epoch(RuntimeOrigin::signed(DEV), epoch_len),
            frame_support::error::BadOrigin
        );
    });
}

#[test]
fn ocw_prune_inbox_record_works_via_none_origin() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        let record_id = [30u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        assert_ok!(AwarizonState::deliver_to_inbox(
            RuntimeOrigin::signed(DEV),
            USER,
            campaign_id,
            record_id,
        ));
        // Dismiss so it's prunable
        assert_ok!(AwarizonState::dismiss_inbox_record(RuntimeOrigin::signed(USER), record_id));
        // Advance block past pruning threshold (864_000 blocks)
        frame_system::Pallet::<Test>::set_block_number(864_001u64);
        assert_ok!(AwarizonState::ocw_prune_inbox_record(
            RuntimeOrigin::none(),
            USER,
            record_id,
            864_001u64,
        ));
        assert!(InboxRecords::<Test>::get(USER, record_id).is_none());
        assert_eq!(WalletInboxCount::<Test>::get(USER), 0u32);
    });
}

#[test]
fn ocw_prune_inbox_record_fails_if_still_delivered() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        let record_id = [30u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        assert_ok!(AwarizonState::deliver_to_inbox(
            RuntimeOrigin::signed(DEV),
            USER,
            campaign_id,
            record_id,
        ));
        frame_system::Pallet::<Test>::set_block_number(864_001u64);
        // Record is Delivered, not prunable
        assert_noop!(
            AwarizonState::ocw_prune_inbox_record(
                RuntimeOrigin::none(),
                USER,
                record_id,
                864_001u64,
            ),
            Error::<Test>::EngagementInvalid
        );
    });
}

// ================================================================
// OCW CAMPAIGN DELIVERY TESTS
// ================================================================

const DELIVERY_FEE_PER_WALLET: u128 = 10_000_000_000u128;

fn index_wallet(wallet: AccountId) {
    let history: BoundedVec<u8, frame_support::traits::ConstU32<8>> = BoundedVec::new();
    assert_ok!(AwarizonState::update_wallet_index(
        RuntimeOrigin::signed(wallet),
        100u32,
        10u32,
        history,
        0u8,
    ));
}

// ---- trigger_campaign_delivery -------------------------------------------

#[test]
fn trigger_campaign_delivery_works() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        index_wallet(USER);

        let balance_before = pallet_balances::Pallet::<Test>::free_balance(DEV);
        assert_ok!(AwarizonState::trigger_campaign_delivery(
            RuntimeOrigin::signed(DEV),
            campaign_id,
        ));
        let balance_after = pallet_balances::Pallet::<Test>::free_balance(DEV);

        assert_eq!(balance_before - balance_after, DELIVERY_FEE_PER_WALLET);
        assert_eq!(PendingOcwDelivery::<Test>::get(campaign_id), Some(0u64));
        assert_eq!(OcwDeliveryCursor::<Test>::get(campaign_id), 0u32);
    });
}

#[test]
fn trigger_campaign_delivery_fails_if_no_matching_wallets() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        // No wallet has been indexed yet.
        assert_noop!(
            AwarizonState::trigger_campaign_delivery(RuntimeOrigin::signed(DEV), campaign_id),
            Error::<Test>::NoMatchingWallets
        );
    });
}

#[test]
fn trigger_campaign_delivery_fails_if_already_triggered() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        index_wallet(USER);
        assert_ok!(AwarizonState::trigger_campaign_delivery(
            RuntimeOrigin::signed(DEV),
            campaign_id,
        ));
        assert_noop!(
            AwarizonState::trigger_campaign_delivery(RuntimeOrigin::signed(DEV), campaign_id),
            Error::<Test>::DeliveryAlreadyTriggered
        );
    });
}

#[test]
fn trigger_campaign_delivery_fails_if_unauthorized() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        index_wallet(USER);
        assert_noop!(
            AwarizonState::trigger_campaign_delivery(RuntimeOrigin::signed(USER), campaign_id),
            Error::<Test>::Unauthorized
        );
    });
}

// ---- ocw_deliver_batch -----------------------------------------------------

#[test]
fn ocw_deliver_batch_delivers_and_completes_via_none_origin() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        let record_id = [40u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        index_wallet(USER);
        assert_ok!(AwarizonState::trigger_campaign_delivery(
            RuntimeOrigin::signed(DEV),
            campaign_id,
        ));

        assert_ok!(AwarizonState::ocw_deliver_batch(
            RuntimeOrigin::none(),
            campaign_id,
            vec![USER],
            vec![record_id],
            true,
        ));

        let record = InboxRecords::<Test>::get(USER, record_id).expect("record must exist");
        assert_eq!(record.status, InboxRecordStatus::Delivered);
        assert_eq!(WalletInboxCount::<Test>::get(USER), 1u32);
        assert_eq!(Campaigns::<Test>::get(campaign_id).unwrap().current_deliveries, 1u64);
        assert!(OcwDeliveryAttempted::<Test>::get(campaign_id, USER));
        assert!(PendingOcwDelivery::<Test>::get(campaign_id).is_none());
        assert_eq!(OcwDeliveryCursor::<Test>::get(campaign_id), 0u32);
    });
}

#[test]
fn ocw_deliver_batch_rejects_signed_origin() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        let record_id = [40u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        assert_noop!(
            AwarizonState::ocw_deliver_batch(
                RuntimeOrigin::signed(DEV),
                campaign_id,
                vec![USER],
                vec![record_id],
                true,
            ),
            frame_support::error::BadOrigin
        );
    });
}

#[test]
fn ocw_deliver_batch_skips_already_attempted_wallet() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        let record_id = [40u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        assert_ok!(AwarizonState::ocw_deliver_batch(
            RuntimeOrigin::none(),
            campaign_id,
            vec![USER],
            vec![record_id],
            false,
        ));
        assert_eq!(Campaigns::<Test>::get(campaign_id).unwrap().current_deliveries, 1u64);

        // Re-delivering the same wallet must be a no-op — already attempted.
        assert_ok!(AwarizonState::ocw_deliver_batch(
            RuntimeOrigin::none(),
            campaign_id,
            vec![USER],
            vec![[41u8; 32]],
            false,
        ));
        assert_eq!(Campaigns::<Test>::get(campaign_id).unwrap().current_deliveries, 1u64);
    });
}

#[test]
fn ocw_prune_inbox_record_fails_if_not_old_enough() {
    new_test_ext().execute_with(|| {
        let manifest_hash = [10u8; 32];
        let campaign_id = [20u8; 32];
        let record_id = [30u8; 32];
        setup_verified_developer(DEV);
        setup_manifest(DEV, manifest_hash);
        setup_campaign(DEV, campaign_id, manifest_hash);
        assert_ok!(AwarizonState::deliver_to_inbox(
            RuntimeOrigin::signed(DEV),
            USER,
            campaign_id,
            record_id,
        ));
        assert_ok!(AwarizonState::dismiss_inbox_record(RuntimeOrigin::signed(USER), record_id));
        // Only 100 blocks old — below threshold
        frame_system::Pallet::<Test>::set_block_number(100u64);
        assert_noop!(
            AwarizonState::ocw_prune_inbox_record(
                RuntimeOrigin::none(),
                USER,
                record_id,
                100u64,
            ),
            Error::<Test>::NotExpiredYet
        );
    });
}
