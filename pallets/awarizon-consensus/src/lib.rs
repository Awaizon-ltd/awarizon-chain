#![cfg_attr(not(feature = "std"), no_std)]

pub mod geography;
pub mod performance;

pub use pallet::*;

use codec::{Decode, Encode, MaxEncodedLen};
use pallet_awarizon_types::constants::*;
use performance::PerformanceCalculator;
use scale_info::TypeInfo;

/// Registration info for a validator candidate.
#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo, MaxEncodedLen)]
pub struct ValidatorInfo<AccountId>
where
    AccountId: Encode + Decode + TypeInfo + Clone + PartialEq + MaxEncodedLen,
{
    pub account: AccountId,
    pub self_stake: u128,
    pub delegated_stake: u128,
    pub region_code: u8,
    pub country_code: u8,
    pub uptime_bps: u32,
    pub finality_bps: u32,
    pub blocks_bps: u32,
    pub slash_count: u32,
    pub is_active: bool,
    pub epoch_registered: u64,
}

impl<AccountId> ValidatorInfo<AccountId>
where
    AccountId: Encode + Decode + TypeInfo + Clone + PartialEq + MaxEncodedLen,
{
    pub fn performance_score(&self) -> u32 {
        let slash_history_bps = if self.slash_count == 0 {
            10_000u32
        } else {
            10_000u32.saturating_sub(self.slash_count.saturating_mul(1_000))
        };
        PerformanceCalculator::score(
            self.uptime_bps,
            self.finality_bps,
            self.blocks_bps,
            slash_history_bps,
        )
    }

    pub fn effective_rank(&self) -> u128 {
        PerformanceCalculator::effective_rank(self.delegated_stake, self.performance_score())
    }
}

/// A single delegator → validator staking record.
#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo, MaxEncodedLen)]
pub struct Delegation<AccountId>
where
    AccountId: Encode + Decode + TypeInfo + Clone + PartialEq + MaxEncodedLen,
{
    pub delegator: AccountId,
    pub validator: AccountId,
    pub amount: u128,
    pub epoch_delegated: u64,
}

