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
  total_extrinsics: number       // u64
  circulating_supply: string     // u128 as decimal string
  non_circulating_supply: string // u128 as decimal string
}

export interface TransactionSummary {
  block_number: number    // u32
  extrinsic_index: number // u32
  success: boolean
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

export interface VestingSchedule {
  locked: string       // u128 as decimal string — total locked at schedule start
  per_block: string    // u128 as decimal string — planck released per block
  starting_block: number // u32 — block at which vesting begins
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

// ----------------------------------------------------------------
// Identity / Links types (pallets/awarizon-identity, awarizon-links)
// ----------------------------------------------------------------

export type ChainType =
  | 'EVM'
  | 'Solana'
  | 'Bitcoin'
  | 'Cosmos'
  | 'Near'

export type LinkStatus =
  | 'Pending'
  | 'Verified'
  | 'Revoked'

export interface LinkedAddress {
  chain: ChainType
  address: string        // display string e.g. "0x..." or "Sol:..."
  status: LinkStatus
  linkedAt: number       // BlockNumber
}

export interface IdentityRecord {
  account: string              // SS58
  rizName: string | null       // "harry" (without .riz suffix)
  rizNameFull: string | null   // "harry.riz" (with suffix)
  displayName: string | null
  bio: string | null
  avatarUri: string | null
  website: string | null
  registeredAt: number         // BlockNumber
  verified: boolean
  reputationScore: number      // 0–10000
  linkedAddresses: LinkedAddress[]
}

export interface NameLookup {
  rizName: string              // without suffix
  account: string              // SS58
  identity: IdentityRecord | null
}

// ----------------------------------------------------------------
// DEX (pallets/awarizon-dex, node/src/awarizon_rpc.rs — RpcAsset/RpcPool/RpcQuote/RpcTwap)
// Wire shape only — snake_case, exactly as the node RPC serializes it.
// ----------------------------------------------------------------

// serde representation of the pallet's Asset enum: unit variant -> bare
// string, tuple variant -> single-key object. Same shape is used for
// both RPC params and RPC responses.
export type DexAssetWire = 'native' | { token: number }

export interface DexPoolResponse {
  asset_a: DexAssetWire
  asset_b: DexAssetWire
  reserve_a: string          // u128 as decimal string
  reserve_b: string          // u128 as decimal string
  lp_total_supply: string    // u128 as decimal string
  lp_asset_id: number        // u32
  total_volume: string       // u128 as decimal string
  total_fees: string         // u128 as decimal string
  total_burned: string       // u128 as decimal string
  fee_bps: number            // u32
  is_riz_pair: boolean
  created_at: number         // BlockNumber
  last_updated_block: number // BlockNumber
}

export interface DexQuoteResponse {
  asset_in: DexAssetWire
  asset_out: DexAssetWire
  amount_in: string          // u128 as decimal string
  amount_out: string         // u128 as decimal string
  fee: string                // u128 as decimal string
  protocol_fee: string       // u128 as decimal string
  price_impact_bps: number   // u32
  path: DexAssetWire[]
  via_riz: boolean
}

export interface DexTwapResponse {
  price_a_cumulative: string // u128 as decimal string
  price_b_cumulative: string // u128 as decimal string
  last_block: number         // BlockNumber
  spot_price_a_per_b: string // u128 as decimal string
  spot_price_b_per_a: string // u128 as decimal string
}
