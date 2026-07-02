#![cfg_attr(not(feature = "std"), no_std)]

extern crate alloc;

pub use pallet::*;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

#[frame_support::pallet]
pub mod pallet {
    use alloc::vec::Vec;
    use frame_support::{
        pallet_prelude::*,
        traits::ConstU32,
        BoundedVec,
    };
    use frame_system::pallet_prelude::*;
    use pallet_awarizon_types::{
        IdentityRecord,
        REPUTATION_BASE_IDENTITY, REPUTATION_PER_LINKED_ADDRESS,
        MAX_REPUTATION_SCORE, MIN_RIZ_NAME_LENGTH, MAX_RIZ_NAME_LENGTH,
    };

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type RuntimeEvent: From<Event<Self>>
            + IsType<<Self as frame_system::Config>::RuntimeEvent>;
        type WeightInfo: WeightInfo;
    }

    pub trait WeightInfo {
        fn register_identity() -> Weight;
        fn update_identity() -> Weight;
        fn transfer_name() -> Weight;
        fn recalculate_reputation() -> Weight;
        fn set_verified() -> Weight;
    }

    impl WeightInfo for () {
        fn register_identity() -> Weight { Weight::from_parts(100_000_000, 0) }
        fn update_identity() -> Weight { Weight::from_parts(50_000_000, 0) }
        fn transfer_name() -> Weight { Weight::from_parts(100_000_000, 0) }
        fn recalculate_reputation() -> Weight { Weight::from_parts(10_000_000, 0) }
        fn set_verified() -> Weight { Weight::from_parts(10_000_000, 0) }
    }

    // ================================================================
    // Storage
    // ================================================================

    /// Maps .riz name bytes (lowercase, no suffix) to AccountId.
    #[pallet::storage]
    pub type RizNameRegistry<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        BoundedVec<u8, ConstU32<32>>,
        T::AccountId,
    >;

    /// Maps AccountId to IdentityRecord.
    #[pallet::storage]
    pub type IdentityRecords<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        IdentityRecord<BlockNumberFor<T>>,
    >;

    /// Total registered identities.
    #[pallet::storage]
    pub type TotalIdentities<T: Config> = StorageValue<_, u32, ValueQuery>;

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    // ================================================================
    // Events
    // ================================================================

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        IdentityRegistered {
            account: T::AccountId,
            riz_name: Option<Vec<u8>>,
        },
        IdentityUpdated {
            account: T::AccountId,
        },
        ReputationUpdated {
            account: T::AccountId,
            new_score: u32,
        },
        NameTransferred {
            name: Vec<u8>,
            from: T::AccountId,
            to: T::AccountId,
        },
    }

    // ================================================================
    // Errors
    // ================================================================

    #[pallet::error]
    pub enum Error<T> {
        NameAlreadyTaken,
        NameTooShort,
        NameTooLong,
        NameInvalidCharacters,
        NameInvalidFormat,
        IdentityAlreadyRegistered,
        IdentityNotFound,
        NotNameOwner,
        TransferTargetHasName,
    }

    // ================================================================
    // Calls
    // ================================================================

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        #[pallet::call_index(0)]
        #[pallet::weight(T::WeightInfo::register_identity())]
        pub fn register_identity(
            origin: OriginFor<T>,
            riz_name: Option<Vec<u8>>,
            display_name: Option<Vec<u8>>,
            bio: Option<Vec<u8>>,
            avatar_uri: Option<Vec<u8>>,
            website: Option<Vec<u8>>,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            ensure!(
                !IdentityRecords::<T>::contains_key(&who),
                Error::<T>::IdentityAlreadyRegistered
            );

            if let Some(ref name_bytes) = riz_name {
                Self::validate_riz_name(name_bytes)?;
                let bounded_name: BoundedVec<u8, ConstU32<32>> = name_bytes
                    .clone()
                    .try_into()
                    .map_err(|_| Error::<T>::NameTooLong)?;
                ensure!(
                    !RizNameRegistry::<T>::contains_key(&bounded_name),
                    Error::<T>::NameAlreadyTaken
                );
                RizNameRegistry::<T>::insert(&bounded_name, &who);
            }

            let block = frame_system::Pallet::<T>::block_number();
            let record = IdentityRecord {
                riz_name: riz_name.as_ref().map(|n| n.clone().try_into().unwrap_or_default()),
                display_name: display_name.map(|d| d.try_into().unwrap_or_default()),
                bio: bio.map(|b| b.try_into().unwrap_or_default()),
                avatar_uri: avatar_uri.map(|a| a.try_into().unwrap_or_default()),
                website: website.map(|w| w.try_into().unwrap_or_default()),
                registered_at: block,
                verified: false,
                reputation_score: REPUTATION_BASE_IDENTITY,
            };

            IdentityRecords::<T>::insert(&who, record);
            TotalIdentities::<T>::mutate(|t| *t = t.saturating_add(1));

            Self::deposit_event(Event::IdentityRegistered { account: who, riz_name });
            Ok(())
        }

        #[pallet::call_index(1)]
        #[pallet::weight(T::WeightInfo::update_identity())]
        pub fn update_identity(
            origin: OriginFor<T>,
            display_name: Option<Vec<u8>>,
            bio: Option<Vec<u8>>,
            avatar_uri: Option<Vec<u8>>,
            website: Option<Vec<u8>>,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            IdentityRecords::<T>::try_mutate(&who, |maybe_record| -> DispatchResult {
                let record = maybe_record.as_mut().ok_or(Error::<T>::IdentityNotFound)?;
                if let Some(d) = display_name {
                    record.display_name = Some(d.try_into().unwrap_or_default());
                }
                if let Some(b) = bio {
                    record.bio = Some(b.try_into().unwrap_or_default());
                }
                if let Some(a) = avatar_uri {
                    record.avatar_uri = Some(a.try_into().unwrap_or_default());
                }
                if let Some(w) = website {
                    record.website = Some(w.try_into().unwrap_or_default());
                }
                Self::deposit_event(Event::IdentityUpdated { account: who.clone() });
                Ok(())
            })
        }

        #[pallet::call_index(2)]
        #[pallet::weight(T::WeightInfo::transfer_name())]
        pub fn transfer_name(origin: OriginFor<T>, to: T::AccountId) -> DispatchResult {
            let who = ensure_signed(origin)?;

            let sender_record = IdentityRecords::<T>::get(&who)
                .ok_or(Error::<T>::IdentityNotFound)?;
            let name = sender_record.riz_name.clone().ok_or(Error::<T>::IdentityNotFound)?;

            if let Some(target_record) = IdentityRecords::<T>::get(&to) {
                ensure!(target_record.riz_name.is_none(), Error::<T>::TransferTargetHasName);
            }

            RizNameRegistry::<T>::insert(&name, &to);

            IdentityRecords::<T>::mutate(&who, |r| {
                if let Some(record) = r.as_mut() {
                    record.riz_name = None;
                }
            });

            IdentityRecords::<T>::mutate(&to, |r| {
                if let Some(record) = r.as_mut() {
                    record.riz_name = Some(name.clone());
                }
            });

            Self::deposit_event(Event::NameTransferred {
                name: name.into_inner(),
                from: who,
                to,
            });
            Ok(())
        }

        #[pallet::call_index(3)]
        #[pallet::weight(T::WeightInfo::recalculate_reputation())]
        pub fn recalculate_reputation(
            origin: OriginFor<T>,
            account: T::AccountId,
        ) -> DispatchResult {
            ensure_signed(origin)?;
            let new_score = Self::compute_reputation(&account);
            IdentityRecords::<T>::try_mutate(&account, |maybe_record| -> DispatchResult {
                let record = maybe_record.as_mut().ok_or(Error::<T>::IdentityNotFound)?;
                record.reputation_score = new_score;
                Ok(())
            })?;
            Self::deposit_event(Event::ReputationUpdated { account, new_score });
            Ok(())
        }

        #[pallet::call_index(4)]
        #[pallet::weight(T::WeightInfo::set_verified())]
        pub fn set_verified(
            origin: OriginFor<T>,
            account: T::AccountId,
            verified: bool,
        ) -> DispatchResult {
            ensure_root(origin)?;
            IdentityRecords::<T>::try_mutate(&account, |maybe_record| -> DispatchResult {
                let record = maybe_record.as_mut().ok_or(Error::<T>::IdentityNotFound)?;
                record.verified = verified;
                Ok(())
            })?;
            Ok(())
        }
    }

    // ================================================================
    // Helpers
    // ================================================================

    impl<T: Config> Pallet<T> {
        pub fn validate_riz_name(name: &[u8]) -> DispatchResult {
            ensure!(name.len() >= MIN_RIZ_NAME_LENGTH as usize, Error::<T>::NameTooShort);
            ensure!(name.len() <= MAX_RIZ_NAME_LENGTH as usize, Error::<T>::NameTooLong);
            ensure!(
                name[0] != b'-' && name[name.len() - 1] != b'-',
                Error::<T>::NameInvalidFormat
            );
            for byte in name {
                ensure!(
                    byte.is_ascii_lowercase() || byte.is_ascii_digit() || *byte == b'-',
                    Error::<T>::NameInvalidCharacters
                );
            }
            Ok(())
        }

        pub fn compute_reputation(account: &T::AccountId) -> u32 {
            let mut score: u32 = 0;
            if IdentityRecords::<T>::contains_key(account) {
                score = score.saturating_add(REPUTATION_BASE_IDENTITY);
            }
            let link_count = Self::read_linked_count(account);
            score = score
                .saturating_add(link_count.saturating_mul(REPUTATION_PER_LINKED_ADDRESS));
            score.min(MAX_REPUTATION_SCORE)
        }

        fn read_linked_count(_account: &T::AccountId) -> u32 {
            // Simplified: pallet-awarizon-links writes to a shared StorageMap
            // (IdentityLinkedCount) for cross-pallet score integration.
            0
        }

        pub fn trigger_reputation_update(account: &T::AccountId) {
            if IdentityRecords::<T>::contains_key(account) {
                let score = Self::compute_reputation(account);
                IdentityRecords::<T>::mutate(account, |r| {
                    if let Some(record) = r.as_mut() {
                        record.reputation_score = score;
                    }
                });
            }
        }
    }
}
