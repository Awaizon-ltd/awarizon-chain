#![cfg_attr(not(feature = "std"), no_std)]

use sp_core::crypto::KeyTypeId;

pub const KEY_TYPE: KeyTypeId = KeyTypeId(*b"awrz");

pub mod crypto {
    use super::KEY_TYPE;
    use sp_application_crypto::{app_crypto, sr25519};
    use sp_runtime::{MultiSignature, MultiSigner};

    app_crypto!(sr25519, KEY_TYPE);

    pub struct AwarizonAuthId;
    impl frame_system::offchain::AppCrypto<MultiSigner, MultiSignature> for AwarizonAuthId {
        type RuntimeAppPublic = Public;
        type GenericSignature = sp_core::sr25519::Signature;
        type GenericPublic = sp_core::sr25519::Public;
    }
}

pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
    use frame_support::{
        pallet_prelude::*,
        traits::{ConstU32, Currency, ExistenceRequirement, Get, ReservableCurrency},
        BoundedVec,
    };
    use frame_system::{offchain::SubmitTransaction, pallet_prelude::*};
    use sp_runtime::{
        traits::SaturatedConversion,
        transaction_validity::{
            InvalidTransaction, TransactionSource, TransactionValidity,
            TransactionValidityError, ValidTransaction,
        },
        MultiSignature, MultiSigner, Saturating,
    };
    use pallet_awarizon_types::{
        AppCategory, AppManifest, Campaign, CampaignStatus, DeveloperProfile, DeveloperStatus,
        InboxRecord, InboxRecordStatus, TargetingCriteria,
    };

    const INBOX_PRUNING_THRESHOLD_BLOCKS: u64 = 864_000;

    pub(crate) type BalanceOf<T> =
        <<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    #[pallet::config]
    pub trait Config: frame_system::Config + frame_system::offchain::CreateInherent<Call<Self>> {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
        type Currency: ReservableCurrency<Self::AccountId>;
        type VerificationStakeThreshold: Get<u128>;
        type InboxStateReserveAccount: Get<Self::AccountId>;
        type AuthorityId: frame_system::offchain::AppCrypto<MultiSigner, MultiSignature>;
    }

    // ================================================================
    // DEVELOPER REGISTRY
    // ================================================================

    #[pallet::storage]
    pub type DeveloperProfiles<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        DeveloperProfile<T::AccountId, BlockNumberFor<T>>,
    >;

    // ================================================================
    // MANIFEST REGISTRY
    // ================================================================

    #[pallet::storage]
    pub type AppManifests<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        [u8; 32],
        AppManifest<T::AccountId, BlockNumberFor<T>>,
    >;

    /// All manifest hashes registered by a specific developer.
    #[pallet::storage]
    pub type DeveloperManifests<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        BoundedVec<[u8; 32], ConstU32<1000>>,
        ValueQuery,
    >;

    // ================================================================
    // CAMPAIGN STORAGE
    // ================================================================

    #[pallet::storage]
    pub type Campaigns<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        [u8; 32],
        Campaign<T::AccountId, BlockNumberFor<T>>,
    >;

    /// All campaign IDs created by a specific developer.
    #[pallet::storage]
    pub type DeveloperCampaigns<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        BoundedVec<[u8; 32], ConstU32<500>>,
        ValueQuery,
    >;

    /// Total number of currently active campaigns.
    #[pallet::storage]
    pub type ActiveCampaignCount<T: Config> = StorageValue<_, u64, ValueQuery>;

    // ================================================================
    // INBOX STORAGE
    // ================================================================

    /// All inbox records for a wallet, keyed by (wallet, record_id).
    #[pallet::storage]
    pub type InboxRecords<T: Config> = StorageDoubleMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        Blake2_128Concat,
        [u8; 32],
        InboxRecord<T::AccountId, BlockNumberFor<T>>,
    >;

    /// How many inbox records a wallet currently holds.
    #[pallet::storage]
    pub type WalletInboxCount<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        u32,
        ValueQuery,
    >;

    /// Cumulative total deliveries across all time.
    #[pallet::storage]
    pub type TotalDeliveries<T: Config> = StorageValue<_, u64, ValueQuery>;

    // ================================================================
    // ENGAGEMENT STORAGE
    // ================================================================

    /// Block at which a wallet last engaged with a specific record (cooldown enforcement).
    #[pallet::storage]
    pub type EngagementTimestamps<T: Config> = StorageDoubleMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        Blake2_128Concat,
        [u8; 32],
        BlockNumberFor<T>,
    >;

    /// How many engagement events a wallet submitted today.
    #[pallet::storage]
    pub type DailyEngagementCount<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        u32,
        ValueQuery,
    >;

    /// The block at which a wallet's daily engagement count was last reset.
    #[pallet::storage]
    pub type LastEngagementResetBlock<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        BlockNumberFor<T>,
    >;

    // ================================================================
    // STAKING STORAGE
    // ================================================================

    /// How much RIZ each developer has staked for distribution rights.
    #[pallet::storage]
    pub type DeveloperStakes<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        u128,
        ValueQuery,
    >;

    /// Total RIZ staked across all developers.
    #[pallet::storage]
    pub type TotalStaked<T: Config> = StorageValue<_, u128, ValueQuery>;

    // ================================================================
    // INBOX STATE RESERVE
    // ================================================================

    /// Total storage fees collected in the Inbox State Reserve.
    #[pallet::storage]
    pub type InboxStateReserveBalance<T: Config> = StorageValue<_, u128, ValueQuery>;

    /// Cumulative total of all extrinsics processed since genesis.
    #[pallet::storage]
    pub type TotalExtrinsics<T: Config> = StorageValue<_, u64, ValueQuery>;

    // ================================================================
    // TARGETING INDEX
    // ================================================================

    /// Pre-computed wallet age in days for targeting engine.
    #[pallet::storage]
    pub type WalletAgeIndex<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        u32,
    >;

    /// Pre-computed transaction count (last 30 days) for targeting engine.
    #[pallet::storage]
    pub type WalletActivityIndex<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        u32,
    >;

    /// Category engagement history (category IDs as u8) for targeting.
    #[pallet::storage]
    pub type WalletCategoryHistory<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        BoundedVec<u8, ConstU32<8>>,
        ValueQuery,
    >;

    /// Region code for geographic targeting.
    #[pallet::storage]
    pub type WalletRegionCode<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        u8,
    >;

    // ================================================================
    // EPOCH TRACKING
    // ================================================================

    /// Current epoch number.
    #[pallet::storage]
    pub type CurrentEpoch<T: Config> = StorageValue<_, u64, ValueQuery>;

    /// Block number when the current epoch started.
    #[pallet::storage]
    pub type EpochStartBlock<T: Config> = StorageValue<_, BlockNumberFor<T>, ValueQuery>;

    /// Total registered wallets on the network.
    #[pallet::storage]
    pub type TotalWallets<T: Config> = StorageValue<_, u64, ValueQuery>;

    /// Tracks whether a wallet has ever had its index updated (used for TotalWallets).
    #[pallet::storage]
    pub type WalletIndexed<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        bool,
        ValueQuery,
    >;

    // ================================================================
    // EVENTS
    // ================================================================

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        DeveloperRegistered { developer: T::AccountId },
        DeveloperVerified { developer: T::AccountId },
        ManifestRegistered { developer: T::AccountId, manifest_hash: [u8; 32] },
        CampaignCreated { developer: T::AccountId, campaign_id: [u8; 32] },
        CampaignTerminated { campaign_id: [u8; 32] },
        CampaignExpired { campaign_id: [u8; 32] },
        AppDelivered { wallet: T::AccountId, record_id: [u8; 32], campaign_id: [u8; 32] },
        InboxRecordDismissed { wallet: T::AccountId, record_id: [u8; 32] },
        EngagementSubmitted { wallet: T::AccountId, record_id: [u8; 32] },
        RewardClaimed { wallet: T::AccountId, record_id: [u8; 32], amount: u128 },
        EpochAdvanced { epoch: u64, start_block: BlockNumberFor<T> },
        StorageFeeCollected { developer: T::AccountId, amount: u128 },
        StorageFeeBurned { amount: u128 },
        WalletIndexUpdated { wallet: T::AccountId },
        DailyEngagementReset { wallet: T::AccountId },
    }

    // ================================================================
    // ERRORS
    // ================================================================

    #[pallet::error]
    pub enum Error<T> {
        DeveloperNotFound,
        DeveloperAlreadyRegistered,
        DeveloperNotVerified,
        DeveloperSuspended,
        ManifestNotFound,
        ManifestAlreadyRegistered,
        ManifestLimitReached,
        CampaignNotFound,
        CampaignNotActive,
        CampaignExpired,
        CampaignDeliveryLimitReached,
        InboxRecordNotFound,
        InboxAlreadyDelivered,
        InboxFull,
        EngagementCooldownActive,
        EngagementDailyLimitReached,
        EngagementInvalid,
        InsufficientStake,
        InsufficientBalance,
        TargetingDimensionLimitExceeded,
        InvalidManifestHash,
        InvalidCampaignId,
        Unauthorized,
        EpochNotReady,
        NotExpiredYet,
        ResetNotReady,
    }

    // ================================================================
    // HOOKS — off-chain worker
    // ================================================================

    #[pallet::hooks]
    impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
        fn on_finalize(_n: BlockNumberFor<T>) {
            let count = frame_system::Pallet::<T>::extrinsic_count();
            TotalExtrinsics::<T>::mutate(|total| {
                *total = total.saturating_add(count as u64);
            });
        }

        fn offchain_worker(block_number: BlockNumberFor<T>) {
            let block_u64: u64 = block_number.saturated_into();
            if block_u64 % 10 == 0 {
                Self::check_and_expire_campaigns(block_number);
            }
            Self::check_and_advance_epoch(block_number);
            if block_u64 % 50 == 0 {
                Self::prune_old_inbox_records(block_number);
            }
        }
    }

    // ================================================================
    // VALIDATE UNSIGNED — trustless OCW transaction validation
    // ================================================================

    #[pallet::validate_unsigned]
    impl<T: Config> ValidateUnsigned for Pallet<T> {
        type Call = Call<T>;

        fn validate_unsigned(_source: TransactionSource, call: &Self::Call) -> TransactionValidity {
            match call {
                Call::ocw_expire_campaign { campaign_id, .. } => {
                    ValidTransaction::with_tag_prefix("AwarizonExpire")
                        .priority(100)
                        .and_provides(campaign_id)
                        .longevity(5)
                        .propagate(false)
                        .build()
                },
                Call::ocw_advance_epoch { .. } => {
                    let epoch = CurrentEpoch::<T>::get();
                    ValidTransaction::with_tag_prefix("AwarizonEpoch")
                        .priority(110)
                        .and_provides(epoch)
                        .longevity(5)
                        .propagate(false)
                        .build()
                },
                Call::ocw_prune_inbox_record { wallet, record_id, .. } => {
                    ValidTransaction::with_tag_prefix("AwarizonPrune")
                        .priority(90)
                        .and_provides((wallet, record_id))
                        .longevity(5)
                        .propagate(false)
                        .build()
                },
                _ => InvalidTransaction::Call.into(),
            }
        }

        fn pre_dispatch(call: &Self::Call) -> Result<(), TransactionValidityError> {
            Self::validate_unsigned(TransactionSource::InBlock, call).map(|_| ())
        }
    }

    // ================================================================
    // CALLS
    // ================================================================

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        #[pallet::call_index(0)]
        #[pallet::weight(Weight::from_parts(50_000_000, 0))]
        pub fn register_developer(origin: OriginFor<T>) -> DispatchResult {
            let developer = ensure_signed(origin)?;
            ensure!(
                !DeveloperProfiles::<T>::contains_key(&developer),
                Error::<T>::DeveloperAlreadyRegistered
            );
            let profile = DeveloperProfile {
                account: developer.clone(),
                staked_riz: 0u128,
                status: DeveloperStatus::Unverified,
                first_distribution_block: None,
                violation_count: 0u32,
                total_campaigns: 0u32,
                total_deliveries: 0u64,
            };
            DeveloperProfiles::<T>::insert(&developer, profile);
            Self::deposit_event(Event::DeveloperRegistered { developer });
            Ok(())
        }

        #[pallet::call_index(1)]
        #[pallet::weight(Weight::from_parts(50_000_000, 0))]
        pub fn stake_riz(origin: OriginFor<T>, amount: BalanceOf<T>) -> DispatchResult {
            let developer = ensure_signed(origin)?;
            let mut profile = DeveloperProfiles::<T>::get(&developer)
                .ok_or(Error::<T>::DeveloperNotFound)?;
            ensure!(
                profile.status != DeveloperStatus::Suspended,
                Error::<T>::DeveloperSuspended
            );
            T::Currency::reserve(&developer, amount)
                .map_err(|_| Error::<T>::InsufficientBalance)?;
            let amount_u128 = amount.saturated_into::<u128>();
            profile.staked_riz = profile.staked_riz.saturating_add(amount_u128);
            let threshold = T::VerificationStakeThreshold::get();
            if profile.status == DeveloperStatus::Unverified && profile.staked_riz >= threshold {
                profile.status = DeveloperStatus::Verified;
                Self::deposit_event(Event::DeveloperVerified { developer: developer.clone() });
            }
            DeveloperProfiles::<T>::insert(&developer, &profile);
            DeveloperStakes::<T>::mutate(&developer, |s| *s = s.saturating_add(amount_u128));
            TotalStaked::<T>::mutate(|t| *t = t.saturating_add(amount_u128));
            Ok(())
        }

        #[pallet::call_index(2)]
        #[pallet::weight(Weight::from_parts(100_000_000, 0))]
        pub fn register_manifest(
            origin: OriginFor<T>,
            manifest_hash: [u8; 32],
            category: AppCategory,
            metadata_uri: BoundedVec<u8, ConstU32<256>>,
        ) -> DispatchResult {
            let developer = ensure_signed(origin)?;
            let profile = DeveloperProfiles::<T>::get(&developer)
                .ok_or(Error::<T>::DeveloperNotFound)?;
            ensure!(
                profile.status == DeveloperStatus::Verified,
                Error::<T>::DeveloperNotVerified
            );
            ensure!(
                !AppManifests::<T>::contains_key(&manifest_hash),
                Error::<T>::ManifestAlreadyRegistered
            );
            let manifest = AppManifest {
                manifest_hash,
                developer: developer.clone(),
                category,
                registered_at: <frame_system::Pallet<T>>::block_number(),
                metadata_uri,
            };
            AppManifests::<T>::insert(manifest_hash, manifest);
            DeveloperManifests::<T>::try_mutate(&developer, |list| {
                list.try_push(manifest_hash).map_err(|_| Error::<T>::ManifestLimitReached)
            })?;
            Self::deposit_event(Event::ManifestRegistered { developer, manifest_hash });
            Ok(())
        }

        #[pallet::call_index(3)]
        #[pallet::weight(Weight::from_parts(250_000_000, 0))]
        pub fn create_campaign(
            origin: OriginFor<T>,
            campaign_id: [u8; 32],
            manifest_hash: [u8; 32],
            targeting: TargetingCriteria,
            duration_days: u32,
            max_deliveries: u64,
        ) -> DispatchResult {
            let developer = ensure_signed(origin)?;
            let mut profile = DeveloperProfiles::<T>::get(&developer)
                .ok_or(Error::<T>::DeveloperNotFound)?;
            ensure!(
                profile.status == DeveloperStatus::Verified,
                Error::<T>::DeveloperNotVerified
            );
            ensure!(
                !Campaigns::<T>::contains_key(&campaign_id),
                Error::<T>::InvalidCampaignId
            );
            let manifest = AppManifests::<T>::get(&manifest_hash)
                .ok_or(Error::<T>::ManifestNotFound)?;
            ensure!(manifest.developer == developer, Error::<T>::Unauthorized);
            ensure!(
                duration_days >= pallet_awarizon_types::MIN_CAMPAIGN_DURATION_DAYS
                    && duration_days <= pallet_awarizon_types::MAX_CAMPAIGN_DURATION_DAYS,
                Error::<T>::InvalidCampaignId
            );
            ensure!(
                targeting.dimension_count() <= pallet_awarizon_types::MAX_TARGETING_DIMENSIONS,
                Error::<T>::TargetingDimensionLimitExceeded
            );
            let storage_fee = pallet_awarizon_types::BASE_STORAGE_RATE_PLANCK_PER_BYTE_PER_EPOCH
                .saturating_mul(pallet_awarizon_types::MANIFEST_STORAGE_BYTES as u128)
                .saturating_mul(duration_days as u128);
            T::Currency::transfer(
                &developer,
                &T::InboxStateReserveAccount::get(),
                storage_fee.saturated_into::<BalanceOf<T>>(),
                ExistenceRequirement::KeepAlive,
            )
            .map_err(|_| Error::<T>::InsufficientBalance)?;
            let created_at = <frame_system::Pallet<T>>::block_number();
            let blocks_per_day = pallet_awarizon_types::EPOCH_LENGTH_BLOCKS as u64;
            let duration_blocks = (duration_days as u64).saturating_mul(blocks_per_day);
            let expires_at =
                created_at.saturating_add(duration_blocks.saturated_into::<BlockNumberFor<T>>());
            let campaign = Campaign {
                campaign_id,
                developer: developer.clone(),
                manifest_hash,
                targeting,
                status: CampaignStatus::Active,
                created_at,
                expires_at,
                max_deliveries,
                current_deliveries: 0u64,
                storage_fee_paid: storage_fee,
            };
            Campaigns::<T>::insert(campaign_id, campaign);
            DeveloperCampaigns::<T>::try_mutate(&developer, |list| {
                list.try_push(campaign_id).map_err(|_| Error::<T>::ManifestLimitReached)
            })?;
            ActiveCampaignCount::<T>::mutate(|c| *c = c.saturating_add(1));
            profile.total_campaigns = profile.total_campaigns.saturating_add(1);
            DeveloperProfiles::<T>::insert(&developer, profile);
            let burn_amount = storage_fee / 5;
            let remaining = storage_fee.saturating_sub(burn_amount);
            let (burned, _) = T::Currency::slash(
                &T::InboxStateReserveAccount::get(),
                burn_amount.saturated_into::<BalanceOf<T>>(),
            );
            drop(burned);
            InboxStateReserveBalance::<T>::mutate(|b| *b = b.saturating_add(remaining));
            Self::deposit_event(Event::CampaignCreated { developer: developer.clone(), campaign_id });
            Self::deposit_event(Event::StorageFeeCollected { developer, amount: storage_fee });
            Self::deposit_event(Event::StorageFeeBurned { amount: burn_amount });
            Ok(())
        }

        #[pallet::call_index(4)]
        #[pallet::weight(Weight::from_parts(100_000_000, 0))]
        pub fn deliver_to_inbox(
            origin: OriginFor<T>,
            wallet: T::AccountId,
            campaign_id: [u8; 32],
            record_id: [u8; 32],
        ) -> DispatchResult {
            let _caller = ensure_signed(origin)?;
            let mut campaign = Campaigns::<T>::get(&campaign_id)
                .ok_or(Error::<T>::CampaignNotFound)?;
            ensure!(
                campaign.status == CampaignStatus::Active,
                Error::<T>::CampaignNotActive
            );
            let current_block = <frame_system::Pallet<T>>::block_number();
            ensure!(current_block <= campaign.expires_at, Error::<T>::CampaignExpired);
            ensure!(
                campaign.current_deliveries < campaign.max_deliveries,
                Error::<T>::CampaignDeliveryLimitReached
            );
            ensure!(
                !InboxRecords::<T>::contains_key(&wallet, &record_id),
                Error::<T>::InboxAlreadyDelivered
            );
            let inbox_count = WalletInboxCount::<T>::get(&wallet);
            ensure!(inbox_count < 1000u32, Error::<T>::InboxFull);
            let manifest = AppManifests::<T>::get(&campaign.manifest_hash)
                .ok_or(Error::<T>::ManifestNotFound)?;
            let record = InboxRecord {
                record_id,
                campaign_id,
                developer: campaign.developer.clone(),
                manifest_hash: campaign.manifest_hash,
                category: manifest.category.clone(),
                status: InboxRecordStatus::Delivered,
                delivered_at: current_block,
                engaged_at: None,
                reward_claimed: false,
            };
            InboxRecords::<T>::insert(&wallet, record_id, record);
            WalletInboxCount::<T>::mutate(&wallet, |c| *c = c.saturating_add(1));
            campaign.current_deliveries = campaign.current_deliveries.saturating_add(1);
            Campaigns::<T>::insert(campaign_id, campaign);
            TotalDeliveries::<T>::mutate(|d| *d = d.saturating_add(1));
            Self::deposit_event(Event::AppDelivered { wallet, record_id, campaign_id });
            Ok(())
        }

        #[pallet::call_index(5)]
        #[pallet::weight(Weight::from_parts(10_000_000, 0))]
        pub fn terminate_campaign(
            origin: OriginFor<T>,
            campaign_id: [u8; 32],
        ) -> DispatchResult {
            let developer = ensure_signed(origin)?;
            let mut campaign = Campaigns::<T>::get(&campaign_id)
                .ok_or(Error::<T>::CampaignNotFound)?;
            ensure!(campaign.developer == developer, Error::<T>::Unauthorized);
            ensure!(
                campaign.status == CampaignStatus::Active,
                Error::<T>::CampaignNotActive
            );
            campaign.status = CampaignStatus::Terminated;
            Campaigns::<T>::insert(campaign_id, campaign);
            ActiveCampaignCount::<T>::mutate(|c| *c = c.saturating_sub(1));
            Self::deposit_event(Event::CampaignTerminated { campaign_id });
            Ok(())
        }

        #[pallet::call_index(6)]
        #[pallet::weight(Weight::from_parts(10_000_000, 0))]
        pub fn dismiss_inbox_record(
            origin: OriginFor<T>,
            record_id: [u8; 32],
        ) -> DispatchResult {
            let wallet = ensure_signed(origin)?;
            let mut record = InboxRecords::<T>::get(&wallet, &record_id)
                .ok_or(Error::<T>::InboxRecordNotFound)?;
            ensure!(
                record.status == InboxRecordStatus::Delivered,
                Error::<T>::InboxAlreadyDelivered
            );
            record.status = InboxRecordStatus::Dismissed;
            InboxRecords::<T>::insert(&wallet, record_id, record);
            WalletInboxCount::<T>::mutate(&wallet, |c| *c = c.saturating_sub(1));
            Self::deposit_event(Event::InboxRecordDismissed { wallet, record_id });
            Ok(())
        }

        #[pallet::call_index(7)]
        #[pallet::weight(Weight::from_parts(50_000_000, 0))]
        pub fn submit_engagement(
            origin: OriginFor<T>,
            record_id: [u8; 32],
            session_duration_seconds: u32,
            interaction_count: u32,
        ) -> DispatchResult {
            let wallet = ensure_signed(origin)?;
            let mut record = InboxRecords::<T>::get(&wallet, &record_id)
                .ok_or(Error::<T>::InboxRecordNotFound)?;
            ensure!(
                record.status == InboxRecordStatus::Delivered,
                Error::<T>::EngagementInvalid
            );
            ensure!(
                session_duration_seconds >= pallet_awarizon_types::MIN_SESSION_SECONDS
                    && interaction_count >= pallet_awarizon_types::MIN_INTERACTIONS,
                Error::<T>::EngagementInvalid
            );
            let current_block = <frame_system::Pallet<T>>::block_number();
            let blocks_per_hour =
                3600u64 / pallet_awarizon_types::BLOCK_TIME_SECONDS as u64;
            let cooldown_blocks = (pallet_awarizon_types::ENGAGEMENT_COOLDOWN_HOURS as u64)
                .saturating_mul(blocks_per_hour);
            if let Some(last_ts) = EngagementTimestamps::<T>::get(&wallet, &record_id) {
                let elapsed = current_block.saturating_sub(last_ts).saturated_into::<u64>();
                ensure!(elapsed >= cooldown_blocks, Error::<T>::EngagementCooldownActive);
            }
            let blocks_per_day =
                24u64 * 3600u64 / pallet_awarizon_types::BLOCK_TIME_SECONDS as u64;
            let reset_needed = match LastEngagementResetBlock::<T>::get(&wallet) {
                None => true,
                Some(last_reset) => {
                    current_block.saturating_sub(last_reset).saturated_into::<u64>()
                        >= blocks_per_day
                }
            };
            if reset_needed {
                DailyEngagementCount::<T>::insert(&wallet, 0u32);
                LastEngagementResetBlock::<T>::insert(&wallet, current_block);
            }
            let daily_count = DailyEngagementCount::<T>::get(&wallet);
            ensure!(
                daily_count < pallet_awarizon_types::MAX_ENGAGEMENT_EVENTS_PER_DAY,
                Error::<T>::EngagementDailyLimitReached
            );
            record.status = InboxRecordStatus::Engaged;
            record.engaged_at = Some(current_block);
            InboxRecords::<T>::insert(&wallet, record_id, &record);
            EngagementTimestamps::<T>::insert(&wallet, record_id, current_block);
            DailyEngagementCount::<T>::mutate(&wallet, |c| *c = c.saturating_add(1));
            Self::deposit_event(Event::EngagementSubmitted { wallet, record_id });
            Ok(())
        }

        #[pallet::call_index(8)]
        #[pallet::weight(Weight::from_parts(50_000_000, 0))]
        pub fn claim_reward(
            origin: OriginFor<T>,
            record_id: [u8; 32],
        ) -> DispatchResult {
            let wallet = ensure_signed(origin)?;
            let mut record = InboxRecords::<T>::get(&wallet, &record_id)
                .ok_or(Error::<T>::InboxRecordNotFound)?;
            ensure!(
                record.status == InboxRecordStatus::Engaged,
                Error::<T>::EngagementInvalid
            );
            ensure!(!record.reward_claimed, Error::<T>::EngagementInvalid);
            let reward: u128 = match record.category {
                AppCategory::DeFi | AppCategory::Gaming => 1_500_000_000_000u128,
                AppCategory::Social | AppCategory::Productivity => 1_250_000_000_000u128,
                _ => 1_000_000_000_000u128,
            };
            T::Currency::transfer(
                &T::InboxStateReserveAccount::get(),
                &wallet,
                reward.saturated_into::<BalanceOf<T>>(),
                ExistenceRequirement::KeepAlive,
            )
            .map_err(|_| Error::<T>::InsufficientBalance)?;
            record.reward_claimed = true;
            InboxRecords::<T>::insert(&wallet, record_id, record);
            InboxStateReserveBalance::<T>::mutate(|b| *b = b.saturating_sub(reward));
            Self::deposit_event(Event::RewardClaimed { wallet, record_id, amount: reward });
            Ok(())
        }

        #[pallet::call_index(9)]
        #[pallet::weight(Weight::from_parts(100_000_000, 0))]
        pub fn update_wallet_index(
            origin: OriginFor<T>,
            wallet_age_days: u32,
            activity_count: u32,
            category_history: BoundedVec<u8, ConstU32<8>>,
            region_code: u8,
        ) -> DispatchResult {
            let caller = ensure_signed(origin)?;
            WalletAgeIndex::<T>::insert(&caller, wallet_age_days);
            WalletActivityIndex::<T>::insert(&caller, activity_count);
            WalletCategoryHistory::<T>::insert(&caller, &category_history);
            WalletRegionCode::<T>::insert(&caller, region_code);
            if !WalletIndexed::<T>::get(&caller) {
                TotalWallets::<T>::mutate(|w| *w = w.saturating_add(1));
                WalletIndexed::<T>::insert(&caller, true);
            }
            Self::deposit_event(Event::WalletIndexUpdated { wallet: caller });
            Ok(())
        }

        #[pallet::call_index(10)]
        #[pallet::weight(Weight::from_parts(250_000_000, 0))]
        pub fn advance_epoch(origin: OriginFor<T>) -> DispatchResult {
            ensure_signed(origin)?;
            let current_block = <frame_system::Pallet<T>>::block_number();
            let epoch_start = EpochStartBlock::<T>::get();
            let elapsed = current_block.saturating_sub(epoch_start).saturated_into::<u64>();
            ensure!(
                elapsed >= pallet_awarizon_types::EPOCH_LENGTH_BLOCKS as u64,
                Error::<T>::EpochNotReady
            );
            let new_epoch = CurrentEpoch::<T>::mutate(|e| {
                *e = e.saturating_add(1);
                *e
            });
            EpochStartBlock::<T>::put(current_block);
            Self::deposit_event(Event::EpochAdvanced { epoch: new_epoch, start_block: current_block });
            Ok(())
        }

        #[pallet::call_index(11)]
        #[pallet::weight(Weight::from_parts(10_000_000, 0))]
        pub fn expire_campaign(
            origin: OriginFor<T>,
            campaign_id: [u8; 32],
        ) -> DispatchResult {
            ensure_signed(origin)?;
            let mut campaign = Campaigns::<T>::get(&campaign_id)
                .ok_or(Error::<T>::CampaignNotFound)?;
            ensure!(
                campaign.status == CampaignStatus::Active,
                Error::<T>::CampaignNotActive
            );
            let current_block = <frame_system::Pallet<T>>::block_number();
            ensure!(current_block >= campaign.expires_at, Error::<T>::NotExpiredYet);
            campaign.status = CampaignStatus::Expired;
            Campaigns::<T>::insert(campaign_id, campaign);
            ActiveCampaignCount::<T>::mutate(|c| *c = c.saturating_sub(1));
            Self::deposit_event(Event::CampaignExpired { campaign_id });
            Ok(())
        }

        #[pallet::call_index(12)]
        #[pallet::weight(Weight::from_parts(10_000_000, 0))]
        pub fn reset_daily_engagement(
            origin: OriginFor<T>,
        ) -> DispatchResult {
            let wallet = ensure_signed(origin)?;
            let current_block = <frame_system::Pallet<T>>::block_number();
            let blocks_per_day =
                24u64 * 3600u64 / pallet_awarizon_types::BLOCK_TIME_SECONDS as u64;
            if let Some(last_reset) = LastEngagementResetBlock::<T>::get(&wallet) {
                let elapsed = current_block.saturating_sub(last_reset).saturated_into::<u64>();
                ensure!(elapsed >= blocks_per_day, Error::<T>::ResetNotReady);
            }
            DailyEngagementCount::<T>::insert(&wallet, 0u32);
            LastEngagementResetBlock::<T>::insert(&wallet, current_block);
            Self::deposit_event(Event::DailyEngagementReset { wallet });
            Ok(())
        }

        // ================================================================
        // OCW UNSIGNED EXTRINSICS (call indices 13-15)
        // ================================================================

        #[pallet::call_index(13)]
        #[pallet::weight(Weight::from_parts(5_000_000, 0))]
        pub fn ocw_expire_campaign(
            origin: OriginFor<T>,
            campaign_id: [u8; 32],
            block_number: BlockNumberFor<T>,
        ) -> DispatchResult {
            ensure_none(origin)?;
            let _ = block_number;
            let mut campaign = Campaigns::<T>::get(&campaign_id)
                .ok_or(Error::<T>::CampaignNotFound)?;
            ensure!(campaign.status == CampaignStatus::Active, Error::<T>::CampaignNotActive);
            let current_block = <frame_system::Pallet<T>>::block_number();
            ensure!(current_block >= campaign.expires_at, Error::<T>::NotExpiredYet);
            campaign.status = CampaignStatus::Expired;
            Campaigns::<T>::insert(campaign_id, campaign);
            ActiveCampaignCount::<T>::mutate(|c| *c = c.saturating_sub(1));
            Self::deposit_event(Event::CampaignExpired { campaign_id });
            Ok(())
        }

        #[pallet::call_index(14)]
        #[pallet::weight(Weight::from_parts(5_000_000, 0))]
        pub fn ocw_advance_epoch(
            origin: OriginFor<T>,
            block_number: BlockNumberFor<T>,
        ) -> DispatchResult {
            ensure_none(origin)?;
            let _ = block_number;
            let current_block = <frame_system::Pallet<T>>::block_number();
            let epoch_start = EpochStartBlock::<T>::get();
            let elapsed = current_block.saturating_sub(epoch_start).saturated_into::<u64>();
            ensure!(
                elapsed >= pallet_awarizon_types::EPOCH_LENGTH_BLOCKS as u64,
                Error::<T>::EpochNotReady
            );
            let new_epoch = CurrentEpoch::<T>::mutate(|e| {
                *e = e.saturating_add(1);
                *e
            });
            EpochStartBlock::<T>::put(current_block);
            Self::deposit_event(Event::EpochAdvanced { epoch: new_epoch, start_block: current_block });
            Ok(())
        }

        #[pallet::call_index(15)]
        #[pallet::weight(Weight::from_parts(5_000_000, 0))]
        pub fn ocw_prune_inbox_record(
            origin: OriginFor<T>,
            wallet: T::AccountId,
            record_id: [u8; 32],
            block_number: BlockNumberFor<T>,
        ) -> DispatchResult {
            ensure_none(origin)?;
            let _ = block_number;
            let record = InboxRecords::<T>::get(&wallet, &record_id)
                .ok_or(Error::<T>::InboxRecordNotFound)?;
            ensure!(
                record.status != InboxRecordStatus::Delivered,
                Error::<T>::EngagementInvalid
            );
            let threshold: BlockNumberFor<T> = INBOX_PRUNING_THRESHOLD_BLOCKS.saturated_into();
            let current_block = <frame_system::Pallet<T>>::block_number();
            let age = current_block.saturating_sub(record.delivered_at);
            ensure!(age >= threshold, Error::<T>::NotExpiredYet);
            InboxRecords::<T>::remove(&wallet, &record_id);
            WalletInboxCount::<T>::mutate(&wallet, |c| *c = c.saturating_sub(1));
            Ok(())
        }
    }

    // ================================================================
    // OCW HELPER FUNCTIONS
    // ================================================================

    impl<T: Config> Pallet<T> {
        fn check_and_expire_campaigns(block_number: BlockNumberFor<T>) {
            const MAX_PER_CYCLE: usize = 20;
            let mut count = 0usize;
            for (campaign_id, campaign) in Campaigns::<T>::iter() {
                if count >= MAX_PER_CYCLE {
                    break;
                }
                if campaign.status == CampaignStatus::Active && block_number >= campaign.expires_at {
                    let call = Call::ocw_expire_campaign { campaign_id, block_number };
                    let xt = T::create_inherent(call.into());
                    if SubmitTransaction::<T, Call<T>>::submit_transaction(xt).is_ok() {
                        count += 1;
                    }
                }
            }
        }

        fn check_and_advance_epoch(block_number: BlockNumberFor<T>) {
            let epoch_start = EpochStartBlock::<T>::get();
            let elapsed = block_number.saturating_sub(epoch_start).saturated_into::<u64>();
            if elapsed >= pallet_awarizon_types::EPOCH_LENGTH_BLOCKS as u64 {
                let call = Call::ocw_advance_epoch { block_number };
                let xt = T::create_inherent(call.into());
                let _ = SubmitTransaction::<T, Call<T>>::submit_transaction(xt);
            }
        }

        fn prune_old_inbox_records(block_number: BlockNumberFor<T>) {
            const MAX_PER_CYCLE: usize = 10;
            let threshold: BlockNumberFor<T> = INBOX_PRUNING_THRESHOLD_BLOCKS.saturated_into();
            let mut count = 0usize;
            for (wallet, record_id, record) in InboxRecords::<T>::iter() {
                if count >= MAX_PER_CYCLE {
                    break;
                }
                if record.status != InboxRecordStatus::Delivered {
                    let age = block_number.saturating_sub(record.delivered_at);
                    if age >= threshold {
                        let call = Call::ocw_prune_inbox_record {
                            wallet: wallet.clone(),
                            record_id,
                            block_number,
                        };
                        let xt = T::create_inherent(call.into());
                        if SubmitTransaction::<T, Call<T>>::submit_transaction(xt).is_ok() {
                            count += 1;
                        }
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;
