// Native Provider (uses AsyncStorage by default)
export { AwarizonProvider } from './AwarizonProvider'
export type { NativeAwarizonProviderProps } from './AwarizonProvider'
export { createNativeStorage } from './storage'

// Hook — shares same context as web provider
export { useAwarizon } from '../react/useAwarizon'
export { AwarizonClientContext, useAwarizonClientContext } from '../react/context'
export type { AwarizonClientContextValue } from '../react/context'

// createClient and Wallet
export { createClient } from '../client'
export type { ClientConfig, WalletConfig } from '../client'
export { Wallet } from '../wallet/Wallet'
export type { GeneratedWallet, RestoredWallet } from '../wallet/Wallet'

// Main class and errors
export { Awarizon } from '../core/Awarizon'
export { AwarizonError } from '../errors'
export type { AwarizonErrorCode } from '../errors'

// Adapters
export { MnemonicAdapter, PolkadotAdapter } from '../adapters'
export type { WalletAdapter } from '../adapters'

// Utils
export { parseAmount, formatAmount, isValidAmount } from '../utils/amounts'
export { isValidSS58, isRizName, normalizeRizName } from '../utils/addresses'

// Types
export type {
  TxResult,
  Balance,
  GeneratedWallet as CoreGeneratedWallet,
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
  ChainType,
  LinkStatus,
  LinkedAddress,
  IdentityRecord,
  NameLookup,
} from '../core/types'
