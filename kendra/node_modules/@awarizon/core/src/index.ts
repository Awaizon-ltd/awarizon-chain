// Main client
export { AwarizonCore, createCore } from './AwarizonCore'
export type { CoreConfig } from './AwarizonCore'

// Keyring
export { AwarizonKeyring } from './keyring'

// Types
export type {
  TxResult,
  Balance,
  GeneratedWallet,
  WalletAccount,
  InboxItem,
  ClaimResult,
  DeveloperStatus,
  AppManifest,
  Campaign,
  Asset,
  AssetBalance,
  NFTItem,
  ValidatorInfo,
  NetworkStats,
  IdentityRecord,
  NameLookup,
  LinkedAddress,
  ChainType,
  LinkStatus,
  TargetingOptions,
} from './types'

// Utils
export { parseAmount, formatAmount, isValidAmount } from './utils/amounts'

// Re-export constants from SDK that consumers need
export {
  RIZ,
  PLANCK,
  MICRO_RIZ,
  DEFAULT_ENDPOINT,
  MIN_SESSION_SECONDS,
  MIN_INTERACTIONS,
  MIN_CAMPAIGN_DURATION_DAYS,
  MAX_CAMPAIGN_DURATION_DAYS,
} from '@awarizon/sdk'
