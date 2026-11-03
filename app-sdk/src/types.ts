// Campaign context passed from the Awarizon wallet to the app,
// via WebView bridge, URL parameters, or a manual override.
export interface AwarizonContext {
  /// User's wallet address (SS58)
  address: string
  /// Campaign that delivered this app
  campaignId: string
  /// Unique record ID for this delivery
  /// Used to submit engagement + claim reward
  recordId: string
  /// Chain RPC endpoint
  rpc: string
  /// User's .riz name if registered
  rizName?: string
}

export interface AwarizonUser {
  /// Wallet address
  address: string
  /// .riz identity name if registered
  rizName: string | null
  /// Campaign that sent this user
  campaignId: string
  /// Record ID for engagement tracking
  recordId: string
}

export interface EngagementOptions {
  /// How many seconds user spent in session
  /// Default: tracked automatically
  /// Minimum: 120 (enforced by chain)
  sessionSeconds?: number

  /// How many interactions user performed
  /// Default: tracked automatically
  /// Minimum: 5 (enforced by chain)
  interactions?: number
}

export interface AutoRewardOptions {
  /// Trigger reward after this many seconds
  /// Default: 120 (chain minimum)
  afterSeconds?: number

  /// Require this many interactions first
  /// Default: 5 (chain minimum)
  afterInteractions?: number

  /// Called when reward is about to be claimed
  onBeforeClaim?: () => void | Promise<void>
}

export type AwarizonEvent = string

export interface RewardResult {
  /// Whether reward was claimed successfully
  success: boolean
  /// Amount earned, already formatted by the chain SDK (e.g. "1.5000 RIZ")
  amountFormatted?: string
  /// Extrinsic hash of the claim transaction
  txHash?: string
  /// Error message if failed
  error?: string
}

// Awarizon app categories. Matches AppCategory enum in the pallet.
export type AppCategory =
  | 'DeFi'
  | 'Gaming'
  | 'Social'
  | 'Productivity'
  | 'Infrastructure'
  | 'DigitalAssets'
  | 'DeveloperTools'
  | 'Education'

// Map category name to on-chain code.
export const CATEGORY_CODES: Record<AppCategory, number> = {
  DeFi:           0,
  Gaming:         1,
  Social:         2,
  Productivity:   3,
  Infrastructure: 4,
  DigitalAssets:  5,
  DeveloperTools: 6,
  Education:      7,
}

export interface AwarizonAppConfig {
  /// Chain RPC endpoint
  /// Default: wss://rpc.awarizon.com
  rpc?: string

  /// Show toast notifications automatically
  /// Default: true
  showToasts?: boolean

  /// URL parameter prefix
  /// Default: 'riz'
  /// e.g. ?riz_address=... ?riz_campaign=...
  paramPrefix?: string

  /// Override context manually (for testing)
  context?: Partial<AwarizonContext>

  /// App category — used to update the user's category history after
  /// reward claim. Set this to match your campaign category, e.g. 'DeFi'.
  category?: AppCategory

  /// Callback when user is detected
  onUserDetected?: (user: AwarizonUser) => void

  /// Callback when reward is claimed
  onRewardClaimed?: (result: RewardResult) => void

  /// Callback when error occurs
  onError?: (error: Error) => void

  /// Callback when the wallet targeting profile is updated
  onProfileUpdated?: () => void
}

// Window bridge, injected by the wallet's WebView host.
export interface AwarizonBridge {
  address: string
  campaignId: string
  recordId: string
  rpc: string
  rizName?: string
  /// Sign a raw message with the user's wallet
  sign?: (message: string) => Promise<string>
}

declare global {
  interface Window {
    AwarizonBridge?: AwarizonBridge
  }
}
