// Provider
export { AwarizonProvider } from './AwarizonProvider'
export type { AwarizonProviderProps } from './AwarizonProvider'

// Context (for advanced use)
export { AwarizonClientContext, useAwarizonClientContext } from './context'
export type { AwarizonClientContextValue } from './context'

// Primary hook
export { useAwarizon } from './useAwarizon'

// ConnectButton
export { ConnectButton } from './ConnectButton'
export type { ConnectButtonProps } from './ConnectButton'

// createClient and Wallet — so React devs only need one import
export { createClient } from '../client'
export type { ClientConfig, WalletConfig } from '../client'
export { Wallet } from '../wallet/Wallet'
export type { GeneratedWallet, RestoredWallet } from '../wallet/Wallet'

// Main class and errors
export { Awarizon } from '../core/Awarizon'
export { AwarizonError } from '../errors'
export type { AwarizonErrorCode } from '../errors'

// Adapters
export { MnemonicAdapter, PolkadotAdapter, MetaMaskAdapter } from '../adapters'
export type { WalletAdapter } from '../adapters'

// Utils
export { parseAmount, formatAmount, isValidAmount } from '../utils/amounts'
export { isValidSS58, isRizName, isEvmAddress, normalizeRizName } from '../utils/addresses'

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
