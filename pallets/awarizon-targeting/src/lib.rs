#![cfg_attr(not(feature = "std"), no_std)]

pub mod bloom;
pub mod matcher;

pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
    use crate::bloom::BloomFilter;
    use crate::matcher::TargetingMatcher;
    use codec::Encode;
    use frame_support::pallet_prelude::*;
    use frame_system::pallet_prelude::*;

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    #[pallet::config]
    pub trait Config: frame_system::Config + pallet_awarizon_state::Config {
        type RuntimeEvent: From<Event<Self>>
            + IsType<<Self as frame_system::Config>::RuntimeEvent>;
    }

    /// Cached Bloom filter bytes for a campaign, keyed by campaign_id.
    #[pallet::storage]
    pub type CampaignBloomFilters<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        [u8; 32],
        BoundedVec<u8, ConstU32<8192>>,
        OptionQuery,
    >;

    /// Two-phase match result cache: (campaign_id, wallet) → bool.
    #[pallet::storage]
    pub type TargetingMatchCache<T: Config> = StorageDoubleMap<
        _,
        Blake2_128Concat,
        [u8; 32],
        Blake2_128Concat,
        T::AccountId,
        bool,
        ValueQuery,
    >;

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        BloomFilterBuilt { campaign_id: [u8; 32], bit_count: u32 },
        WalletMatched { campaign_id: [u8; 32], wallet: T::AccountId, matched: bool },
        TargetingRunCompleted {
            campaign_id: [u8; 32],
            candidates_checked: u32,
            matches_found: u32,
        },
    }

    #[pallet::error]
    pub enum Error<T> {
        CampaignNotFound,
        BloomFilterTooLarge,
        TargetingAlreadyRunning,
        NoCandidates,
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        /// Build and cache a Bloom filter for a campaign's targeting criteria.
        #[pallet::call_index(0)]
        #[pallet::weight(Weight::from_parts(250_000_000, 0))]
        pub fn build_bloom_filter(
            origin: OriginFor<T>,
            campaign_id: [u8; 32],
        ) -> DispatchResult {
            ensure_signed(origin)?;
            let campaign = pallet_awarizon_state::Campaigns::<T>::get(campaign_id)
                .ok_or(Error::<T>::CampaignNotFound)?;
            let filter = BloomFilter::from_targeting_criteria(&campaign.targeting);
            let raw = filter.as_bytes();
            let mut bounded: BoundedVec<u8, ConstU32<8192>> = BoundedVec::new();
            for &byte in raw.iter() {
                bounded
                    .try_push(byte)
                    .map_err(|_| Error::<T>::BloomFilterTooLarge)?;
            }
            let bit_count = raw.iter().map(|b| b.count_ones()).sum::<u32>();
            CampaignBloomFilters::<T>::insert(campaign_id, bounded);
            Self::deposit_event(Event::BloomFilterBuilt { campaign_id, bit_count });
            Ok(())
        }

        /// Two-phase match check: Bloom pre-screen then precise index intersection.
        #[pallet::call_index(1)]
        #[pallet::weight(Weight::from_parts(10_000_000, 0))]
        pub fn check_wallet_match(
            origin: OriginFor<T>,
            campaign_id: [u8; 32],
            wallet: T::AccountId,
        ) -> DispatchResult {
            ensure_signed(origin)?;
            let campaign = pallet_awarizon_state::Campaigns::<T>::get(campaign_id)
                .ok_or(Error::<T>::CampaignNotFound)?;
            let bloom_bytes = CampaignBloomFilters::<T>::get(campaign_id);
            let passed_bloom = match &bloom_bytes {
                Some(bytes) => {
                    let wallet_bytes = wallet.encode();
                    Self::bloom_check_wallet(bytes, &wallet_bytes)
                }
                None => true,
            };
            let matched = if passed_bloom {
                let age =
                    pallet_awarizon_state::WalletAgeIndex::<T>::get(&wallet).unwrap_or_default();
                let activity = pallet_awarizon_state::WalletActivityIndex::<T>::get(&wallet)
                    .unwrap_or_default();
                let categories =
                    pallet_awarizon_state::WalletCategoryHistory::<T>::get(&wallet);
                let region = pallet_awarizon_state::WalletRegionCode::<T>::get(&wallet)
                    .unwrap_or_default();
                let balance = pallet_awarizon_state::DeveloperStakes::<T>::get(&wallet);
                TargetingMatcher::matches_precisely(
                    &campaign.targeting,
                    age,
                    activity,
                    &categories,
                    region,
                    balance,
                )
            } else {
                false
            };
            TargetingMatchCache::<T>::insert(campaign_id, &wallet, matched);
            Self::deposit_event(Event::WalletMatched { campaign_id, wallet, matched });
            Ok(())
        }

        /// Run two-phase targeting against a batch of up to 100 wallets.
        #[pallet::call_index(2)]
        #[pallet::weight(Weight::from_parts(250_000_000, 0))]
        pub fn run_targeting_batch(
            origin: OriginFor<T>,
            campaign_id: [u8; 32],
            wallets: BoundedVec<T::AccountId, ConstU32<100>>,
        ) -> DispatchResult {
            ensure_signed(origin)?;
            ensure!(!wallets.is_empty(), Error::<T>::NoCandidates);
            let campaign = pallet_awarizon_state::Campaigns::<T>::get(campaign_id)
                .ok_or(Error::<T>::CampaignNotFound)?;
            let bloom_bytes = CampaignBloomFilters::<T>::get(campaign_id);
            let mut matches_found = 0u32;
            let candidates_checked = wallets.len() as u32;
            for wallet in wallets.iter() {
                let passed_bloom = match &bloom_bytes {
                    Some(bytes) => {
                        let wallet_bytes = wallet.encode();
                        Self::bloom_check_wallet(bytes, &wallet_bytes)
                    }
                    None => true,
                };
                if passed_bloom {
                    let age = pallet_awarizon_state::WalletAgeIndex::<T>::get(wallet)
                        .unwrap_or_default();
                    let activity = pallet_awarizon_state::WalletActivityIndex::<T>::get(wallet)
                        .unwrap_or_default();
                    let categories =
                        pallet_awarizon_state::WalletCategoryHistory::<T>::get(wallet);
                    let region = pallet_awarizon_state::WalletRegionCode::<T>::get(wallet)
                        .unwrap_or_default();
                    let balance = pallet_awarizon_state::DeveloperStakes::<T>::get(wallet);
                    let matched = TargetingMatcher::matches_precisely(
                        &campaign.targeting,
                        age,
                        activity,
                        &categories,
                        region,
                        balance,
                    );
                    TargetingMatchCache::<T>::insert(campaign_id, wallet, matched);
                    if matched {
                        matches_found = matches_found.saturating_add(1);
                    }
                }
            }
            Self::deposit_event(Event::TargetingRunCompleted {
                campaign_id,
                candidates_checked,
                matches_found,
            });
            Ok(())
        }
    }

    impl<T: Config> Pallet<T> {
        /// Re-run 7-hash Bloom check against stored filter bytes.
        fn bloom_check_wallet(filter_bytes: &[u8], wallet_bytes: &[u8]) -> bool {
            for seed in 0u8..7 {
                let mut input = [0u8; 33];
                input[0] = seed;
                let len = wallet_bytes.len().min(32);
                input[1..1 + len].copy_from_slice(&wallet_bytes[..len]);
                let hash = sp_io::hashing::blake2_256(&input);
                let pos = u16::from_le_bytes([hash[0], hash[1]]) as usize;
                let byte_pos = pos / 8;
                let bit_pos = pos % 8;
                if byte_pos < filter_bytes.len()
                    && (filter_bytes[byte_pos] >> bit_pos) & 1 == 0
                {
                    return false;
                }
            }
            true
        }
    }
}

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;
