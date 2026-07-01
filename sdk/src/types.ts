// All TypeScript types derived from Rust source.
// Rust u32 → number, u64 → bigint, u128 → bigint, [u8;32] → string (0x hex),
// Option<T> → T | null, BoundedVec<T,_> → T[], AccountId → string (SS58).

// ----------------------------------------------------------------
// Enums
// ----------------------------------------------------------------

export type AppCategory =
  | 'DeFi'
  | 'Gaming'
  | 'Social'
  | 'Productivity'
  | 'Infrastructure'
  | 'DigitalAssets'
  | 'DeveloperTools'
  | 'Education'

export type CampaignStatus = 'Pending' | 'Active' | 'Expired' | 'Terminated'

export type InboxRecordStatus = 'Pending' | 'Delivered' | 'Dismissed' | 'Engaged'

export type DeveloperStatus = 'Unverified' | 'Verified' | 'Suspended'

export type TransactionType = 'Financial' | 'Distribution' | 'System'

// ----------------------------------------------------------------
// TargetingCriteria (pallets/awarizon-types/src/lib.rs)
// ----------------------------------------------------------------

export interface TargetingCriteria {
  wallet_age_min: number | null      // Option<u32>
  wallet_age_max: number | null      // Option<u32>
  riz_balance_min: bigint | null     // Option<u128>
  riz_balance_max: bigint | null     // Option<u128>
  activity_min: number | null        // Option<u32>
  activity_max: number | null        // Option<u32>
  region_codes: number[]             // BoundedVec<u8, 64>
  category_history: AppCategory[]    // BoundedVec<AppCategory, 8>
  custom_logic_hash: string | null   // Option<[u8; 32]> — 0x hex
}

// ----------------------------------------------------------------
// DeveloperProfile (pallets/awarizon-types/src/lib.rs)
// ----------------------------------------------------------------

export interface DeveloperProfile {
  account: string                          // AccountId (SS58)
  staked_riz: bigint                       // u128 (returned as string by RPC)
  status: DeveloperStatus
  first_distribution_block: number | null  // Option<BlockNumber>
  violation_count: number                  // u32
  total_campaigns: number                  // u32
  total_deliveries: bigint                 // u64
}

// ----------------------------------------------------------------
// AppManifest (pallets/awarizon-types/src/lib.rs)
// ----------------------------------------------------------------

export interface AppManifest {
  manifest_hash: string    // [u8; 32] — 0x hex
  developer: string        // AccountId (SS58)
  category: AppCategory
  registered_at: number    // BlockNumber
  metadata_uri: string     // BoundedVec<u8, 256> decoded as UTF-8
}

// ----------------------------------------------------------------
// Campaign (pallets/awarizon-types/src/lib.rs)
// Note: RPC omits `targeting` — use getCampaign for full struct
// ----------------------------------------------------------------

export interface Campaign {
  campaign_id: string        // [u8; 32] — 0x hex
  developer: string          // AccountId (SS58)
  manifest_hash: string      // [u8; 32] — 0x hex
  status: CampaignStatus
  created_at: number         // BlockNumber
  expires_at: number         // BlockNumber
  max_deliveries: bigint     // u64
  current_deliveries: bigint // u64
  storage_fee_paid: bigint   // u128 (returned as string by RPC)
}

// ----------------------------------------------------------------
// InboxRecord (pallets/awarizon-types/src/lib.rs)
// ----------------------------------------------------------------

export interface InboxRecord {
  record_id: string               // [u8; 32] — 0x hex
  campaign_id: string             // [u8; 32] — 0x hex
  developer: string               // AccountId (SS58)
  manifest_hash: string           // [u8; 32] — 0x hex
  category: AppCategory
  status: InboxRecordStatus
  delivered_at: number            // BlockNumber
  engaged_at: number | null       // Option<BlockNumber>
  reward_claimed: boolean
}

// ----------------------------------------------------------------
// ValidatorInfo (pallets/awarizon-consensus/src/lib.rs)
// ----------------------------------------------------------------

export interface ValidatorInfo {
  account: string           // AccountId (SS58)
  self_stake: bigint        // u128
  delegated_stake: bigint   // u128
  region_code: number       // u8
  country_code: number      // u8
  uptime_bps: number        // u32
  finality_bps: number      // u32
  blocks_bps: number        // u32
  slash_count: number       // u32
  is_active: boolean
  epoch_registered: bigint  // u64
}

// ----------------------------------------------------------------
// Delegation (pallets/awarizon-consensus/src/lib.rs)
// ----------------------------------------------------------------

export interface Delegation {
  delegator: string       // AccountId (SS58)
  validator: string       // AccountId (SS58)
  amount: bigint          // u128
  epoch_delegated: bigint // u64
}

// ----------------------------------------------------------------
// RPC response types (node/src/awarizon_rpc.rs)
// ----------------------------------------------------------------

export interface NetworkStats {
  total_wallets: bigint          // u64
  total_deliveries: bigint       // u64
  active_campaigns: bigint       // u64
  total_staked: string           // u128 as decimal string
  current_epoch: bigint          // u64
  inbox_reserve_balance: string  // u128 as decimal string
}

export interface CampaignDeliveryStatus {
  current_deliveries: bigint  // u64
  max_deliveries: bigint      // u64
  remaining: bigint           // u64
  percentage_used: number     // u32
}

export interface WalletTargetingProfile {
  wallet_age_days: number   // u32
  activity_count: number    // u32
  category_history: number[] // Vec<u8> (AppCategory IDs)
  region_code: number       // u8
}

export interface ValidatorPerformanceResponse {
  performance_score: number  // u32
  effective_rank: string     // u128 as decimal string
  uptime_bps: number         // u32
  finality_bps: number       // u32
  blocks_bps: number         // u32
  slash_count: number        // u32
}

export interface TokenStats {
  total_issuance: string           // u128 as decimal string
  engagement_pool_balance: string  // u128 as decimal string
}

// ----------------------------------------------------------------
// EngagementEvent (pallets/awarizon-types/src/lib.rs)
// ----------------------------------------------------------------

export interface EngagementEvent {
  wallet: string                    // AccountId (SS58)
  record_id: string                 // [u8; 32] — 0x hex
  session_duration_seconds: number  // u32
  interaction_count: number         // u32
  submitted_at: number              // BlockNumber
}

// ----------------------------------------------------------------
// ValidatorPerformance (pallets/awarizon-types/src/lib.rs)
// ----------------------------------------------------------------

export interface ValidatorPerformance {
  validator: string       // AccountId (SS58)
  uptime_bps: number      // u32
  finality_score_bps: number  // u32
  blocks_produced_bps: number // u32
  slash_history_bps: number   // u32
  effective_stake: bigint     // u128
  delegated_stake: bigint     // u128
}
