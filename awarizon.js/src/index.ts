import { parseAmount, formatAmount, isValidAmount } from './utils/amounts'
import { isValidSS58, isRizName } from './utils/addresses'

// PRIMARY API
export { createClient } from './client'
export type { ClientConfig, WalletConfig } from './client'

// Wallet utility class
export { Wallet } from './wallet/Wallet'
export type { GeneratedWallet, RestoredWallet } from './wallet/Wallet'

// Main class — still exported for advanced use
export { Awarizon } from './core/Awarizon'

// Adapters — exported for power users
export {
  MnemonicAdapter,
  PolkadotAdapter,
  KeypairAdapter,
  MetaMaskAdapter,
  WalletConnectAdapter,
  AutoAdapter,
  AwarizonWalletAdapter,
} from './adapters'
export type { WalletAdapter, ConnectedWallet } from './adapters'

// Errors
export { AwarizonError } from './errors'
export type { AwarizonErrorCode } from './errors'

// Utils — individual exports
export {
  parseAmount,
  formatAmount,
  isValidAmount,
  rizToNumber,
  planckToRiz,
  RIZ,
  PLANCK,
  MICRO_RIZ,
} from './utils/amounts'
export {
  isValidSS58,
  isRizName,
  isEvmAddress,
  normalizeRizName,
} from './utils/addresses'

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
} from './core/types'

// Constants
export {
  DEFAULT_ENDPOINT,
  MIN_SESSION_SECONDS,
  MIN_INTERACTIONS,
  MIN_CAMPAIGN_DURATION_DAYS,
  MAX_CAMPAIGN_DURATION_DAYS,
} from '@awarizon/core'

// Convenience utils namespace
export const utils = {
  parse: parseAmount,
  format: formatAmount,
  isValidAmount,
  isAddress: isValidSS58,
  isRizName,
  truncate: (address: string, chars = 6): string =>
    address.length > chars * 2 + 1
      ? `${address.slice(0, chars)}…${address.slice(-chars)}`
      : address,
} as const
