#![cfg_attr(not(feature = "std"), no_std)]

pub mod geography;
pub mod performance;

pub use pallet::*;

use codec::{Decode, DecodeWithMemTracking, Encode, MaxEncodedLen};
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

    /// Commission rate 0-20 percent. Validator keeps this % of the delegator reward pool.
    pub commission: u32,
    /// Accumulated reward claimable by this validator. Resets to 0 on claim.
    pub pending_validator_reward: u128,
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

/// Reasons a validator can be slashed for cause (offline / equivocation), distinct from
/// the flat-rate root-only `slash_validator` extrinsic that predates the staking economy.
#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, DecodeWithMemTracking, TypeInfo, MaxEncodedLen)]
pub enum SlashReason {
    Offline,
    DoubleSign,
}

/// Snapshot of one epoch's reward distribution, for historical queries.
#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo, MaxEncodedLen)]
pub struct EpochRewardRecord {
    pub epoch: u64,
    pub fees_collected: u128,
    pub yield_emission: u128,
    pub total_pool: u128,
    pub burned: u128,
    pub to_inbox: u128,
    pub to_staking: u128,
    pub validators_rewarded: u32,
    pub delegators_rewarded: u32,
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
        traits::{Currency, ExistenceRequirement, Imbalance, ReservableCurrency, WithdrawReasons},
        PalletId,
    };
    use frame_system::pallet_prelude::*;
    use sp_runtime::traits::{AccountIdConversion, SaturatedConversion};

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type RuntimeEvent: From<Event<Self>>
            + IsType<<Self as frame_system::Config>::RuntimeEvent>;
        type Currency: ReservableCurrency<Self::AccountId>;
        type MinValidatorStake: Get<u128>;

        /// PalletId for the validator yield reserve account. Holds 250M RIZ, emits daily to stakers.
        #[pallet::constant]
        type ValidatorRewardsPalletId: Get<PalletId>;

        /// PalletId for epoch fee collection pool.
        #[pallet::constant]
        type FeePoolPalletId: Get<PalletId>;

        /// PalletId for slash insurance pool.
        #[pallet::constant]
        type InsurancePalletId: Get<PalletId>;

        /// Account that receives the "inbox" share of each epoch's reward distribution.
        type InboxReserveAccount: Get<Self::AccountId>;

        /// Origin that can call sudo-only extrinsics (double-sign slashing, yield reserve init).
        type ForceOrigin: EnsureOrigin<Self::RuntimeOrigin>;
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

    /// Current active validator set.
    /// Capped at MAX_ACTIVE_VALIDATORS (21 for testnet).
    /// Increased via governance for mainnet.
    #[pallet::storage]
    pub type ActiveValidators<T: Config> = StorageValue<
        _,
        BoundedVec<T::AccountId, ConstU32<21>>,
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
        BoundedVec<T::AccountId, ConstU32<21>>,
        OptionQuery,
    >;

    /// Optional reward destination for a validator. When set, claim_validator_reward()
    /// sends rewards to this account instead of the validator's own account.
    ///
    /// Used by Validator-as-a-Service:
    ///   → Operator runs the node (validator key)
    ///   → Customer sets their wallet here
    ///   → Rewards flow to customer automatically
    #[pallet::storage]
    pub type ValidatorRewardDestination<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId, // validator account
        T::AccountId, // reward recipient
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

    /// Total fees collected in the current epoch. Incremented by `deposit_fee()`,
    /// reset when `distribute_epoch_rewards` runs.
    #[pallet::storage]
    pub type EpochFeesCollected<T: Config> = StorageValue<_, u128, ValueQuery>;

    /// Pending reward for each (delegator, validator) pair. Accumulates each epoch,
    /// cleared on claim.
    #[pallet::storage]
    pub type PendingDelegatorRewards<T: Config> = StorageDoubleMap<
        _,
        Blake2_128Concat, T::AccountId, // delegator
        Blake2_128Concat, T::AccountId, // validator
        u128,
        ValueQuery,
    >;

    /// Total RIZ remaining in the yield reserve. Starts at 250M, decreases by daily emission.
    #[pallet::storage]
    pub type YieldReserveRemaining<T: Config> = StorageValue<_, u128, ValueQuery>;

    /// Balance in the slash insurance pool.
    #[pallet::storage]
    pub type InsurancePoolBalance<T: Config> = StorageValue<_, u128, ValueQuery>;

    /// Reward distribution record per epoch.
    #[pallet::storage]
    pub type EpochRewardHistory<T: Config> = StorageMap<
        _,
        Blake2_128Concat, u64,
        EpochRewardRecord,
        OptionQuery,
    >;

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

        CommissionUpdated { validator: T::AccountId, commission: u32 },
        RewardsDistributed {
            epoch: u64,
            total_distributed: u128,
            total_burned: u128,
            validators_rewarded: u32,
            delegators_rewarded: u32,
        },
        ValidatorRewardClaimed { validator: T::AccountId, amount: u128 },
        DelegatorRewardClaimed { delegator: T::AccountId, amount: u128 },
        /// Slash applied for cause (offline / double-sign), distinct from the flat-rate
        /// `ValidatorSlashed` event emitted by the pre-existing root-only `slash_validator` call.
        MisbehaviorSlashed {
            validator: T::AccountId,
            amount: u128,
            reason: SlashReason,
            burned: u128,
            to_insurance: u128,
        },
        DelegatorCompensated { delegator: T::AccountId, amount: u128 },
        YieldReserveEmission { epoch: u64, amount: u128, remaining: u128 },
        FeeDeposited { amount: u128 },
        /// Validator reward destination updated.
        RewardDestinationSet { validator: T::AccountId, destination: T::AccountId },
        /// Validator reward destination cleared.
        RewardDestinationCleared { validator: T::AccountId },
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

        CommissionTooHigh,
        NoPendingReward,
        InsufficientInsuranceFund,
        SlashExceedsStake,
        NotDelegating,
        NoSlashOccurred,
        InsufficientEvidence,
        YieldReserveEmpty,
        /// Caller is not a registered validator.
        NotAValidator,
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
                commission: 10, // default 10%
                pending_validator_reward: 0,
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
            let mut selected: BoundedVec<T::AccountId, ConstU32<21>> = BoundedVec::default();
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

        /// Validator sets their commission rate (0-20%). Takes effect from the next epoch.
        #[pallet::call_index(6)]
        #[pallet::weight(Weight::from_parts(10_000_000, 0))]
        pub fn set_commission(origin: OriginFor<T>, commission: u32) -> DispatchResult {
            let who = ensure_signed(origin)?;
            ensure!(commission <= MAX_COMMISSION, Error::<T>::CommissionTooHigh);
            Validators::<T>::try_mutate(&who, |maybe| -> DispatchResult {
                let info = maybe.as_mut().ok_or(Error::<T>::ValidatorNotFound)?;
                info.commission = commission;
                Ok(())
            })?;
            Self::deposit_event(Event::CommissionUpdated { validator: who, commission });
            Ok(())
        }

        /// Validator claims accumulated epoch rewards. Sent to the validator's own
        /// account, unless a reward destination has been set via
        /// `set_reward_destination` — in that case it goes there instead (Validator-
        /// as-a-Service: the operator runs the node, the customer receives rewards).
        #[pallet::call_index(7)]
        #[pallet::weight(Weight::from_parts(50_000_000, 0))]
        pub fn claim_validator_reward(origin: OriginFor<T>) -> DispatchResult {
            let who = ensure_signed(origin)?;
            let pending = Validators::<T>::try_mutate(&who, |maybe| -> Result<u128, DispatchError> {
                let info = maybe.as_mut().ok_or(Error::<T>::ValidatorNotFound)?;
                ensure!(info.pending_validator_reward > 0, Error::<T>::NoPendingReward);
                let amt = info.pending_validator_reward;
                info.pending_validator_reward = 0;
                Ok(amt)
            })?;
            let recipient = ValidatorRewardDestination::<T>::get(&who).unwrap_or_else(|| who.clone());
            T::Currency::transfer(
                &Self::fee_pool_account(),
                &recipient,
                pending.saturated_into(),
                ExistenceRequirement::AllowDeath,
            )?;
            Self::deposit_event(Event::ValidatorRewardClaimed { validator: who, amount: pending });
            Ok(())
        }

        /// Delegator claims rewards from a specific validator.
        #[pallet::call_index(8)]
        #[pallet::weight(Weight::from_parts(50_000_000, 0))]
        pub fn claim_delegation_reward(
            origin: OriginFor<T>,
            validator: T::AccountId,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;
            let pending = PendingDelegatorRewards::<T>::get(&who, &validator);
            ensure!(pending > 0, Error::<T>::NoPendingReward);
            PendingDelegatorRewards::<T>::remove(&who, &validator);
            T::Currency::transfer(
                &Self::fee_pool_account(),
                &who,
                pending.saturated_into(),
                ExistenceRequirement::AllowDeath,
            )?;
            Self::deposit_event(Event::DelegatorRewardClaimed { delegator: who, amount: pending });
            Ok(())
        }

        /// Claim rewards from ALL validators at once.
        #[pallet::call_index(9)]
        #[pallet::weight(Weight::from_parts(100_000_000, 0))]
        pub fn claim_all_delegation_rewards(origin: OriginFor<T>) -> DispatchResult {
            let who = ensure_signed(origin)?;
            let total: u128 = PendingDelegatorRewards::<T>::iter_prefix(&who)
                .map(|(_, amount)| amount)
                .sum();
            ensure!(total > 0, Error::<T>::NoPendingReward);
            let _ = PendingDelegatorRewards::<T>::clear_prefix(&who, u32::MAX, None);
            T::Currency::transfer(
                &Self::fee_pool_account(),
                &who,
                total.saturated_into(),
                ExistenceRequirement::AllowDeath,
            )?;
            Self::deposit_event(Event::DelegatorRewardClaimed { delegator: who, amount: total });
            Ok(())
        }

        /// Report validator offline (requires evidence). Callable by any signed account.
        #[pallet::call_index(10)]
        #[pallet::weight(Weight::from_parts(50_000_000, 0))]
        pub fn report_offline(
            origin: OriginFor<T>,
            validator: T::AccountId,
            missed_blocks: u32,
        ) -> DispatchResult {
            let _who = ensure_signed(origin)?;
            ensure!(
                missed_blocks >= OFFLINE_SLASH_THRESHOLD,
                Error::<T>::InsufficientEvidence
            );
            let info = Validators::<T>::get(&validator).ok_or(Error::<T>::ValidatorNotFound)?;
            ensure!(info.is_active, Error::<T>::ValidatorNotActive);
            Self::apply_cause_slash(&validator, SlashReason::Offline)
        }

        /// Report double signing (sudo only).
        #[pallet::call_index(11)]
        #[pallet::weight(Weight::from_parts(50_000_000, 0))]
        pub fn report_double_sign(origin: OriginFor<T>, validator: T::AccountId) -> DispatchResult {
            T::ForceOrigin::ensure_origin(origin)?;
            Self::apply_cause_slash(&validator, SlashReason::DoubleSign)
        }

        /// Delegator claims slash compensation from the insurance pool after their
        /// validator was slashed.
        #[pallet::call_index(12)]
        #[pallet::weight(Weight::from_parts(50_000_000, 0))]
        pub fn claim_slash_compensation(
            origin: OriginFor<T>,
            validator: T::AccountId,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;
            let delegation =
                Delegations::<T>::get(&who, &validator).ok_or(Error::<T>::NotDelegating)?;
            let info = Validators::<T>::get(&validator).ok_or(Error::<T>::ValidatorNotFound)?;
            ensure!(info.slash_count > 0, Error::<T>::NoSlashOccurred);
            let insurance = InsurancePoolBalance::<T>::get();
            ensure!(insurance > 0, Error::<T>::InsufficientInsuranceFund);

            // Pro-rata compensation, capped at 10% of the pool.
            let compensation = if info.delegated_stake > 0 {
                (insurance.saturating_mul(delegation.amount) / info.delegated_stake)
                    .min(insurance / 10)
            } else {
                0
            };
            ensure!(compensation > 0, Error::<T>::NoPendingReward);

            InsurancePoolBalance::<T>::mutate(|b| *b = b.saturating_sub(compensation));
            T::Currency::transfer(
                &Self::insurance_account(),
                &who,
                compensation.saturated_into(),
                ExistenceRequirement::AllowDeath,
            )?;
            Self::deposit_event(Event::DelegatorCompensated { delegator: who, amount: compensation });
            Ok(())
        }

        /// Sudo: initialize the yield reserve remaining counter. Call once after chain
        /// launch to sync storage with the actual balance in the yield reserve account.
        #[pallet::call_index(13)]
        #[pallet::weight(Weight::from_parts(10_000_000, 0))]
        pub fn init_yield_reserve(origin: OriginFor<T>) -> DispatchResult {
            T::ForceOrigin::ensure_origin(origin)?;
            YieldReserveRemaining::<T>::put(YIELD_RESERVE_TOTAL);
            Ok(())
        }

        /// Set a reward destination for this validator. When set, all future
        /// claim_validator_reward() calls send rewards to this account instead of the
        /// validator's own account.
        ///
        /// Used by managed validator operators to route epoch rewards to their
        /// customers. Caller must be a registered validator.
        ///
        /// To remove the destination, call clear_reward_destination().
        #[pallet::call_index(14)]
        #[pallet::weight(Weight::from_parts(50_000_000, 0))]
        pub fn set_reward_destination(
            origin: OriginFor<T>,
            destination: T::AccountId,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;
            ensure!(Validators::<T>::contains_key(&who), Error::<T>::NotAValidator);
            ValidatorRewardDestination::<T>::insert(&who, &destination);
            Self::deposit_event(Event::RewardDestinationSet { validator: who, destination });
            Ok(())
        }

        /// Clear the reward destination for this validator. After clearing, rewards
        /// go back to the validator's own account.
        #[pallet::call_index(15)]
        #[pallet::weight(Weight::from_parts(30_000_000, 0))]
        pub fn clear_reward_destination(origin: OriginFor<T>) -> DispatchResult {
            let who = ensure_signed(origin)?;
            ensure!(Validators::<T>::contains_key(&who), Error::<T>::NotAValidator);
            ValidatorRewardDestination::<T>::remove(&who);
            Self::deposit_event(Event::RewardDestinationCleared { validator: who });
            Ok(())
        }
    }

    // ================================================================
    // STAKING ECONOMY — internal helpers (not extrinsics)
    // ================================================================

    impl<T: Config> Pallet<T> {
        /// Called by the runtime fee handler every block to record fees into the epoch pool.
        pub fn deposit_fee(amount: u128) {
            if amount == 0 {
                return;
            }
            EpochFeesCollected::<T>::mutate(|f| *f = f.saturating_add(amount));
            Self::deposit_event(Event::FeeDeposited { amount });
        }

        fn fee_pool_account() -> T::AccountId {
            T::FeePoolPalletId::get().into_account_truncating()
        }

        fn yield_reserve_account() -> T::AccountId {
            T::ValidatorRewardsPalletId::get().into_account_truncating()
        }

        fn insurance_account() -> T::AccountId {
            T::InsurancePalletId::get().into_account_truncating()
        }

        /// Internal slash for cause (offline / double-sign). Distinct from the pre-existing
        /// `slash_validator` extrinsic — kept separate so that call is untouched.
        fn apply_cause_slash(validator: &T::AccountId, reason: SlashReason) -> DispatchResult {
            let slash_per_mille = match reason {
                SlashReason::Offline => SLASH_OFFLINE,
                SlashReason::DoubleSign => SLASH_DOUBLE_SIGN,
            };

            let info = Validators::<T>::get(validator).ok_or(Error::<T>::ValidatorNotFound)?;
            let total_stake = info.self_stake.saturating_add(info.delegated_stake);

            // Delegated stake is reserved under each delegator's own account, not the
            // validator's — only self_stake is actually reserved here, so cap the target
            // slash amount at that, even though the rate is computed off total stake.
            let target_slash = total_stake.saturating_mul(slash_per_mille as u128) / 1000u128;
            let slash_amount = target_slash.min(info.self_stake);

            if slash_amount == 0 {
                return Ok(());
            }

            let (imbalance, _) =
                T::Currency::slash_reserved(validator, slash_amount.saturated_into());
            let actual: u128 = imbalance.peek().saturated_into();

            let burn_amount = actual.saturating_mul(SLASH_BURN_PCT as u128) / 100u128;
            let insurance_amount = actual.saturating_sub(burn_amount);

            let (burn_imbalance, insurance_imbalance) =
                imbalance.split(burn_amount.saturated_into());
            drop(burn_imbalance); // burn: reduces TotalIssuance

            if insurance_amount > 0 {
                let insurance_acct = Self::insurance_account();
                T::Currency::resolve_creating(&insurance_acct, insurance_imbalance);
                InsurancePoolBalance::<T>::mutate(|b| *b = b.saturating_add(insurance_amount));
            } else {
                drop(insurance_imbalance);
            }

            Validators::<T>::mutate(validator, |maybe| {
                if let Some(info) = maybe {
                    info.self_stake = info.self_stake.saturating_sub(slash_amount);
                    info.slash_count = info.slash_count.saturating_add(1);
                    if matches!(reason, SlashReason::DoubleSign) {
                        info.is_active = false;
                    }
                }
            });

            Self::deposit_event(Event::MisbehaviorSlashed {
                validator: validator.clone(),
                amount: actual,
                reason,
                burned: burn_amount,
                to_insurance: insurance_amount,
            });

            Ok(())
        }

        /// Core epoch reward distribution. Called once per epoch via the
        /// `EpochRewardDistributor` hook from awarizon-state's epoch advance.
        pub fn distribute_epoch_rewards(epoch: u64) -> DispatchResult {
            // ── 1. Collect epoch fees ─────────────────────────────────
            let fees = EpochFeesCollected::<T>::take();

            // ── 2. Daily yield emission ───────────────────────────────
            let yield_remaining = YieldReserveRemaining::<T>::get();
            let yield_emission = if yield_remaining > 0 {
                let emit = YIELD_RESERVE_DAILY_EMISSION.min(yield_remaining);
                let yield_acct = Self::yield_reserve_account();
                let fee_pool = Self::fee_pool_account();

                let result = T::Currency::transfer(
                    &yield_acct,
                    &fee_pool,
                    emit.saturated_into(),
                    ExistenceRequirement::AllowDeath,
                );

                if result.is_ok() {
                    YieldReserveRemaining::<T>::mutate(|r| *r = r.saturating_sub(emit));
                    Self::deposit_event(Event::YieldReserveEmission {
                        epoch,
                        amount: emit,
                        remaining: yield_remaining.saturating_sub(emit),
                    });
                    emit
                } else {
                    0u128
                }
            } else {
                0u128
            };

            // ── 3. Total pool ──────────────────────────────────────────
            let total_pool = fees.saturating_add(yield_emission);
            if total_pool == 0 {
                return Ok(());
            }

            // ── 4. Split ────────────────────────────────────────────────
            let staking_pool = total_pool.saturating_mul(FEE_SPLIT_STAKING_PCT as u128) / 100u128;
            let inbox_amount = total_pool.saturating_mul(FEE_SPLIT_INBOX_PCT as u128) / 100u128;
            let burn_amount = total_pool.saturating_sub(staking_pool).saturating_sub(inbox_amount);

            let fee_pool = Self::fee_pool_account();

            // ── 5. Burn ─────────────────────────────────────────────────
            if burn_amount > 0 {
                if let Ok(imbalance) = T::Currency::withdraw(
                    &fee_pool,
                    burn_amount.saturated_into(),
                    WithdrawReasons::TRANSFER,
                    ExistenceRequirement::AllowDeath,
                ) {
                    drop(imbalance); // reduces TotalIssuance
                }
            }

            // ── 6. Inbox share ────────────────────────────────────────
            if inbox_amount > 0 {
                let _ = T::Currency::transfer(
                    &fee_pool,
                    &T::InboxReserveAccount::get(),
                    inbox_amount.saturated_into(),
                    ExistenceRequirement::AllowDeath,
                );
            }

            // ── 7. Distribute to stakers across three layers ─────────
            // Layer 1 (BASE_REWARD_PCT of staking_pool): equal base reward
            //   per active validator, regardless of stake. Validators only.
            // Layer 2 (PERF_REWARD_PCT): performance bonus scaled by
            //   uptime_bps. Validators only.
            // Layer 3 (STAKE_REWARD_PCT): stake-weighted; commission
            //   applies to the delegator share only. Validators and
            //   delegators both earn from this layer.
            if staking_pool == 0 {
                return Ok(());
            }

            let active_count =
                Validators::<T>::iter().filter(|(_, info)| info.is_active).count() as u128;

            if active_count == 0 {
                // No active validators — burn the staking pool too.
                if let Ok(imbalance) = T::Currency::withdraw(
                    &fee_pool,
                    staking_pool.saturated_into(),
                    WithdrawReasons::TRANSFER,
                    ExistenceRequirement::AllowDeath,
                ) {
                    drop(imbalance);
                }
                return Ok(());
            }

            let base_pool = staking_pool.saturating_mul(BASE_REWARD_PCT as u128) / 100u128;
            let perf_pool = staking_pool.saturating_mul(PERF_REWARD_PCT as u128) / 100u128;
            let stake_pool = staking_pool.saturating_sub(base_pool).saturating_sub(perf_pool);

            let base_per_validator = base_pool / active_count;
            let perf_max_per_validator = perf_pool / active_count;

            let total_active_stake: u128 = Validators::<T>::iter()
                .filter(|(_, info)| info.is_active)
                .map(|(_, info)| info.self_stake.saturating_add(info.delegated_stake))
                .sum();

            let mut validators_rewarded: u32 = 0;
            let mut delegators_rewarded: u32 = 0;

            for (validator_acct, validator_info) in
                Validators::<T>::iter().filter(|(_, info)| info.is_active)
            {
                // Layer 1: equal base reward per active validator.
                let base_reward = base_per_validator;

                // Layer 2: performance bonus, scaled by uptime_bps.
                let perf_bonus = perf_max_per_validator
                    .saturating_mul(validator_info.uptime_bps as u128)
                    / BPS_DENOMINATOR;

                // Layer 3: stake-weighted; commission applies to the
                // delegator share only. Guard against v_total/
                // total_active_stake being 0 (shouldn't happen given
                // MinValidatorStake > 0, but avoid a division panic if
                // it's ever configured to 0).
                let v_total =
                    validator_info.self_stake.saturating_add(validator_info.delegated_stake);
                let (self_portion, commission_take, delegator_distributable) =
                    if v_total > 0 && total_active_stake > 0 {
                        let v_stake_pool = stake_pool.saturating_mul(v_total) / total_active_stake;
                        let self_portion =
                            v_stake_pool.saturating_mul(validator_info.self_stake) / v_total;
                        let delegator_pool = v_stake_pool.saturating_sub(self_portion);
                        let commission_take = delegator_pool
                            .saturating_mul(validator_info.commission as u128)
                            / 100u128;
                        (self_portion, commission_take, delegator_pool.saturating_sub(commission_take))
                    } else {
                        (0u128, 0u128, 0u128)
                    };

                let v_reward = base_reward
                    .saturating_add(perf_bonus)
                    .saturating_add(self_portion)
                    .saturating_add(commission_take);

                if v_reward > 0 {
                    Validators::<T>::mutate(&validator_acct, |maybe| {
                        if let Some(info) = maybe {
                            info.pending_validator_reward =
                                info.pending_validator_reward.saturating_add(v_reward);
                        }
                    });
                    validators_rewarded = validators_rewarded.saturating_add(1);
                }

                if delegator_distributable > 0 && validator_info.delegated_stake > 0 {
                    for (delegator_acct, _, delegation) in
                        Delegations::<T>::iter().filter(|(_, v, _)| *v == validator_acct)
                    {
                        if delegation.amount == 0 {
                            continue;
                        }
                        let d_reward = delegator_distributable.saturating_mul(delegation.amount)
                            / validator_info.delegated_stake;
                        if d_reward > 0 {
                            PendingDelegatorRewards::<T>::mutate(
                                &delegator_acct,
                                &validator_acct,
                                |p| *p = p.saturating_add(d_reward),
                            );
                            delegators_rewarded = delegators_rewarded.saturating_add(1);
                        }
                    }
                }
            }

            EpochRewardHistory::<T>::insert(
                epoch,
                EpochRewardRecord {
                    epoch,
                    fees_collected: fees,
                    yield_emission,
                    total_pool,
                    burned: burn_amount,
                    to_inbox: inbox_amount,
                    to_staking: staking_pool,
                    validators_rewarded,
                    delegators_rewarded,
                },
            );

            Self::deposit_event(Event::RewardsDistributed {
                epoch,
                total_distributed: staking_pool,
                total_burned: burn_amount,
                validators_rewarded,
                delegators_rewarded,
            });

            Ok(())
        }
    }

    impl<T: Config> pallet_awarizon_types::EpochRewardDistributor for Pallet<T> {
        fn distribute_epoch_rewards(epoch: u64) -> DispatchResult {
            Self::distribute_epoch_rewards(epoch)
        }
    }

    impl<T: Config> pallet_awarizon_types::FeeDepositor for Pallet<T> {
        fn deposit_fee(amount: u128) {
            Self::deposit_fee(amount)
        }
    }
}

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;
