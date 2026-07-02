// Protocol constants derived from pallets/awarizon-types/src/constants.rs

// ----------------------------------------------------------------
// Token denomination
// ----------------------------------------------------------------
export const PLANCK = 1n
export const RIZ = 1_000_000_000_000n    // 10^12 planck
export const MICRO_RIZ = 1_000_000n      // 10^6 planck
export const MILLI_RIZ = 1_000_000_000n  // 10^9 planck

// ----------------------------------------------------------------
// Network defaults
// ----------------------------------------------------------------
export const DEFAULT_ENDPOINT = 'ws://127.0.0.1:9944'
export const CHAIN_NAME = 'Awarizon Development'

// ----------------------------------------------------------------
// Consensus
// ----------------------------------------------------------------
export const GENESIS_VALIDATORS = 51
export const TARGET_VALIDATORS = 121
export const BLOCK_TIME_SECONDS = 3
export const EPOCH_LENGTH_BLOCKS = 28_800

// ----------------------------------------------------------------
// Campaign rules
// ----------------------------------------------------------------
export const MIN_CAMPAIGN_DURATION_DAYS = 1
export const MAX_CAMPAIGN_DURATION_DAYS = 90
export const DEFAULT_CAMPAIGN_DURATION_DAYS = 30

// ----------------------------------------------------------------
// Engagement rules
// ----------------------------------------------------------------
export const MIN_SESSION_SECONDS = 120
export const MIN_INTERACTIONS = 5
export const ENGAGEMENT_COOLDOWN_HOURS = 24
export const MAX_ENGAGEMENT_EVENTS_PER_DAY = 10

// ----------------------------------------------------------------
// Targeting limits
// ----------------------------------------------------------------
export const MAX_TARGETING_DIMENSIONS = 6
export const MAX_REGION_CODES_PER_CAMPAIGN = 64
export const MAX_CATEGORY_HISTORY_ENTRIES = 8

// ----------------------------------------------------------------
// Developer verification
// ----------------------------------------------------------------
export const DEVELOPER_MIN_TENURE_DAYS = 30

// ----------------------------------------------------------------
// Validator performance weights (basis points, sum = 10000)
// ----------------------------------------------------------------
export const PERF_WEIGHT_UPTIME_BPS = 5_000
export const PERF_WEIGHT_FINALITY_BPS = 2_500
export const PERF_WEIGHT_BLOCKS_BPS = 1_500
export const PERF_WEIGHT_SLASH_BPS = 1_000
export const PERF_MULTIPLIER_MIN_BPS = 5_000
export const PERF_MULTIPLIER_MAX_BPS = 12_500

// ----------------------------------------------------------------
// Geographic caps (basis points)
// ----------------------------------------------------------------
export const MAX_VALIDATORS_PER_REGION_BPS = 2_000  // 20%
export const MAX_VALIDATORS_PER_COUNTRY_BPS = 1_000 // 10%
