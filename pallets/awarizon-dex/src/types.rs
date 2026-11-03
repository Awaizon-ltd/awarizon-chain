use alloc::vec::Vec;
use codec::{Decode, DecodeWithMemTracking, Encode, MaxEncodedLen};
use scale_info::TypeInfo;

/// Represents either RIZ (native) or a pallet-assets token.
///
/// Used directly as a `#[pallet::call]` argument, so it needs `DecodeWithMemTracking`
/// (not just `Decode`) to satisfy the pallet macro's call-arg bounds.
#[derive(
    Encode,
    Decode,
    DecodeWithMemTracking,
    Clone,
    Copy,
    PartialEq,
    Eq,
    Debug,
    TypeInfo,
    MaxEncodedLen,
    PartialOrd,
    Ord,
)]
pub enum Asset {
    /// Native RIZ token
    Native,
    /// pallet-assets token with given AssetId
    Token(u32),
}

impl Asset {
    pub fn is_native(&self) -> bool {
        matches!(self, Asset::Native)
    }
}

/// Unique pool identifier — always sorted so (A, B) and (B, A) resolve to the same pool.
///
/// Appears as an event field, so it needs `Debug` and `DecodeWithMemTracking` to satisfy
/// the pallet macro's bounds, same as `Asset`/`FeeDestination`.
#[derive(
    Encode,
    Decode,
    DecodeWithMemTracking,
    Clone,
    Copy,
    PartialEq,
    Eq,
    Debug,
    TypeInfo,
    MaxEncodedLen,
)]
pub struct PoolId {
    pub asset_a: Asset,
    pub asset_b: Asset,
}

impl PoolId {
    pub fn new(a: Asset, b: Asset) -> Self {
        if a <= b {
            Self { asset_a: a, asset_b: b }
        } else {
            Self { asset_a: b, asset_b: a }
        }
    }

    pub fn contains(&self, asset: &Asset) -> bool {
        &self.asset_a == asset || &self.asset_b == asset
    }

    pub fn other(&self, asset: &Asset) -> Option<Asset> {
        if &self.asset_a == asset {
            Some(self.asset_b)
        } else if &self.asset_b == asset {
            Some(self.asset_a)
        } else {
            None
        }
    }

    pub fn is_riz_pair(&self) -> bool {
        self.contains(&Asset::Native)
    }

    pub fn fee_bps(&self) -> u32 {
        if self.is_riz_pair() {
            super::FEE_RIZ_PAIR_BPS
        } else {
            super::FEE_TOKEN_PAIR_BPS
        }
    }
}

/// Liquidity pool state.
#[derive(Encode, Decode, Clone, PartialEq, Eq, Debug, TypeInfo, MaxEncodedLen)]
pub struct Pool<AccountId> {
    pub account: AccountId,
    pub reserve_a: u128,
    pub reserve_b: u128,
    pub lp_total_supply: u128,
    pub lp_asset_id: u32,
    pub total_volume: u128,
    pub total_fees: u128,
    pub total_burned: u128,
    pub created_at: u32,
    pub last_updated_block: u32,
}

/// TWAP price accumulator per pool. Updated after every swap/liquidity change.
#[derive(Encode, Decode, Clone, PartialEq, Eq, Debug, TypeInfo, MaxEncodedLen, Default)]
pub struct PriceAccumulator {
    /// Cumulative sum of price_a_per_b * blocks_elapsed
    pub price_a_cumulative: u128,
    /// Cumulative sum of price_b_per_a * blocks_elapsed
    pub price_b_cumulative: u128,
    /// Block number of last update
    pub last_block: u32,
}

impl PriceAccumulator {
    /// TWAP over the window since `snapshot`. Returns (price_a_per_b, price_b_per_a)
    /// in TWAP_PRECISION units, or None if no blocks have elapsed.
    pub fn twap_since(
        &self,
        snapshot: &PriceAccumulator,
        current_block: u32,
    ) -> Option<(u128, u128)> {
        let blocks = current_block.saturating_sub(snapshot.last_block);
        if blocks == 0 {
            return None;
        }
        let price_a =
            self.price_a_cumulative.saturating_sub(snapshot.price_a_cumulative) / blocks as u128;
        let price_b =
            self.price_b_cumulative.saturating_sub(snapshot.price_b_cumulative) / blocks as u128;
        Some((price_a, price_b))
    }
}

/// Protocol fee destination.
///
/// Used directly as a `#[pallet::call]` argument, so it needs `Debug` and
/// `DecodeWithMemTracking` (not just `Decode`) to satisfy the pallet macro's call-arg bounds.
#[derive(
    Encode,
    Decode,
    DecodeWithMemTracking,
    Clone,
    PartialEq,
    Eq,
    Debug,
    TypeInfo,
    MaxEncodedLen,
    Default,
)]
pub enum FeeDestination {
    /// Burn the protocol fee (deflationary) — default.
    #[default]
    Burn,
    /// Send to treasury account.
    Treasury,
}

/// Router swap path.
#[derive(Encode, Decode, Clone, PartialEq, Eq, Debug, TypeInfo)]
pub struct SwapPath {
    pub assets: Vec<Asset>,
}

impl SwapPath {
    pub fn direct(from: Asset, to: Asset) -> Self {
        Self { assets: alloc::vec![from, to] }
    }

    pub fn via_riz(from: Asset, to: Asset) -> Self {
        Self { assets: alloc::vec![from, Asset::Native, to] }
    }

    pub fn hops(&self) -> usize {
        self.assets.len().saturating_sub(1)
    }
}
