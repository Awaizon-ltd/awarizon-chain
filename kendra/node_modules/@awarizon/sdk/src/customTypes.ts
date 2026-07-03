// Custom SCALE type registry and RPC definitions for @polkadot/api.
// Enum variants and struct field names derived from:
//   pallets/awarizon-types/src/lib.rs
//   pallets/awarizon-consensus/src/lib.rs
//   node/src/awarizon_rpc.rs

export const awarizonTypes = {
  // pallets/awarizon-types/src/lib.rs — enum AppCategory
  AppCategory: {
    _enum: [
      'DeFi',
      'Gaming',
      'Social',
      'Productivity',
      'Infrastructure',
      'DigitalAssets',
      'DeveloperTools',
      'Education',
    ],
  },

  // pallets/awarizon-types/src/lib.rs — enum CampaignStatus
  CampaignStatus: {
    _enum: ['Pending', 'Active', 'Expired', 'Terminated'],
  },

  // pallets/awarizon-types/src/lib.rs — enum InboxRecordStatus
  InboxRecordStatus: {
    _enum: ['Pending', 'Delivered', 'Dismissed', 'Engaged'],
  },

  // pallets/awarizon-types/src/lib.rs — enum DeveloperStatus
  DeveloperStatus: {
    _enum: ['Unverified', 'Verified', 'Suspended'],
  },

  // pallets/awarizon-types/src/lib.rs — enum TransactionType
  TransactionType: {
    _enum: ['Financial', 'Distribution', 'System'],
  },

  // pallets/awarizon-types/src/lib.rs — struct TargetingCriteria
  TargetingCriteria: {
    wallet_age_min: 'Option<u32>',
    wallet_age_max: 'Option<u32>',
    riz_balance_min: 'Option<u128>',
    riz_balance_max: 'Option<u128>',
    activity_min: 'Option<u32>',
    activity_max: 'Option<u32>',
    region_codes: 'Vec<u8>',
    category_history: 'Vec<AppCategory>',
    custom_logic_hash: 'Option<H256>',
  },

  // pallets/awarizon-types/src/lib.rs — struct DeveloperProfile<AccountId, BlockNumber>
  DeveloperProfile: {
    account: 'AccountId',
    staked_riz: 'u128',
    status: 'DeveloperStatus',
    first_distribution_block: 'Option<u32>',
    violation_count: 'u32',
    total_campaigns: 'u32',
    total_deliveries: 'u64',
  },

  // pallets/awarizon-types/src/lib.rs — struct AppManifest<AccountId, BlockNumber>
  AppManifest: {
    manifest_hash: 'H256',
    developer: 'AccountId',
    category: 'AppCategory',
    registered_at: 'u32',
    metadata_uri: 'Vec<u8>',
  },

  // pallets/awarizon-types/src/lib.rs — struct Campaign<AccountId, BlockNumber>
  Campaign: {
    campaign_id: 'H256',
    developer: 'AccountId',
    manifest_hash: 'H256',
    targeting: 'TargetingCriteria',
    status: 'CampaignStatus',
    created_at: 'u32',
    expires_at: 'u32',
    max_deliveries: 'u64',
    current_deliveries: 'u64',
    storage_fee_paid: 'u128',
  },

  // pallets/awarizon-types/src/lib.rs — struct InboxRecord<AccountId, BlockNumber>
  InboxRecord: {
    record_id: 'H256',
    campaign_id: 'H256',
    developer: 'AccountId',
    manifest_hash: 'H256',
    category: 'AppCategory',
    status: 'InboxRecordStatus',
    delivered_at: 'u32',
    engaged_at: 'Option<u32>',
    reward_claimed: 'bool',
  },

  // pallets/awarizon-consensus/src/lib.rs — struct ValidatorInfo<AccountId>
  ValidatorInfo: {
    account: 'AccountId',
    self_stake: 'u128',
    delegated_stake: 'u128',
    region_code: 'u8',
    country_code: 'u8',
    uptime_bps: 'u32',
    finality_bps: 'u32',
    blocks_bps: 'u32',
    slash_count: 'u32',
    is_active: 'bool',
    epoch_registered: 'u64',
  },

  // pallets/awarizon-consensus/src/lib.rs — struct Delegation<AccountId>
  Delegation: {
    delegator: 'AccountId',
    validator: 'AccountId',
    amount: 'u128',
    epoch_delegated: 'u64',
  },
}

// RPC method definitions for @polkadot/api.
// All methods are in the "awarizon" namespace and return JSON (not SCALE).
// Wire names from: node/src/awarizon_rpc.rs #[method(name = "...")]
export const awarizonRpc = {
  awarizon: {
    // Developer endpoints
    getDeveloperProfile: {
      description: 'Get developer profile by SS58 account address',
      params: [{ name: 'account', type: 'Text' }],
      type: 'Json',
    },
    getDeveloperCampaigns: {
      description: 'Get all campaign IDs for a developer',
      params: [{ name: 'account', type: 'Text' }],
      type: 'Vec<Text>',
    },
    getDeveloperManifests: {
      description: 'Get all manifest hashes for a developer',
      params: [{ name: 'account', type: 'Text' }],
      type: 'Vec<Text>',
    },

    // Campaign endpoints
    getCampaign: {
      description: 'Get campaign details by campaign ID (0x hex)',
      params: [{ name: 'campaign_id', type: 'Text' }],
      type: 'Json',
    },
    getActiveCampaignCount: {
      description: 'Get the number of currently active campaigns',
      params: [],
      type: 'u64',
    },
    getCampaignDeliveryStatus: {
      description: 'Get delivery progress for a campaign',
      params: [{ name: 'campaign_id', type: 'Text' }],
      type: 'Json',
    },

    // Inbox endpoints
    getInboxCount: {
      description: 'Get number of inbox records for a wallet',
      params: [{ name: 'wallet', type: 'Text' }],
      type: 'u32',
    },
    getInboxRecord: {
      description: 'Get a specific inbox record by wallet and record ID',
      params: [
        { name: 'wallet', type: 'Text' },
        { name: 'record_id', type: 'Text' },
      ],
      type: 'Json',
    },

    // Targeting endpoints
    getWalletTargetingProfile: {
      description: 'Get pre-computed targeting profile for a wallet',
      params: [{ name: 'wallet', type: 'Text' }],
      type: 'Json',
    },
    checkCampaignMatch: {
      description: 'Check cached targeting match result for (campaign, wallet)',
      params: [
        { name: 'campaign_id', type: 'Text' },
        { name: 'wallet', type: 'Text' },
      ],
      type: 'bool',
    },

    // Validator endpoints
    getActiveValidators: {
      description: 'Get SS58 addresses of all active validators',
      params: [],
      type: 'Vec<Text>',
    },
    getValidatorCount: {
      description: 'Get total number of active validators',
      params: [],
      type: 'u32',
    },
    getValidatorPerformance: {
      description: 'Get performance metrics for a validator',
      params: [{ name: 'account', type: 'Text' }],
      type: 'Json',
    },

    // Network stats endpoints
    getNetworkStats: {
      description: 'Get Awarizon network statistics',
      params: [],
      type: 'Json',
    },
    getTokenStats: {
      description: 'Get token issuance and engagement pool statistics',
      params: [],
      type: 'Json',
    },
  },
}
