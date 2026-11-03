#![cfg_attr(not(feature = "std"), no_std)]

extern crate alloc;

pub mod types;
use types::*;

use alloc::vec::Vec;
use frame_support::{
    pallet_prelude::*,
    traits::{
        fungibles::{Create, Inspect, Mutate},
        tokens::{Fortitude, Precision, Preservation},
        Currency, ExistenceRequirement, ReservableCurrency, WithdrawReasons,
    },
    PalletId,
};
use frame_system::pallet_prelude::*;
use pallet_awarizon_types::{
    constants::{
        FEE_POOL_PALLET_ID, FEE_PROTOCOL_BURN_BPS, FEE_RIZ_PAIR_BPS, FEE_TOKEN_PAIR_BPS,
        LP_ASSET_ID_OFFSET, MIN_POOL_LIQUIDITY, TWAP_PRECISION,
    },
    FeeDepositor,
};
use sp_runtime::{
    traits::{AccountIdConversion, IntegerSquareRoot, SaturatedConversion, UniqueSaturatedInto},
    DispatchError,
};

pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
    use super::*;

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

        type Currency: Currency<Self::AccountId> + ReservableCurrency<Self::AccountId>;

        type Assets: Create<Self::AccountId>
            + Inspect<Self::AccountId, AssetId = u32, Balance = u128>
            + Mutate<Self::AccountId>;

        #[pallet::constant]
        type PalletId: Get<PalletId>;

        #[pallet::constant]
        type MinimumLiquidity: Get<u128>;

        #[pallet::constant]
        type MaxRouterHops: Get<u32>;

        /// Records native-RIZ protocol fees into awarizon-consensus's per-epoch fee pool
        /// when the fee destination is set to Treasury (see [`FeeDepositor`]).
        type FeeDepositor: FeeDepositor;
    }

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    // ── Storage ──────────────────────────────────

    #[pallet::storage]
    pub type Pools<T: Config> =
        StorageMap<_, Blake2_128Concat, PoolId, Pool<T::AccountId>, OptionQuery>;

    #[pallet::storage]
    pub type LPBalances<T: Config> = StorageDoubleMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        Blake2_128Concat,
        PoolId,
        u128,
        ValueQuery,
    >;

    #[pallet::storage]
    pub type NextLPAssetId<T: Config> = StorageValue<_, u32, ValueQuery>;

    #[pallet::storage]
    pub type PoolCount<T: Config> = StorageValue<_, u32, ValueQuery>;

    #[pallet::storage]
    pub type TotalProtocolBurned<T: Config> = StorageValue<_, u128, ValueQuery>;

    /// Cumulative TWAP price data per pool. Updated after every swap and liquidity event.
    #[pallet::storage]
    pub type PriceAccumulators<T: Config> =
        StorageMap<_, Blake2_128Concat, PoolId, PriceAccumulator, ValueQuery>;

    /// Governance-controlled protocol fee destination. Default: Burn (deflationary).
    #[pallet::storage]
    pub type ProtocolFeeDestination<T: Config> = StorageValue<_, FeeDestination, ValueQuery>;

    /// Reentrancy guard. Set for the duration of a call; storage rollback on error
    /// (FRAME's transactional dispatch layer) means a failed call always releases it.
    #[pallet::storage]
    pub type Reentrancy<T: Config> = StorageValue<_, bool, ValueQuery>;

    // ── Events ───────────────────────────────────

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        PoolCreated {
            pool_id: PoolId,
            lp_asset_id: u32,
            creator: T::AccountId,
            reserve_a: u128,
            reserve_b: u128,
        },
        LiquidityAdded {
            pool_id: PoolId,
            provider: T::AccountId,
            amount_a: u128,
            amount_b: u128,
            lp_minted: u128,
            reserve_a: u128,
            reserve_b: u128,
            lp_total_supply: u128,
        },
        LiquidityRemoved {
            pool_id: PoolId,
            provider: T::AccountId,
            amount_a: u128,
            amount_b: u128,
            lp_burned: u128,
            reserve_a: u128,
            reserve_b: u128,
            lp_total_supply: u128,
        },
        /// Swap executed — rich data for indexers.
        Swapped {
            pool_id: PoolId,
            trader: T::AccountId,
            asset_in: Asset,
            asset_out: Asset,
            amount_in: u128,
            amount_out: u128,
            fee: u128,
            protocol_fee: u128,
            protocol_fee_burned: bool,
            reserve_a: u128,
            reserve_b: u128,
            price_a_per_b: u128,
            price_b_per_a: u128,
            block_number: u32,
        },
        MultiHopSwapped {
            trader: T::AccountId,
            path: Vec<Asset>,
            amount_in: u128,
            amount_out: u128,
            block_number: u32,
        },
        ProtocolFeeProcessed {
            amount: u128,
            burned: bool,
        },
        PriceUpdated {
            pool_id: PoolId,
            price_a_per_b: u128,
            price_b_per_a: u128,
            block_number: u32,
        },
        FeeDestinationChanged {
            new_destination: FeeDestination,
        },
    }

    // ── Errors ───────────────────────────────────

    #[pallet::error]
    pub enum Error<T> {
        PoolAlreadyExists,
        PoolNotFound,
        InsufficientLiquidity,
        InsufficientInputAmount,
        InsufficientOutputAmount,
        SlippageExceeded,
        InvalidPath,
        TooManyHops,
        NoRouteFound,
        AmountTooLow,
        Overflow,
        IdenticalAssets,
        InsufficientLPTokens,
        EmptyPool,
        BelowMinimumLiquidity,
        /// Transaction deadline exceeded.
        DeadlineExceeded,
        /// Reentrancy detected.
        Reentrancy,
    }

    // ── Extrinsics ───────────────────────────────

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        /// Create a new liquidity pool. `deadline` is the block number after which the
        /// transaction reverts.
        #[pallet::call_index(0)]
        #[pallet::weight(T::DbWeight::get().reads_writes(5, 8))]
        pub fn create_pool(
            origin: OriginFor<T>,
            asset_a: Asset,
            asset_b: Asset,
            amount_a: u128,
            amount_b: u128,
            deadline: BlockNumberFor<T>,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;
            Self::check_deadline(deadline)?;
            Self::check_reentrancy()?;

            ensure!(asset_a != asset_b, Error::<T>::IdenticalAssets);
            ensure!(
                amount_a >= MIN_POOL_LIQUIDITY && amount_b >= MIN_POOL_LIQUIDITY,
                Error::<T>::BelowMinimumLiquidity
            );

            let pool_id = PoolId::new(asset_a, asset_b);
            ensure!(!Pools::<T>::contains_key(&pool_id), Error::<T>::PoolAlreadyExists);

            let pool_account = Self::pool_account(&pool_id);

            // Normalize amounts to pool_id order (asset_a/asset_b may have been swapped by PoolId::new).
            let (amt_a, amt_b) = if pool_id.asset_a == asset_a {
                (amount_a, amount_b)
            } else {
                (amount_b, amount_a)
            };

            Self::transfer_to_pool(&who, &pool_account, &pool_id.asset_a, amt_a)?;
            Self::transfer_to_pool(&who, &pool_account, &pool_id.asset_b, amt_b)?;

            let lp_asset_id = Self::next_lp_asset_id();
            // No metadata (name/symbol) is set here deliberately: `Assets::set` reserves a
            // MetadataDeposit from its `from` account, which would have to be pool_account —
            // the only account permitted, since it's the LP asset's owner. That deposit would
            // permanently lock part of pool_account's real balance while the pallet's own
            // reserve_a/reserve_b bookkeeping still counts it as fully withdrawable, causing
            // FundsUnavailable on a near-full withdraw. Worse, a Token/Token pool never puts
            // any native RIZ into pool_account at all, so there'd be nothing to reserve from.
            // LP tokens are identified by asset ID; a friendly name isn't worth either problem.
            T::Assets::create(lp_asset_id, pool_account.clone(), true, 1u128)?;

            let lp_total = amt_a.saturating_mul(amt_b).integer_sqrt();
            let minimum_liquidity = T::MinimumLiquidity::get();
            ensure!(lp_total > minimum_liquidity, Error::<T>::BelowMinimumLiquidity);
            let lp_to_provider = lp_total.saturating_sub(minimum_liquidity);

            T::Assets::mint_into(lp_asset_id, &who, lp_to_provider)?;

            let current_block = Self::current_block();
            let pool = Pool {
                account: pool_account.clone(),
                reserve_a: amt_a,
                reserve_b: amt_b,
                lp_total_supply: lp_total,
                lp_asset_id,
                total_volume: 0,
                total_fees: 0,
                total_burned: 0,
                created_at: current_block,
                last_updated_block: current_block,
            };

            Pools::<T>::insert(&pool_id, &pool);
            LPBalances::<T>::insert(&who, &pool_id, lp_to_provider);
            PoolCount::<T>::mutate(|c| *c = c.saturating_add(1));

            Self::update_twap(&pool_id, &pool);

            Self::deposit_event(Event::PoolCreated {
                pool_id,
                lp_asset_id,
                creator: who,
                reserve_a: amt_a,
                reserve_b: amt_b,
            });

            Reentrancy::<T>::put(false);
            Ok(())
        }

        /// Add liquidity to an existing pool.
        #[pallet::call_index(1)]
        #[pallet::weight(T::DbWeight::get().reads_writes(4, 5))]
        pub fn add_liquidity(
            origin: OriginFor<T>,
            asset_a: Asset,
            asset_b: Asset,
            amount_a_desired: u128,
            amount_b_desired: u128,
            amount_a_min: u128,
            amount_b_min: u128,
            deadline: BlockNumberFor<T>,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;
            Self::check_deadline(deadline)?;
            Self::check_reentrancy()?;

            let pool_id = PoolId::new(asset_a, asset_b);
            let mut pool = Pools::<T>::get(&pool_id).ok_or(Error::<T>::PoolNotFound)?;

            let (amount_a, amount_b) = Self::calc_liquidity_amounts(
                &pool,
                &pool_id,
                asset_a,
                amount_a_desired,
                amount_b_desired,
                amount_a_min,
                amount_b_min,
            )?;

            let pool_account = pool.account.clone();
            Self::transfer_to_pool(&who, &pool_account, &asset_a, amount_a)?;
            Self::transfer_to_pool(&who, &pool_account, &asset_b, amount_b)?;

            let lp_minted = Self::calc_lp_tokens(&pool, &pool_id, asset_a, amount_a, amount_b)?;
            ensure!(lp_minted > 0, Error::<T>::AmountTooLow);

            T::Assets::mint_into(pool.lp_asset_id, &who, lp_minted)?;

            if pool_id.asset_a == asset_a {
                pool.reserve_a = pool.reserve_a.saturating_add(amount_a);
                pool.reserve_b = pool.reserve_b.saturating_add(amount_b);
            } else {
                pool.reserve_a = pool.reserve_a.saturating_add(amount_b);
                pool.reserve_b = pool.reserve_b.saturating_add(amount_a);
            }
            pool.lp_total_supply = pool.lp_total_supply.saturating_add(lp_minted);
            pool.last_updated_block = Self::current_block();

            Self::update_twap(&pool_id, &pool);
            Pools::<T>::insert(&pool_id, &pool);
            LPBalances::<T>::mutate(&who, &pool_id, |b| *b = b.saturating_add(lp_minted));

            Self::deposit_event(Event::LiquidityAdded {
                pool_id,
                provider: who,
                amount_a,
                amount_b,
                lp_minted,
                reserve_a: pool.reserve_a,
                reserve_b: pool.reserve_b,
                lp_total_supply: pool.lp_total_supply,
            });

            Reentrancy::<T>::put(false);
            Ok(())
        }

        /// Remove liquidity from a pool.
        #[pallet::call_index(2)]
        #[pallet::weight(T::DbWeight::get().reads_writes(4, 5))]
        pub fn remove_liquidity(
            origin: OriginFor<T>,
            asset_a: Asset,
            asset_b: Asset,
            lp_amount: u128,
            min_amount_a: u128,
            min_amount_b: u128,
            deadline: BlockNumberFor<T>,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;
            Self::check_deadline(deadline)?;
            Self::check_reentrancy()?;

            let pool_id = PoolId::new(asset_a, asset_b);
            let mut pool = Pools::<T>::get(&pool_id).ok_or(Error::<T>::PoolNotFound)?;

            ensure!(lp_amount > 0, Error::<T>::AmountTooLow);

            let user_lp = LPBalances::<T>::get(&who, &pool_id);
            ensure!(user_lp >= lp_amount, Error::<T>::InsufficientLPTokens);
            ensure!(pool.lp_total_supply > 0, Error::<T>::EmptyPool);

            let amount_a = lp_amount.saturating_mul(pool.reserve_a) / pool.lp_total_supply;
            let amount_b = lp_amount.saturating_mul(pool.reserve_b) / pool.lp_total_supply;

            // Return in the caller's original asset order.
            let (ret_a, ret_b) = if pool_id.asset_a == asset_a {
                (amount_a, amount_b)
            } else {
                (amount_b, amount_a)
            };

            ensure!(ret_a >= min_amount_a, Error::<T>::SlippageExceeded);
            ensure!(ret_b >= min_amount_b, Error::<T>::SlippageExceeded);

            T::Assets::burn_from(
                pool.lp_asset_id,
                &who,
                lp_amount,
                Preservation::Expendable,
                Precision::Exact,
                Fortitude::Polite,
            )?;

            let pool_account = pool.account.clone();
            Self::transfer_from_pool(&pool_account, &who, &pool_id.asset_a, amount_a)?;
            Self::transfer_from_pool(&pool_account, &who, &pool_id.asset_b, amount_b)?;

            pool.reserve_a = pool.reserve_a.saturating_sub(amount_a);
            pool.reserve_b = pool.reserve_b.saturating_sub(amount_b);
            pool.lp_total_supply = pool.lp_total_supply.saturating_sub(lp_amount);
            pool.last_updated_block = Self::current_block();

            Self::update_twap(&pool_id, &pool);
            Pools::<T>::insert(&pool_id, &pool);
            LPBalances::<T>::mutate(&who, &pool_id, |b| *b = b.saturating_sub(lp_amount));

            Self::deposit_event(Event::LiquidityRemoved {
                pool_id,
                provider: who,
                amount_a: ret_a,
                amount_b: ret_b,
                lp_burned: lp_amount,
                reserve_a: pool.reserve_a,
                reserve_b: pool.reserve_b,
                lp_total_supply: pool.lp_total_supply,
            });

            Reentrancy::<T>::put(false);
            Ok(())
        }

        /// Swap an exact amount in for a minimum amount out. The router finds the best
        /// path (direct or via-RIZ) automatically.
        #[pallet::call_index(3)]
        #[pallet::weight(T::DbWeight::get().reads_writes(6, 6))]
        pub fn swap_exact_in(
            origin: OriginFor<T>,
            asset_in: Asset,
            asset_out: Asset,
            amount_in: u128,
            min_amount_out: u128,
            deadline: BlockNumberFor<T>,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;
            Self::check_deadline(deadline)?;
            Self::check_reentrancy()?;

            ensure!(asset_in != asset_out, Error::<T>::IdenticalAssets);
            ensure!(amount_in > 0, Error::<T>::AmountTooLow);

            let path = Self::find_best_path(asset_in, asset_out, Some(amount_in))?;
            let current_block = Self::current_block();

            if path.hops() == 1 {
                let pool_id = PoolId::new(asset_in, asset_out);
                let (amount_out, fee, burned) =
                    Self::execute_swap(&who, &pool_id, asset_in, amount_in, min_amount_out)?;

                let pool = Pools::<T>::get(&pool_id).ok_or(Error::<T>::PoolNotFound)?;
                let (price_a, price_b) = Self::spot_price(&pool);

                Self::deposit_event(Event::Swapped {
                    pool_id,
                    trader: who,
                    asset_in,
                    asset_out,
                    amount_in,
                    amount_out,
                    fee,
                    protocol_fee: burned,
                    protocol_fee_burned: matches!(
                        ProtocolFeeDestination::<T>::get(),
                        FeeDestination::Burn
                    ),
                    reserve_a: pool.reserve_a,
                    reserve_b: pool.reserve_b,
                    price_a_per_b: price_a,
                    price_b_per_a: price_b,
                    block_number: current_block,
                });
            } else {
                let amount_out =
                    Self::execute_multi_hop(&who, &path, amount_in, min_amount_out)?;

                Self::deposit_event(Event::MultiHopSwapped {
                    trader: who,
                    path: path.assets,
                    amount_in,
                    amount_out,
                    block_number: current_block,
                });
            }

            Reentrancy::<T>::put(false);
            Ok(())
        }

        /// Swap a maximum amount in for an exact amount out.
        #[pallet::call_index(4)]
        #[pallet::weight(T::DbWeight::get().reads_writes(6, 6))]
        pub fn swap_exact_out(
            origin: OriginFor<T>,
            asset_in: Asset,
            asset_out: Asset,
            amount_out: u128,
            max_amount_in: u128,
            deadline: BlockNumberFor<T>,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;
            Self::check_deadline(deadline)?;
            Self::check_reentrancy()?;

            ensure!(asset_in != asset_out, Error::<T>::IdenticalAssets);
            ensure!(amount_out > 0, Error::<T>::AmountTooLow);

            let path = Self::find_best_path(asset_in, asset_out, None)?;
            let required_in = Self::calc_amount_in(&path, amount_out)?;
            ensure!(required_in <= max_amount_in, Error::<T>::SlippageExceeded);

            let actual_out = Self::execute_multi_hop(&who, &path, required_in, amount_out)?;

            Self::deposit_event(Event::MultiHopSwapped {
                trader: who,
                path: path.assets,
                amount_in: required_in,
                amount_out: actual_out,
                block_number: Self::current_block(),
            });

            Reentrancy::<T>::put(false);
            Ok(())
        }

        /// Governance: switch the protocol fee destination between Burn and Treasury.
        /// Root-only until a dedicated governance origin exists.
        #[pallet::call_index(5)]
        #[pallet::weight(T::DbWeight::get().reads_writes(0, 1))]
        pub fn set_fee_destination(
            origin: OriginFor<T>,
            destination: FeeDestination,
        ) -> DispatchResult {
            ensure_root(origin)?;

            ProtocolFeeDestination::<T>::put(destination.clone());

            Self::deposit_event(Event::FeeDestinationChanged { new_destination: destination });

            Ok(())
        }
    }

    // ── Helper Functions ─────────────────────────

    impl<T: Config> Pallet<T> {
        fn current_block() -> u32 {
            frame_system::Pallet::<T>::block_number().unique_saturated_into()
        }

        fn check_deadline(deadline: BlockNumberFor<T>) -> DispatchResult {
            let current = frame_system::Pallet::<T>::block_number();
            ensure!(current <= deadline, Error::<T>::DeadlineExceeded);
            Ok(())
        }

        /// Reentrancy guard. FRAME wraps every dispatchable in a storage transaction, so
        /// if the call later returns `Err`, this write (and every other write made during
        /// the call) is rolled back automatically — the guard can't get stuck locked.
        fn check_reentrancy() -> DispatchResult {
            ensure!(!Reentrancy::<T>::get(), Error::<T>::Reentrancy);
            Reentrancy::<T>::put(true);
            Ok(())
        }

        pub fn pool_account(pool_id: &PoolId) -> T::AccountId {
            T::PalletId::get().into_sub_account_truncating(pool_id.encode())
        }

        /// awarizon-consensus's per-epoch fee pool account. Deterministically derived from
        /// the same `PalletId` awarizon-consensus itself uses, so no cross-pallet dependency
        /// is needed just to know the destination address (only `FeeDepositor` is needed, to
        /// record native-RIZ deposits into that epoch's distributable total).
        fn fee_pool_account() -> T::AccountId {
            FEE_POOL_PALLET_ID.into_account_truncating()
        }

        fn next_lp_asset_id() -> u32 {
            let id = NextLPAssetId::<T>::get();
            NextLPAssetId::<T>::put(id.saturating_add(1));
            LP_ASSET_ID_OFFSET.saturating_add(id)
        }

        fn spot_price(pool: &Pool<T::AccountId>) -> (u128, u128) {
            if pool.reserve_a == 0 || pool.reserve_b == 0 {
                return (0, 0);
            }
            let price_a = pool.reserve_b.saturating_mul(TWAP_PRECISION) / pool.reserve_a;
            let price_b = pool.reserve_a.saturating_mul(TWAP_PRECISION) / pool.reserve_b;
            (price_a, price_b)
        }

        /// Update TWAP accumulators after a pool change. Called after every swap, add,
        /// or remove.
        pub fn update_twap(pool_id: &PoolId, pool: &Pool<T::AccountId>) {
            if pool.reserve_a == 0 || pool.reserve_b == 0 {
                return;
            }

            let current_block = Self::current_block();
            let (price_a, price_b) = Self::spot_price(pool);

            PriceAccumulators::<T>::mutate(pool_id, |acc| {
                let elapsed = current_block.saturating_sub(acc.last_block) as u128;
                if elapsed > 0 {
                    acc.price_a_cumulative =
                        acc.price_a_cumulative.saturating_add(price_a.saturating_mul(elapsed));
                    acc.price_b_cumulative =
                        acc.price_b_cumulative.saturating_add(price_b.saturating_mul(elapsed));
                    acc.last_block = current_block;
                }
            });

            Self::deposit_event(Event::PriceUpdated {
                pool_id: *pool_id,
                price_a_per_b: price_a,
                price_b_per_a: price_b,
                block_number: current_block,
            });
        }

        /// Process the protocol fee slice carved out of a swap — burn or send to treasury.
        fn process_protocol_fee(
            pool_account: &T::AccountId,
            asset: &Asset,
            amount: u128,
        ) -> DispatchResult {
            if amount == 0 {
                return Ok(());
            }

            match ProtocolFeeDestination::<T>::get() {
                FeeDestination::Burn => {
                    match asset {
                        Asset::Native => {
                            // Withdraw-and-drop burns: the imbalance reduces TotalIssuance
                            // when dropped without being resolved into an account.
                            let imbalance = T::Currency::withdraw(
                                pool_account,
                                amount.saturated_into(),
                                WithdrawReasons::TRANSFER,
                                ExistenceRequirement::AllowDeath,
                            )?;
                            drop(imbalance);
                        }
                        Asset::Token(id) => {
                            T::Assets::burn_from(
                                *id,
                                pool_account,
                                amount,
                                Preservation::Expendable,
                                Precision::Exact,
                                Fortitude::Polite,
                            )?;
                        }
                    }
                    TotalProtocolBurned::<T>::mutate(|b| *b = b.saturating_add(amount));
                    Self::deposit_event(Event::ProtocolFeeProcessed { amount, burned: true });
                }
                FeeDestination::Treasury => {
                    let fee_pool = Self::fee_pool_account();
                    Self::transfer_from_pool(pool_account, &fee_pool, asset, amount)?;
                    if asset.is_native() {
                        // Only native RIZ can be folded into the epoch fee pool's
                        // distributable total — its accounting is RIZ-denominated, so a
                        // Token(id) amount has no meaningful exchange rate against it here.
                        T::FeeDepositor::deposit_fee(amount);
                    }
                    // Token-denominated fees still land in the fee pool account (so there's
                    // one known pot, not two) but aren't yet counted in any epoch's reward
                    // math — that needs a swap-to-RIZ step this pallet doesn't perform itself.
                    Self::deposit_event(Event::ProtocolFeeProcessed { amount, burned: false });
                }
            }

            Ok(())
        }

        /// AMM: amount out given amount in (constant product, x*y=k), net of the swap
        /// fee and the protocol burn carved out of it.
        pub fn calc_amount_out(
            reserve_in: u128,
            reserve_out: u128,
            amount_in: u128,
            fee_bps: u32,
        ) -> Result<(u128, u128, u128), DispatchError> {
            ensure!(reserve_in > 0 && reserve_out > 0, Error::<T>::EmptyPool);
            ensure!(amount_in > 0, Error::<T>::InsufficientInputAmount);

            let fee = amount_in.saturating_mul(fee_bps as u128) / 10_000u128;
            let protocol_burn = amount_in.saturating_mul(FEE_PROTOCOL_BURN_BPS as u128) / 10_000u128;
            let amount_in_net = amount_in.saturating_sub(fee).saturating_sub(protocol_burn);

            let numerator = amount_in_net.saturating_mul(reserve_out);
            let denominator = reserve_in.saturating_add(amount_in_net);
            ensure!(denominator > 0, Error::<T>::Overflow);

            let amount_out = numerator / denominator;
            ensure!(amount_out > 0, Error::<T>::InsufficientOutputAmount);
            ensure!(amount_out < reserve_out, Error::<T>::InsufficientLiquidity);

            Ok((amount_out, fee, protocol_burn))
        }

        /// AMM: amount in required for an exact amount out.
        pub fn calc_amount_in_for_out(
            reserve_in: u128,
            reserve_out: u128,
            amount_out: u128,
            fee_bps: u32,
        ) -> Result<u128, DispatchError> {
            ensure!(reserve_in > 0 && reserve_out > 0, Error::<T>::EmptyPool);
            ensure!(amount_out > 0 && amount_out < reserve_out, Error::<T>::InsufficientOutputAmount);

            let total_fee_bps = (fee_bps as u128).saturating_add(FEE_PROTOCOL_BURN_BPS as u128);
            let numerator =
                reserve_in.saturating_mul(amount_out).saturating_mul(10_000u128);
            let denominator = reserve_out
                .saturating_sub(amount_out)
                .saturating_mul(10_000u128.saturating_sub(total_fee_bps));
            ensure!(denominator > 0, Error::<T>::Overflow);

            Ok(numerator / denominator + 1)
        }

        /// Router: find the best swap path. When `amount_in` is known (exact-in swaps),
        /// compares direct vs via-RIZ output for that trade size. For exact-out swaps
        /// (`amount_in: None`) the direct pool is preferred when it exists, since output
        /// isn't yet known to compare against.
        pub fn find_best_path(
            from: Asset,
            to: Asset,
            amount_in: Option<u128>,
        ) -> Result<SwapPath, DispatchError> {
            let direct_pool_id = PoolId::new(from, to);
            let direct_pool = Pools::<T>::get(&direct_pool_id);
            let via_riz_possible = from != Asset::Native && to != Asset::Native;

            if let Some(pool) = &direct_pool {
                if let (Some(probe), true) = (amount_in, via_riz_possible) {
                    let direct_out =
                        Self::simulate_direct(pool, &direct_pool_id, from, probe).unwrap_or(0);
                    let via_out = Self::simulate_via_riz_path(from, to, probe).unwrap_or(0);
                    if via_out > direct_out {
                        return Ok(SwapPath::via_riz(from, to));
                    }
                }
                return Ok(SwapPath::direct(from, to));
            }

            if via_riz_possible {
                let pool_a = PoolId::new(from, Asset::Native);
                let pool_b = PoolId::new(Asset::Native, to);
                if Pools::<T>::contains_key(&pool_a) && Pools::<T>::contains_key(&pool_b) {
                    return Ok(SwapPath::via_riz(from, to));
                }
            }

            Err(Error::<T>::NoRouteFound.into())
        }

        fn simulate_direct(
            pool: &Pool<T::AccountId>,
            pool_id: &PoolId,
            asset_in: Asset,
            amount_in: u128,
        ) -> Result<u128, DispatchError> {
            let (r_in, r_out) = if pool_id.asset_a == asset_in {
                (pool.reserve_a, pool.reserve_b)
            } else {
                (pool.reserve_b, pool.reserve_a)
            };
            let (out, _, _) = Self::calc_amount_out(r_in, r_out, amount_in, pool_id.fee_bps())?;
            Ok(out)
        }

        fn simulate_via_riz_path(
            from: Asset,
            to: Asset,
            amount_in: u128,
        ) -> Result<u128, DispatchError> {
            let pool_id_a = PoolId::new(from, Asset::Native);
            let pool_id_b = PoolId::new(Asset::Native, to);
            let pool_a = Pools::<T>::get(&pool_id_a).ok_or(Error::<T>::PoolNotFound)?;
            let pool_b = Pools::<T>::get(&pool_id_b).ok_or(Error::<T>::PoolNotFound)?;

            let mid = Self::simulate_direct(&pool_a, &pool_id_a, from, amount_in)?;
            Self::simulate_direct(&pool_b, &pool_id_b, Asset::Native, mid)
        }

        /// Execute a single-pool swap.
        fn execute_swap(
            who: &T::AccountId,
            pool_id: &PoolId,
            asset_in: Asset,
            amount_in: u128,
            min_out: u128,
        ) -> Result<(u128, u128, u128), DispatchError> {
            let mut pool = Pools::<T>::get(pool_id).ok_or(Error::<T>::PoolNotFound)?;

            let (reserve_in, reserve_out) = if pool_id.asset_a == asset_in {
                (pool.reserve_a, pool.reserve_b)
            } else {
                (pool.reserve_b, pool.reserve_a)
            };

            let (amount_out, fee, burn) =
                Self::calc_amount_out(reserve_in, reserve_out, amount_in, pool_id.fee_bps())?;
            ensure!(amount_out >= min_out, Error::<T>::SlippageExceeded);

            let pool_account = pool.account.clone();
            Self::transfer_to_pool(who, &pool_account, &asset_in, amount_in)?;

            let asset_out = pool_id.other(&asset_in).ok_or(Error::<T>::InvalidPath)?;
            Self::transfer_from_pool(&pool_account, who, &asset_out, amount_out)?;

            Self::process_protocol_fee(&pool_account, &asset_in, burn)?;

            if pool_id.asset_a == asset_in {
                pool.reserve_a = pool.reserve_a.saturating_add(amount_in).saturating_sub(burn);
                pool.reserve_b = pool.reserve_b.saturating_sub(amount_out);
            } else {
                pool.reserve_b = pool.reserve_b.saturating_add(amount_in).saturating_sub(burn);
                pool.reserve_a = pool.reserve_a.saturating_sub(amount_out);
            }
            pool.total_volume = pool.total_volume.saturating_add(amount_in);
            pool.total_fees = pool.total_fees.saturating_add(fee);
            pool.total_burned = pool.total_burned.saturating_add(burn);
            pool.last_updated_block = Self::current_block();

            Self::update_twap(pool_id, &pool);
            Pools::<T>::insert(pool_id, pool);

            Ok((amount_out, fee, burn))
        }

        /// Execute a multi-hop swap along a router path.
        fn execute_multi_hop(
            who: &T::AccountId,
            path: &SwapPath,
            amount_in: u128,
            min_out: u128,
        ) -> Result<u128, DispatchError> {
            ensure!(path.assets.len() >= 2, Error::<T>::InvalidPath);
            ensure!(path.hops() <= T::MaxRouterHops::get() as usize, Error::<T>::TooManyHops);

            let mut current = amount_in;
            let last = path.assets.len() - 1;

            for i in 0..last {
                let a_in = path.assets[i];
                let a_out = path.assets[i + 1];
                let pool_id = PoolId::new(a_in, a_out);
                let this_min = if i == last - 1 { min_out } else { 1 };

                let (out, _, _) = Self::execute_swap(who, &pool_id, a_in, current, this_min)?;
                current = out;
            }

            Ok(current)
        }

        /// Required input for an exact output, walking the path in reverse.
        fn calc_amount_in(path: &SwapPath, amount_out: u128) -> Result<u128, DispatchError> {
            let assets = &path.assets;
            ensure!(assets.len() >= 2, Error::<T>::InvalidPath);

            let mut required = amount_out;
            for i in (0..assets.len() - 1).rev() {
                let pool_id = PoolId::new(assets[i], assets[i + 1]);
                let pool = Pools::<T>::get(&pool_id).ok_or(Error::<T>::PoolNotFound)?;

                let (r_in, r_out) = if pool_id.asset_a == assets[i] {
                    (pool.reserve_a, pool.reserve_b)
                } else {
                    (pool.reserve_b, pool.reserve_a)
                };

                required = Self::calc_amount_in_for_out(r_in, r_out, required, pool_id.fee_bps())?;
            }
            Ok(required)
        }

        /// Optimal liquidity amounts for a deposit, matching the pool's current ratio.
        fn calc_liquidity_amounts(
            pool: &Pool<T::AccountId>,
            pool_id: &PoolId,
            asset_a: Asset,
            amount_a_desired: u128,
            amount_b_desired: u128,
            amount_a_min: u128,
            amount_b_min: u128,
        ) -> Result<(u128, u128), DispatchError> {
            let (reserve_a, reserve_b) = if pool_id.asset_a == asset_a {
                (pool.reserve_a, pool.reserve_b)
            } else {
                (pool.reserve_b, pool.reserve_a)
            };

            if reserve_a == 0 && reserve_b == 0 {
                return Ok((amount_a_desired, amount_b_desired));
            }

            let b_optimal = amount_a_desired.saturating_mul(reserve_b) / reserve_a;
            if b_optimal <= amount_b_desired {
                ensure!(b_optimal >= amount_b_min, Error::<T>::SlippageExceeded);
                Ok((amount_a_desired, b_optimal))
            } else {
                let a_optimal = amount_b_desired.saturating_mul(reserve_a) / reserve_b;
                ensure!(a_optimal >= amount_a_min, Error::<T>::SlippageExceeded);
                Ok((a_optimal, amount_b_desired))
            }
        }

        /// LP tokens to mint for a deposit of (amount_a, amount_b) in pool_id order.
        fn calc_lp_tokens(
            pool: &Pool<T::AccountId>,
            pool_id: &PoolId,
            asset_a: Asset,
            amount_a: u128,
            amount_b: u128,
        ) -> Result<u128, DispatchError> {
            ensure!(pool.reserve_a > 0 && pool.reserve_b > 0, Error::<T>::EmptyPool);
            let (deposit_a, deposit_b) = if pool_id.asset_a == asset_a {
                (amount_a, amount_b)
            } else {
                (amount_b, amount_a)
            };
            let lp_a = deposit_a.saturating_mul(pool.lp_total_supply) / pool.reserve_a;
            let lp_b = deposit_b.saturating_mul(pool.lp_total_supply) / pool.reserve_b;
            Ok(lp_a.min(lp_b))
        }

        /// Transfer an asset from a user into the pool account.
        fn transfer_to_pool(
            from: &T::AccountId,
            pool: &T::AccountId,
            asset: &Asset,
            amount: u128,
        ) -> DispatchResult {
            match asset {
                Asset::Native => T::Currency::transfer(
                    from,
                    pool,
                    amount.saturated_into(),
                    ExistenceRequirement::AllowDeath,
                ),
                Asset::Token(id) => T::Assets::transfer(
                    *id,
                    from,
                    pool,
                    amount,
                    Preservation::Expendable,
                )
                .map(|_| ()),
            }
        }

        /// Transfer an asset from the pool account out to a user.
        fn transfer_from_pool(
            pool: &T::AccountId,
            to: &T::AccountId,
            asset: &Asset,
            amount: u128,
        ) -> DispatchResult {
            match asset {
                Asset::Native => T::Currency::transfer(
                    pool,
                    to,
                    amount.saturated_into(),
                    ExistenceRequirement::AllowDeath,
                ),
                Asset::Token(id) => T::Assets::transfer(
                    *id,
                    pool,
                    to,
                    amount,
                    Preservation::Expendable,
                )
                .map(|_| ()),
            }
        }
    }
}

#[cfg(test)]
mod mock;
#[cfg(test)]
mod tests;
