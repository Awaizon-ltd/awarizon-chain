// Re-export all types from @awarizon/core
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
  TargetingOptions,
  // SDK re-exports
  ChainType,
  LinkStatus,
  LinkedAddress,
  IdentityRecord,
  NameLookup,
} from '@awarizon/core'

// React-specific types
export interface AwarizonProviderConfig {
  endpoint: string
}

export interface WalletCreateResult {
  mnemonic: string
  address: string
}

export interface WalletImportResult {
  address: string
}
