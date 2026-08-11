// @awarizon/sdk — main entry point

// Client
export { AwarizonClient, connect } from './client'

// Types
export type {
  AppCategory,
  CampaignStatus,
  InboxRecordStatus,
  DeveloperStatus,
  TransactionType,
  TargetingCriteria,
  DeveloperProfile,
  AppManifest,
  Campaign,
  InboxRecord,
  ValidatorInfo,
  Delegation,
  ValidatorPerformance,
  EngagementEvent,
  NetworkStats,
  CampaignDeliveryStatus,
  TransactionSummary,
  WalletTargetingProfile,
  ValidatorPerformanceResponse,
  TokenStats,
  VestingSchedule,
  ChainType,
  LinkStatus,
  LinkedAddress,
  IdentityRecord,
  NameLookup,
  DexAssetWire,
  DexPoolResponse,
  DexQuoteResponse,
  DexTwapResponse,
} from './types'

// Constants
export {
  PLANCK,
  RIZ,
  MICRO_RIZ,
  MILLI_RIZ,
  DEFAULT_ENDPOINT,
  DEFAULT_INDEXER_ENDPOINT,
  CHAIN_NAME,
  BLOCK_TIME_SECONDS,
  EPOCH_LENGTH_BLOCKS,
  MIN_SESSION_SECONDS,
  MIN_INTERACTIONS,
  ENGAGEMENT_COOLDOWN_HOURS,
  MAX_ENGAGEMENT_EVENTS_PER_DAY,
  MIN_CAMPAIGN_DURATION_DAYS,
  MAX_CAMPAIGN_DURATION_DAYS,
  DEFAULT_CAMPAIGN_DURATION_DAYS,
  DEVELOPER_MIN_TENURE_DAYS,
  MAX_TARGETING_DIMENSIONS,
  MAX_REGION_CODES_PER_CAMPAIGN,
  MAX_CATEGORY_HISTORY_ENTRIES,
  GENESIS_VALIDATORS,
  TARGET_VALIDATORS,
  PERF_WEIGHT_UPTIME_BPS,
  PERF_WEIGHT_FINALITY_BPS,
  PERF_WEIGHT_BLOCKS_BPS,
  PERF_WEIGHT_SLASH_BPS,
} from './constants'

// Utils
export {
  formatRiz,
  parseRiz,
  hexToBytes,
  bytesToHex,
  generateCampaignId,
  isValidAddress,
  blocksToTime,
  parsePlanckString,
} from './utils'

// Custom types registry (for advanced usage)
export { awarizonTypes, awarizonRpc } from './customTypes'

// RPC
export {
  getDeveloperProfile,
  getDeveloperCampaigns,
  getDeveloperManifests,
  getCampaign,
  getActiveCampaignCount,
  getCampaignDeliveryStatus,
  getInboxCount,
  getInboxRecord,
  getWalletTargetingProfile,
  checkCampaignMatch,
  getActiveValidators,
  getValidatorCount,
  getValidatorPerformance,
  getNetworkStats,
  getTokenStats,
  getRecentTransactions,
  getBlockTransactions,
  getVestingSchedule,
  getIdentity,
  lookupName,
  getLinkedAddresses,
  isNameAvailable,
  getTotalIdentities,
  getDexPool,
  getDexQuote,
  getDexTwap,
  getAllDexPools,
  getDexFeeDestination,
  getDexTotalBurned,
} from './rpc'

// Extrinsics
export * from './extrinsics'

// Wallet helpers
export {
  createKeyring,
  keypairFromMnemonic,
  keypairFromSeed,
  aliceKeypair,
  bobKeypair,
  signAndSend,
} from './wallet'

// Errors
export {
  AwarizonError,
  DeveloperNotFoundError,
  DeveloperAlreadyRegisteredError,
  DeveloperNotVerifiedError,
  DeveloperSuspendedError,
  ManifestNotFoundError,
  ManifestAlreadyRegisteredError,
  ManifestLimitReachedError,
  CampaignNotFoundError,
  CampaignNotActiveError,
  CampaignExpiredError,
  CampaignDeliveryLimitReachedError,
  InboxRecordNotFoundError,
  InboxAlreadyDeliveredError,
  InboxFullError,
  EngagementCooldownActiveError,
  EngagementDailyLimitReachedError,
  EngagementInvalidError,
  InsufficientStakeError,
  InsufficientBalanceError,
  TargetingDimensionLimitExceededError,
  InvalidManifestHashError,
  InvalidCampaignIdError,
  UnauthorizedError,
  EpochNotReadyError,
  NotExpiredYetError,
  ResetNotReadyError,
  ValidatorAlreadyRegisteredError,
  ValidatorNotFoundError,
  RegionCapExceededError,
  CountryCapExceededError,
  DelegationNotFoundError,
  CannotDelegateToSelfError,
  ValidatorNotActiveError,
  AlreadyDelegatedError,
  MaxValidatorsReachedError,
  parseChainError,
} from './errors'
