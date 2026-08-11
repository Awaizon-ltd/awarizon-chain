// Primary classes
export { Wallet } from './Wallet'
export { Provider } from './Provider'
export { Signer } from './Signer'

// Errors
export { AwarizonError, parseChainError, CHAIN_ERRORS } from './errors'
export type { ErrorCode } from './errors'

// Utils
export {
  parseAmount,
  formatAmount,
  truncateAddress,
  isAddress,
  isRizName,
  resolveAddress,
} from './utils'

// All public types
export type {
  AmountInput,
  TxResult,
} from './utils'

export type {
  Transaction,
  TransactionPage,
  RecentTransfer,
  IndexerBlock,
  IndexerStats,
  CampaignEvent,
  CampaignEventPage,
  CampaignIndexerStats,
  InboxEvent,
  InboxEventPage,
  AppSearchResult,
  AppSearchPage,
  IndexerDexPool,
  IndexerDexSwap,
  IndexerDexSwapPage,
  IndexerDexPricePoint,
  IndexerDexStats,
  WsChannel,
  WsEvent,
  WsSubscription,
} from './modules/history'

export { Asset } from './modules/dex'
export type {
  DexPool,
  DexQuote,
  DexTwap,
  DexTxResult,
} from './modules/dex'

export type { ProviderOptions } from './Provider'

// Wallet injection — lets the Awarizon wallet inject itself as
// window.injectedWeb3['awarizon'] for dApps to connect to.
export {
  injectAwarizonProvider,
  removeAwarizonProvider,
} from './injection/provider'

export {
  isAwarizonAvailable,
  connectAwarizonWallet,
  getAwarizonAccounts,
  getInboxContext,
  signerFromAwarizonWallet,
  subscribeAwarizonAccounts,
} from './injection/connect'

export type {
  AwarizonProviderConfig,
  AwarizonInjectedExtension,
  AwarizonInboxContext,
  AwarizonIdentity,
  AwarizonExtensions,
  InjectedAccount,
  InjectedSigner as InjectedWeb3Signer,
  InjectedExtension,
  InjectedWeb3,
} from './injection/types'

// Types missing from module-specific exports until now
export type { Balance } from './modules/wallet'
export type {
  InboxItem,
  InboxRecordStatus,
  ClaimResult,
} from './modules/inbox'
export type { DeveloperStatus, WalletIndexParams } from './modules/developer'
export type {
  Campaign,
  CampaignStats,
  CampaignTargeting,
  TargetingOptions,
  CampaignParams,
} from './modules/campaigns'
export type {
  AssetBalance,
  AssetMetadata,
} from './modules/assets'
export type {
  ValidatorInfo,
  ValidatorPerformance,
  DelegationInfo,
  EpochRewardRecord,
} from './modules/validators'
export type { NetworkStats } from './modules/network'
export type { AppManifest } from './modules/apps'

// Re-export types from @awarizon/sdk
// so consumers only need one import
export type * from '@awarizon/sdk'
