// Token denomination
pub const PLANCK: u128 = 1;
pub const RIZ: u128 = 1_000_000_000_000; // 10^12 planck units
pub const MICRO_RIZ: u128 = 1_000_000;   // 10^6 planck units
pub const MILLI_RIZ: u128 = 1_000_000_000; // 10^9 planck units

// Consensus
pub const GENESIS_VALIDATORS: u32 = 51;
pub const TARGET_VALIDATORS: u32 = 121;
pub const BLOCK_TIME_SECONDS: u32 = 3;
pub const EPOCH_LENGTH_BLOCKS: u32 = 28_800;
pub const BFT_FAULT_TOLERANCE: u32 = 17;
pub const BFT_THRESHOLD: u32 = 34;
pub const WALLET_EXPANSION_TRIGGER: u32 = 100_000;

// Throughput
pub const TOTAL_TPS: u32 = 10_000;
pub const DISTRIBUTION_LANE_TPS: u32 = 6_000;
pub const FINANCIAL_LANE_TPS: u32 = 2_500;
pub const SYSTEM_LANE_TPS: u32 = 1_500;

// Campaign rules
pub const MIN_CAMPAIGN_DURATION_DAYS: u32 = 1;
pub const MAX_CAMPAIGN_DURATION_DAYS: u32 = 90;
pub const DEFAULT_CAMPAIGN_DURATION_DAYS: u32 = 30;
pub const RENEWAL_GAS_DISCOUNT_BPS: u32 = 5_000; // 50%

// Engagement rules
pub const MIN_SESSION_SECONDS: u32 = 120;
pub const MIN_INTERACTIONS: u32 = 5;
pub const ENGAGEMENT_COOLDOWN_HOURS: u32 = 24;
pub const MAX_ENGAGEMENT_EVENTS_PER_DAY: u32 = 10;

// Storage economics
pub const BASE_STORAGE_RATE_PLANCK_PER_BYTE_PER_EPOCH: u128 = 10;
pub const MANIFEST_STORAGE_BYTES: u32 = 256;

// Inbox pruning
pub const INBOX_PRUNING_THRESHOLD_BLOCKS: u32 = 9_216_000;
pub const INBOX_ARCHIVE_MONTHS: u32 = 12;

// Geographic caps (basis points)
pub const MAX_VALIDATORS_PER_REGION_BPS: u32 = 2_000; // 20%
pub const MAX_VALIDATORS_PER_COUNTRY_BPS: u32 = 1_000; // 10%

// Inbox State Reserve — bytes32 of "INBOXX"
// Explicit array to stay compatible with Rust 1.82 (const IndexMut landed in 1.83)
pub const INBOX_STATE_RESERVE: [u8; 32] = [
    b'I', b'N', b'B', b'O', b'X', b'X', 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
];

// Fee model weight tiers (ref_time units)
// Multiply by WeightFeeCoefficient (10 planck/unit) to get approximate planck cost.
// LIGHT        ≈ 0.0001  RIZ  (100_000_000 planck)
// STANDARD     ≈ 0.0005  RIZ  (500_000_000 planck)
// HEAVY        ≈ 0.001   RIZ  (1_000_000_000 planck)
// VERY_HEAVY   ≈ 0.0025  RIZ  (2_500_000_000 planck)
// OCW          ≈ 0.00005 RIZ  (50_000_000 planck) — near-free, protocol-internal
pub const WEIGHT_TIER_LIGHT: u64 = 10_000_000;
pub const WEIGHT_TIER_STANDARD: u64 = 50_000_000;
pub const WEIGHT_TIER_HEAVY: u64 = 100_000_000;
pub const WEIGHT_TIER_VERY_HEAVY: u64 = 250_000_000;
pub const WEIGHT_TIER_OCW: u64 = 5_000_000;

// Transaction type identifiers
pub const TX_TYPE_FINANCIAL: u8 = 0x01;
pub const TX_TYPE_DISTRIBUTION: u8 = 0x02;
pub const TX_TYPE_SYSTEM: u8 = 0x03;

// Targeting
pub const MAX_TARGETING_DIMENSIONS: u32 = 6;
pub const MAX_REGION_CODES_PER_CAMPAIGN: u32 = 64;
pub const MAX_CATEGORY_HISTORY_ENTRIES: u32 = 8;
pub const MAX_METADATA_URI_BYTES: u32 = 256;

// Validator performance weights (basis points, sum = 10000)
pub const PERF_WEIGHT_UPTIME_BPS: u32 = 5_000;     // 50%
pub const PERF_WEIGHT_FINALITY_BPS: u32 = 2_500;   // 25%
pub const PERF_WEIGHT_BLOCKS_BPS: u32 = 1_500;     // 15%
pub const PERF_WEIGHT_SLASH_BPS: u32 = 1_000;      // 10%
pub const PERF_MULTIPLIER_MIN_BPS: u32 = 5_000;    // 0.50x
pub const PERF_MULTIPLIER_MAX_BPS: u32 = 12_500;   // 1.25x

// Developer verification
pub const DEVELOPER_MIN_TENURE_DAYS: u32 = 30;

// Tokenomics
pub const ENGAGEMENT_REWARD_POOL_BPS: u32 = 3_000; // 30% of total supply
