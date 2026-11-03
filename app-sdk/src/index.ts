export { AwarizonApp } from './AwarizonApp'
export { detectContext, buildDeepLink, detectRegionCode } from './context'
export { EngagementTracker } from './tracker'
export { showToast, showRewardToast, showConnectToast } from './toast'
export { formatRiz } from './format'

export type {
  AwarizonAppConfig,
  AwarizonContext,
  AwarizonUser,
  EngagementOptions,
  AutoRewardOptions,
  RewardResult,
  AwarizonEvent,
  AwarizonBridge,
  AppCategory,
} from './types'
export { CATEGORY_CODES } from './types'

export const MIN_SESSION_SECONDS = 120
export const MIN_INTERACTIONS = 5
export const DEFAULT_RPC = 'wss://rpc.awarizon.com'
