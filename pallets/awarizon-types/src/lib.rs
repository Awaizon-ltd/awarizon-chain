#![cfg_attr(not(feature = "std"), no_std)]

pub mod constants;
pub use constants::*;

use codec::{Decode, DecodeWithMemTracking, Encode, MaxEncodedLen};
use frame_support::BoundedVec;
use scale_info::TypeInfo;

// ============================================================
// TRANSACTION TYPE
// ============================================================

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo, MaxEncodedLen)]
pub enum TransactionType {
    Financial,
    Distribution,
    System,
}

// ============================================================
// APPLICATION CATEGORIES
// ============================================================

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, DecodeWithMemTracking, TypeInfo, MaxEncodedLen)]
pub enum AppCategory {
    DeFi,
    Gaming,
    Social,
    Productivity,
    Infrastructure,
    DigitalAssets,
    DeveloperTools,
    Education,
}

impl AppCategory {
    pub fn to_id(&self) -> u8 {
        match self {
            AppCategory::DeFi => 0x01,
            AppCategory::Gaming => 0x02,
            AppCategory::Social => 0x03,
            AppCategory::Productivity => 0x04,
            AppCategory::Infrastructure => 0x05,
            AppCategory::DigitalAssets => 0x06,
            AppCategory::DeveloperTools => 0x07,
            AppCategory::Education => 0x08,
        }
    }

    pub fn from_id(id: u8) -> Option<Self> {
        match id {
            0x01 => Some(AppCategory::DeFi),
            0x02 => Some(AppCategory::Gaming),
            0x03 => Some(AppCategory::Social),
            0x04 => Some(AppCategory::Productivity),
            0x05 => Some(AppCategory::Infrastructure),
            0x06 => Some(AppCategory::DigitalAssets),
            0x07 => Some(AppCategory::DeveloperTools),
            0x08 => Some(AppCategory::Education),
            _ => None,
        }
    }
}

// ============================================================
// CAMPAIGN STATUS
// ============================================================

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo, MaxEncodedLen)]
pub enum CampaignStatus {
    Pending,
    Active,
    Expired,
    Terminated,
}

// ============================================================
// INBOX RECORD STATUS
// ============================================================

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo, MaxEncodedLen)]
pub enum InboxRecordStatus {
    Pending,
    Delivered,
    Dismissed,
    Engaged,
}

// ============================================================
// DEVELOPER VERIFICATION STATUS
// ============================================================

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo, MaxEncodedLen)]
pub enum DeveloperStatus {
    Unverified,
    Verified,
    Suspended,
}

// ============================================================
// TARGETING CRITERIA
// ============================================================

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, DecodeWithMemTracking, TypeInfo, MaxEncodedLen)]
pub struct TargetingCriteria {
    pub wallet_age_min: Option<u32>,
    pub wallet_age_max: Option<u32>,
    pub riz_balance_min: Option<u128>,
    pub riz_balance_max: Option<u128>,
    pub activity_min: Option<u32>,
    pub activity_max: Option<u32>,
    pub region_codes: BoundedVec<u8, frame_support::traits::ConstU32<64>>,
    pub category_history: BoundedVec<AppCategory, frame_support::traits::ConstU32<8>>,
    pub custom_logic_hash: Option<[u8; 32]>,
}

impl TargetingCriteria {
    pub fn matches_all_regions(&self) -> bool {
        self.region_codes.is_empty()
    }

    pub fn has_custom_logic(&self) -> bool {
        self.custom_logic_hash.is_some()
    }

    pub fn dimension_count(&self) -> u32 {
        let mut count = 0u32;
        if self.wallet_age_min.is_some() || self.wallet_age_max.is_some() { count += 1; }
        if self.riz_balance_min.is_some() || self.riz_balance_max.is_some() { count += 1; }
        if self.activity_min.is_some() || self.activity_max.is_some() { count += 1; }
        if !self.category_history.is_empty() { count += 1; }
        if !self.region_codes.is_empty() { count += 1; }
        if self.custom_logic_hash.is_some() { count += 1; }
        count
    }
}