#[frame_support::pallet]
pub mod pallet {
    use super::geography::GeographyEnforcer;
    use super::*;
    use frame_support::{
        pallet_prelude::*,
        traits::ReservableCurrency,
    };
    use frame_system::pallet_prelude::*;
    use sp_runtime::traits::SaturatedConversion;

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type RuntimeEvent: From<Event<Self>>
            + IsType<<Self as frame_system::Config>::RuntimeEvent>;
        type Currency: ReservableCurrency<Self::AccountId>;
        type MinValidatorStake: Get<u128>;
    }

    /// All registered validators.
    #[pallet::storage]
    pub type Validators<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        ValidatorInfo<T::AccountId>,
        OptionQuery,
    >;

    /// Current active validator set (max 121).
    #[pallet::storage]
    pub type ActiveValidators<T: Config> = StorageValue<
        _,
        BoundedVec<T::AccountId, ConstU32<121>>,
        ValueQuery,
    >;

    /// Number of active validators per region code.
    #[pallet::storage]
    pub type RegionValidatorCount<T: Config> =
        StorageMap<_, Blake2_128Concat, u8, u32, ValueQuery>;

    /// Number of active validators per country code.
    #[pallet::storage]
    pub type CountryValidatorCount<T: Config> =
        StorageMap<_, Blake2_128Concat, u8, u32, ValueQuery>;

    /// Total number of active validators.
    #[pallet::storage]
    pub type TotalValidatorCount<T: Config> = StorageValue<_, u32, ValueQuery>;

    /// Delegation records: (delegator, validator) → Delegation.
    #[pallet::storage]
    pub type Delegations<T: Config> = StorageDoubleMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        Blake2_128Concat,
        T::AccountId,
        Delegation<T::AccountId>,
        OptionQuery,
    >;

    /// Total delegated stake per validator.
    #[pallet::storage]
    pub type ValidatorDelegatedStake<T: Config> =
        StorageMap<_, Blake2_128Concat, T::AccountId, u128, ValueQuery>;

    /// Top validator rankings stored per epoch.
    #[pallet::storage]
    pub type EpochValidatorRankings<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        u64,
        BoundedVec<T::AccountId, ConstU32<121>>,
        OptionQuery,
    >;

    /// Current consensus epoch number.
    #[pallet::storage]
    pub type ConsensusEpoch<T: Config> = StorageValue<_, u64, ValueQuery>;

    /// Total RIZ staked as validator self-stake
    #[pallet::storage]
    pub type TotalValidatorSelfStake<T: Config> = StorageValue<_, u128, ValueQuery>;

    /// Total RIZ delegated to validators
    #[pallet::storage]
    pub type TotalValidatorDelegatedStake<T: Config> = StorageValue<_, u128, ValueQuery>;

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        ValidatorRegistered { validator: T::AccountId, self_stake: u128, region_code: u8 },
        ValidatorDeactivated { validator: T::AccountId },
        DelegationAdded { delegator: T::AccountId, validator: T::AccountId, amount: u128 },
        DelegationRemoved { delegator: T::AccountId, validator: T::AccountId, amount: u128 },
        ValidatorPerformanceUpdated {
            validator: T::AccountId,
            performance_score: u32,
            effective_rank: u128,
        },
        EpochElectionCompleted { epoch: u64, validator_count: u32 },
        ValidatorSlashed { validator: T::AccountId, amount: u128, reason: u8 },
    }

    #[pallet::error]
    pub enum Error<T> {
        ValidatorAlreadyRegistered,
        ValidatorNotFound,
        InsufficientStake,
        RegionCapExceeded,
        CountryCapExceeded,
        DelegationNotFound,
        CannotDelegateToSelf,
        ValidatorNotActive,
        AlreadyDelegated,
        MaxValidatorsReached,
        InsufficientBalance,
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        /// Register as a validator candidate with self-stake.
        #[pallet::call_index(0)]
        #[pallet::weight(Weight::from_parts(100_000_000, 0))]
        pub fn register_validator(
            origin: OriginFor<T>,
            self_stake: u128,
            region_code: u8,
            country_code: u8,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;
            ensure!(!Validators::<T>::contains_key(&who), Error::<T>::ValidatorAlreadyRegistered);
            ensure!(
                self_stake >= T::MinValidatorStake::get(),
                Error::<T>::InsufficientStake
            );
            let total = TotalValidatorCount::<T>::get();
            let region_count = RegionValidatorCount::<T>::get(region_code);
            let country_count = CountryValidatorCount::<T>::get(country_code);
            ensure!(
                GeographyEnforcer::check_region_cap(total, region_count),
                Error::<T>::RegionCapExceeded
            );
            ensure!(
                GeographyEnforcer::check_country_cap(total, country_count),
                Error::<T>::CountryCapExceeded
            );
            T::Currency::reserve(&who, self_stake.saturated_into())
                .map_err(|_| Error::<T>::InsufficientBalance)?;
            TotalValidatorSelfStake::<T>::mutate(|t| {
                *t = t.saturating_add(self_stake);
            });
            let current_epoch = ConsensusEpoch::<T>::get();
            let validator_info = ValidatorInfo {
                account: who.clone(),
                self_stake,
                delegated_stake: 0,
                region_code,
                country_code,
                uptime_bps: 10_000,
                finality_bps: 10_000,
                blocks_bps: 10_000,
                slash_count: 0,
                is_active: true,
                epoch_registered: current_epoch,
            };
            Validators::<T>::insert(&who, validator_info);
            RegionValidatorCount::<T>::mutate(region_code, |c| *c = c.saturating_add(1));
            CountryValidatorCount::<T>::mutate(country_code, |c| *c = c.saturating_add(1));
            TotalValidatorCount::<T>::mutate(|c| *c = c.saturating_add(1));
            Self::deposit_event(Event::ValidatorRegistered {
                validator: who,
                self_stake,
                region_code,
            });
            Ok(())
        }

        /// Delegate stake to an active validator.
        #[pallet::call_index(1)]
        #[pallet::weight(Weight::from_parts(50_000_000, 0))]
        pub fn delegate_stake(
            origin: OriginFor<T>,
            validator: T::AccountId,
            amount: u128,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;
            ensure!(who != validator, Error::<T>::CannotDelegateToSelf);
            ensure!(amount > 0, Error::<T>::InsufficientStake);
            let validator_info =
                Validators::<T>::get(&validator).ok_or(Error::<T>::ValidatorNotFound)?;
            ensure!(validator_info.is_active, Error::<T>::ValidatorNotActive);
            ensure!(
                !Delegations::<T>::contains_key(&who, &validator),
                Error::<T>::AlreadyDelegated
            );
            T::Currency::reserve(&who, amount.saturated_into())
                .map_err(|_| Error::<T>::InsufficientBalance)?;
            TotalValidatorDelegatedStake::<T>::mutate(|t| {
                *t = t.saturating_add(amount);
            });
            let current_epoch = ConsensusEpoch::<T>::get();
            let delegation = Delegation {
                delegator: who.clone(),
                validator: validator.clone(),
                amount,
                epoch_delegated: current_epoch,
            };
            Delegations::<T>::insert(&who, &validator, delegation);
            ValidatorDelegatedStake::<T>::mutate(&validator, |s| {
                *s = s.saturating_add(amount);
            });
            Validators::<T>::mutate(&validator, |v| {
                if let Some(ref mut info) = v {
                    info.delegated_stake = info.delegated_stake.saturating_add(amount);
                }
            });
            Self::deposit_event(Event::DelegationAdded { delegator: who, validator, amount });
            Ok(())
        }

        /// Remove a delegation and unreserve the staked funds.
        #[pallet::call_index(2)]
        #[pallet::weight(Weight::from_parts(50_000_000, 0))]
        pub fn undelegate_stake(
            origin: OriginFor<T>,
            validator: T::AccountId,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;
            let delegation =
                Delegations::<T>::get(&who, &validator).ok_or(Error::<T>::DelegationNotFound)?;
            T::Currency::unreserve(&who, delegation.amount.saturated_into());
            TotalValidatorDelegatedStake::<T>::mutate(|t| {
                *t = t.saturating_sub(delegation.amount);
            });
            ValidatorDelegatedStake::<T>::mutate(&validator, |s| {
                *s = s.saturating_sub(delegation.amount);
            });
            Validators::<T>::mutate(&validator, |v| {
                if let Some(ref mut info) = v {
                    info.delegated_stake =
                        info.delegated_stake.saturating_sub(delegation.amount);
                }
            });
            Delegations::<T>::remove(&who, &validator);
            Self::deposit_event(Event::DelegationRemoved {
                delegator: who,
                validator,
                amount: delegation.amount,
            });
            Ok(())
        }

        /// Update on-chain performance scores for a validator.
        #[pallet::call_index(3)]
        #[pallet::weight(Weight::from_parts(10_000_000, 0))]
        pub fn update_performance(
            origin: OriginFor<T>,
            validator: T::AccountId,
            uptime_bps: u32,
            finality_bps: u32,
            blocks_bps: u32,
        ) -> DispatchResult {
            ensure_signed(origin)?;
            let mut info =
                Validators::<T>::get(&validator).ok_or(Error::<T>::ValidatorNotFound)?;
            info.uptime_bps = uptime_bps.min(10_000);
            info.finality_bps = finality_bps.min(10_000);
            info.blocks_bps = blocks_bps.min(10_000);
            let performance_score = info.performance_score();
            let effective_rank = info.effective_rank();
            Validators::<T>::insert(&validator, info);
            Self::deposit_event(Event::ValidatorPerformanceUpdated {
                validator,
                performance_score,
                effective_rank,
            });
            Ok(())
        }

        /// Run an epoch election — select up to TARGET_VALIDATORS validators by
        /// effective rank while respecting geographic caps.
        #[pallet::call_index(4)]
        #[pallet::weight(Weight::from_parts(250_000_000, 0))]
        pub fn run_epoch_election(
            origin: OriginFor<T>,
            epoch: u64,
        ) -> DispatchResult {
            ensure_signed(origin)?;
            let mut ranked: BoundedVec<(u128, T::AccountId), ConstU32<1000>> =
                BoundedVec::default();
            for (account, info) in Validators::<T>::iter() {
                if info.is_active {
                    let rank = info.effective_rank();
                    ranked
                        .try_push((rank, account))
                        .map_err(|_| Error::<T>::MaxValidatorsReached)?;
                }
            }
            ranked.sort_by(|a, b| b.0.cmp(&a.0));
            let mut selected: BoundedVec<T::AccountId, ConstU32<121>> = BoundedVec::default();
            let mut region_counts: BoundedVec<(u8, u32), ConstU32<16>> = BoundedVec::default();
            let mut country_counts: BoundedVec<(u8, u32), ConstU32<256>> =
                BoundedVec::default();
            for (_, account) in ranked.iter() {
                if selected.len() >= TARGET_VALIDATORS as usize {
                    break;
                }
                if let Some(info) = Validators::<T>::get(account) {
                    let region_count = region_counts
                        .iter()
                        .find(|(r, _)| *r == info.region_code)
                        .map(|(_, c)| *c)
                        .unwrap_or(0);
                    let country_count = country_counts
                        .iter()
                        .find(|(c, _)| *c == info.country_code)
                        .map(|(_, c)| *c)
                        .unwrap_or(0);
                    let total = selected.len() as u32;
                    if GeographyEnforcer::check_region_cap(total, region_count)
                        && GeographyEnforcer::check_country_cap(total, country_count)
                    {
                        let _ = selected.try_push(account.clone());
                        if let Some(entry) =
                            region_counts.iter_mut().find(|(r, _)| *r == info.region_code)
                        {
                            entry.1 = entry.1.saturating_add(1);
                        } else {
                            let _ = region_counts.try_push((info.region_code, 1));
                        }
                        if let Some(entry) =
                            country_counts.iter_mut().find(|(c, _)| *c == info.country_code)
                        {
                            entry.1 = entry.1.saturating_add(1);
                        } else {
                            let _ = country_counts.try_push((info.country_code, 1));
                        }
                    }
                }
            }
            let validator_count = selected.len() as u32;
            EpochValidatorRankings::<T>::insert(epoch, selected.clone());
            ActiveValidators::<T>::put(selected);
            ConsensusEpoch::<T>::put(epoch);
            Self::deposit_event(Event::EpochElectionCompleted { epoch, validator_count });
            Ok(())
        }

        /// Slash a validator for misbehavior (root only). Burns 10% of self-stake.
        #[pallet::call_index(5)]
        #[pallet::weight(Weight::from_parts(50_000_000, 0))]
        pub fn slash_validator(
            origin: OriginFor<T>,
            validator: T::AccountId,
            reason: u8,
        ) -> DispatchResult {
            ensure_root(origin)?;
            let mut info =
                Validators::<T>::get(&validator).ok_or(Error::<T>::ValidatorNotFound)?;
            let slash_amount = info.self_stake / 10;
            let (imbalance, _) =
                T::Currency::slash_reserved(&validator, slash_amount.saturated_into());
            drop(imbalance); // burn: reduces TotalIssuance
            TotalValidatorSelfStake::<T>::mutate(|t| {
                *t = t.saturating_sub(slash_amount);
            });
            info.self_stake = info.self_stake.saturating_sub(slash_amount);
            info.slash_count = info.slash_count.saturating_add(1);
            if info.slash_count >= 3 {
                info.is_active = false;
                RegionValidatorCount::<T>::mutate(info.region_code, |c| {
                    *c = c.saturating_sub(1);
                });
                CountryValidatorCount::<T>::mutate(info.country_code, |c| {
                    *c = c.saturating_sub(1);
                });
                TotalValidatorCount::<T>::mutate(|c| *c = c.saturating_sub(1));
                Self::deposit_event(Event::ValidatorDeactivated {
                    validator: validator.clone(),
                });
            }
            Validators::<T>::insert(&validator, info);
            Self::deposit_event(Event::ValidatorSlashed { validator, amount: slash_amount, reason });
            Ok(())
        }
    }
}

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;