// ============================================================
// DEVELOPER PROFILE
// ============================================================

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo, MaxEncodedLen)]
pub struct DeveloperProfile<AccountId, BlockNumber>
where
    AccountId: Encode + Decode + TypeInfo + Clone + PartialEq + MaxEncodedLen,
    BlockNumber: Encode + Decode + TypeInfo + Clone + PartialEq + MaxEncodedLen,
{
    pub account: AccountId,
    pub staked_riz: u128,
    pub status: DeveloperStatus,
    pub first_distribution_block: Option<BlockNumber>,
    pub violation_count: u32,
    pub total_campaigns: u32,
    pub total_deliveries: u64,
}

// ============================================================
// APP MANIFEST
// ============================================================

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo, MaxEncodedLen)]
pub struct AppManifest<AccountId, BlockNumber>
where
    AccountId: Encode + Decode + TypeInfo + Clone + PartialEq + MaxEncodedLen,
    BlockNumber: Encode + Decode + TypeInfo + Clone + PartialEq + MaxEncodedLen,
{
    pub manifest_hash: [u8; 32],
    pub developer: AccountId,
    pub category: AppCategory,
    pub registered_at: BlockNumber,
    pub metadata_uri: BoundedVec<u8, frame_support::traits::ConstU32<256>>,
}

// ============================================================
// CAMPAIGN
// ============================================================

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo, MaxEncodedLen)]
pub struct Campaign<AccountId, BlockNumber>
where
    AccountId: Encode + Decode + TypeInfo + Clone + PartialEq + MaxEncodedLen,
    BlockNumber: Encode + Decode + TypeInfo + Clone + PartialEq + MaxEncodedLen,
{
    pub campaign_id: [u8; 32],
    pub developer: AccountId,
    pub manifest_hash: [u8; 32],
    pub targeting: TargetingCriteria,
    pub status: CampaignStatus,
    pub created_at: BlockNumber,
    pub expires_at: BlockNumber,
    pub max_deliveries: u64,
    pub current_deliveries: u64,
    pub storage_fee_paid: u128,
}

// ============================================================
// INBOX RECORD
// ============================================================

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo, MaxEncodedLen)]
pub struct InboxRecord<AccountId, BlockNumber>
where
    AccountId: Encode + Decode + TypeInfo + Clone + PartialEq + MaxEncodedLen,
    BlockNumber: Encode + Decode + TypeInfo + Clone + PartialEq + MaxEncodedLen,
{
    pub record_id: [u8; 32],
    pub campaign_id: [u8; 32],
    pub developer: AccountId,
    pub manifest_hash: [u8; 32],
    pub category: AppCategory,
    pub status: InboxRecordStatus,
    pub delivered_at: BlockNumber,
    pub engaged_at: Option<BlockNumber>,
    pub reward_claimed: bool,
}

// ============================================================
// VALIDATOR PERFORMANCE
// ============================================================

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo, MaxEncodedLen)]
pub struct ValidatorPerformance<AccountId>
where
    AccountId: Encode + Decode + TypeInfo + Clone + PartialEq + MaxEncodedLen,
{
    pub validator: AccountId,
    pub uptime_bps: u32,
    pub finality_score_bps: u32,
    pub blocks_produced_bps: u32,
    pub slash_history_bps: u32,
    pub effective_stake: u128,
    pub delegated_stake: u128,
}

impl<AccountId> ValidatorPerformance<AccountId>
where
    AccountId: Encode + Decode + TypeInfo + Clone + PartialEq + MaxEncodedLen,
{
    /// Calculate performance score in basis points (0–10000).
    pub fn performance_score_bps(&self) -> u32 {
        let score = (self.uptime_bps * PERF_WEIGHT_UPTIME_BPS / 10_000)
            + (self.finality_score_bps * PERF_WEIGHT_FINALITY_BPS / 10_000)
            + (self.blocks_produced_bps * PERF_WEIGHT_BLOCKS_BPS / 10_000)
            + (self.slash_history_bps * PERF_WEIGHT_SLASH_BPS / 10_000);
        score.min(10_000)
    }

    /// Calculate performance multiplier in basis points (5000 = 0.50x, 12500 = 1.25x).
    pub fn performance_multiplier_bps(&self) -> u32 {
        let score = self.performance_score_bps();
        let range = PERF_MULTIPLIER_MAX_BPS - PERF_MULTIPLIER_MIN_BPS;
        PERF_MULTIPLIER_MIN_BPS + (score * range / 10_000)
    }
}

// ============================================================
// ENGAGEMENT EVENT
// ============================================================

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo, MaxEncodedLen)]
pub struct EngagementEvent<AccountId, BlockNumber>
where
    AccountId: Encode + Decode + TypeInfo + Clone + PartialEq + MaxEncodedLen,
    BlockNumber: Encode + Decode + TypeInfo + Clone + PartialEq + MaxEncodedLen,
{
    pub wallet: AccountId,
    pub record_id: [u8; 32],
    pub session_duration_seconds: u32,
    pub interaction_count: u32,
    pub submitted_at: BlockNumber,
}

impl<AccountId, BlockNumber> EngagementEvent<AccountId, BlockNumber>
where
    AccountId: Encode + Decode + TypeInfo + Clone + PartialEq + MaxEncodedLen,
    BlockNumber: Encode + Decode + TypeInfo + Clone + PartialEq + MaxEncodedLen,
{
    /// Returns true when session duration and interaction count meet protocol minimums.
    pub fn is_valid(&self) -> bool {
        self.session_duration_seconds >= MIN_SESSION_SECONDS
            && self.interaction_count >= MIN_INTERACTIONS
    }
}

#[cfg(test)]
mod tests;

// ============================================================
// EPOCH REWARD DISTRIBUTOR HOOK
// ============================================================

/// Lets a pallet that owns the "when does an epoch advance" clock (awarizon-state)
/// trigger reward distribution in the staking pallet (awarizon-consensus) without
/// the two pallets depending on each other directly.
pub trait EpochRewardDistributor {
    fn distribute_epoch_rewards(epoch: u64) -> frame_support::pallet_prelude::DispatchResult;
}

impl EpochRewardDistributor for () {
    fn distribute_epoch_rewards(_epoch: u64) -> frame_support::pallet_prelude::DispatchResult {
        Ok(())
    }
}

// ============================================================
// FEE DEPOSITOR HOOK
// ============================================================

/// Lets a pallet that collects protocol fees in native RIZ (e.g. awarizon-dex's Treasury
/// fee destination) record them into awarizon-consensus's per-epoch fee pool, without the
/// two pallets depending on each other directly. Mirrors [`EpochRewardDistributor`].
pub trait FeeDepositor {
    fn deposit_fee(amount: u128);
}

impl FeeDepositor for () {
    fn deposit_fee(_amount: u128) {}
}

// ============================================================
// CHAIN TYPE (for cross-chain address linking)
// ============================================================

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, DecodeWithMemTracking, TypeInfo, MaxEncodedLen, PartialOrd, Ord)]
pub enum ChainType {
    EVM,
    Solana,
    Bitcoin,
    Cosmos,
    Near,
}

// ============================================================
// LINK STATUS
// ============================================================

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, DecodeWithMemTracking, TypeInfo, MaxEncodedLen)]
pub enum LinkStatus {
    Pending,
    Verified,
    Revoked,
}

// ============================================================
// IDENTITY RECORD
// ============================================================

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo, MaxEncodedLen)]
pub struct IdentityRecord<BlockNumber>
where
    BlockNumber: Encode + Decode + TypeInfo + Clone + PartialEq + MaxEncodedLen,
{
    pub riz_name: Option<BoundedVec<u8, frame_support::traits::ConstU32<32>>>,
    pub display_name: Option<BoundedVec<u8, frame_support::traits::ConstU32<64>>>,
    pub bio: Option<BoundedVec<u8, frame_support::traits::ConstU32<256>>>,
    pub avatar_uri: Option<BoundedVec<u8, frame_support::traits::ConstU32<256>>>,
    pub website: Option<BoundedVec<u8, frame_support::traits::ConstU32<256>>>,
    pub registered_at: BlockNumber,
    pub verified: bool,
    pub reputation_score: u32,
}

// ============================================================
// LINKED ADDRESS
// ============================================================

#[derive(Clone, Debug, PartialEq, Eq, Encode, Decode, TypeInfo, MaxEncodedLen)]
pub struct LinkedAddress<BlockNumber>
where
    BlockNumber: Encode + Decode + TypeInfo + Clone + PartialEq + MaxEncodedLen,
{
    pub chain: ChainType,
    pub address: BoundedVec<u8, frame_support::traits::ConstU32<64>>,
    pub address_display: BoundedVec<u8, frame_support::traits::ConstU32<64>>,
    pub status: LinkStatus,
    pub linked_at: BlockNumber,
}
