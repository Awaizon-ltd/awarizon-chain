import { Signer, isAwarizonAvailable, signerFromAwarizonWallet } from 'awarizon.js'
import { detectContext, buildDeepLink, detectRegionCode } from './context'
import { EngagementTracker } from './tracker'
import { showRewardToast, showToast } from './toast'
import type {
  AwarizonAppConfig,
  AwarizonContext,
  AwarizonUser,
  EngagementOptions,
  AutoRewardOptions,
  RewardResult,
  AwarizonEvent,
  AppCategory,
} from './types'
import { CATEGORY_CODES } from './types'

const MIN_SESSION_SECONDS = 120
const MIN_INTERACTIONS = 5

export class AwarizonApp {
  private config: AwarizonAppConfig
  private context: AwarizonContext | null = null
  private signer: Signer | null = null
  private tracker: EngagementTracker
  private initialized = false
  private rewardClaimed = false
  private autoRewardInterval?: ReturnType<typeof setInterval>
  private eventCounts: Map<string, number> = new Map()
  private eventRewardRules: Map<string, { count: number }> = new Map()

  constructor(config: AwarizonAppConfig = {}) {
    this.config = config
    this.tracker = new EngagementTracker()
  }

  // ── INIT ──────────────────────────────────

  // Detects campaign context and connects the wallet.
  // Call this once when your app loads.
  async init(): Promise<AwarizonUser | null> {
    if (this.initialized) return this.getUser()
    this.initialized = true

    this.context = await detectContext(this.config)

    if (!this.context) {
      // User did not come from Awarizon inbox —
      // app works normally, no reward available.
      return null
    }

    try {
      await this.connectSigner()
    } catch (err) {
      this.config.onError?.(err as Error)
      return null
    }

    const user = this.getUser()!
    this.config.onUserDetected?.(user)

    return user
  }

  // Returns null if not from inbox.
  getUser(): AwarizonUser | null {
    if (!this.context) return null
    return {
      address: this.context.address,
      rizName: this.context.rizName ?? null,
      campaignId: this.context.campaignId,
      recordId: this.context.recordId,
    }
  }

  isFromInbox(): boolean {
    return this.context !== null
  }

  // ── ENGAGEMENT ────────────────────────────

  // Manually trigger engagement + reward claim. Call this when the
  // user has genuinely engaged — e.g. after reading an article,
  // completing a level, making a swap, finishing a workout.
  //
  // `options` is accepted for API symmetry with EngagementOptions,
  // but awarizon.js's inbox.engage() always submits the chain's own
  // minimum thresholds itself — there's nothing here for the caller
  // to override on-chain.
  async triggerReward(
    _options: EngagementOptions = {}
  ): Promise<RewardResult> {
    if (!this.context || !this.signer) {
      return {
        success: false,
        error: 'Not from Awarizon inbox',
      }
    }

    if (this.rewardClaimed) {
      return {
        success: false,
        error: 'Reward already claimed',
      }
    }

    try {
      // Security guard — validate the record before submitting
      // engagement. Prevents wrong-address claims, fake record IDs,
      // and replay of an already-claimed record. `rewardEligible`
      // alone can't distinguish "never engaged" from "already
      // claimed" (both are false pre-Engaged and post-claim), so
      // this checks `status` directly instead.
      const records = await this.signer.inbox.list(this.context.address)
      const record = records.find(r => r.id === this.context!.recordId)

      if (!record) {
        return {
          success: false,
          error: 'Record not found for this wallet. This app may ' +
                 'not have been delivered to your inbox.',
        }
      }

      if (record.status === 'Engaged' && !record.rewardEligible) {
        return {
          success: false,
          error: 'Reward already claimed for this record.',
        }
      }

      if (record.status !== 'Delivered') {
        return {
          success: false,
          error: `Record is not ready to claim (status: ${record.status}).`,
        }
      }

      await this.signer.inbox.engage(this.context.recordId)
      const result = await this.signer.inbox.claim(this.context.recordId)

      this.rewardClaimed = true

      // Auto-update wallet targeting profile in the background.
      // Non-blocking — does not affect the reward result.
      this.updateWalletProfile().catch(() => {})

      if (this.config.showToasts !== false) {
        showRewardToast(result.reward)
      }

      const rewardResult: RewardResult = {
        success: true,
        amountFormatted: result.reward,
        txHash: result.hash,
      }

      this.config.onRewardClaimed?.(rewardResult)

      return rewardResult
    } catch (err: any) {
      const error = err?.message ?? 'Claim failed'
      this.config.onError?.(err)
      return { success: false, error }
    }
  }

  // ── AUTO REWARD ───────────────────────────

  // Automatically claims the reward once time + interaction
  // thresholds are met. Checks every 10 seconds.
  autoRewardAfter(options: AutoRewardOptions = {}): void {
    if (!this.context) return

    const minSeconds = options.afterSeconds ?? MIN_SESSION_SECONDS
    const minInteractions = options.afterInteractions ?? MIN_INTERACTIONS

    this.autoRewardInterval = setInterval(async () => {
      if (this.rewardClaimed) {
        clearInterval(this.autoRewardInterval)
        return
      }

      const seconds = this.tracker.getSessionSeconds()
      const interactions = this.tracker.getInteractions()

      if (seconds >= minSeconds && interactions >= minInteractions) {
        clearInterval(this.autoRewardInterval)
        await options.onBeforeClaim?.()
        await this.triggerReward({ sessionSeconds: seconds, interactions })
      }
    }, 10_000)
  }

  // ── EVENT TRACKING ────────────────────────

  // Track a named event, e.g. app.trackEvent('level_complete').
  trackEvent(event: AwarizonEvent): void {
    const newCount = (this.eventCounts.get(event) ?? 0) + 1
    this.eventCounts.set(event, newCount)

    const rule = this.eventRewardRules.get(event)
    if (rule && newCount >= rule.count && !this.rewardClaimed) {
      this.eventRewardRules.delete(event)
      this.triggerReward().catch(err => this.config.onError?.(err))
    }

    this.tracker.addInteraction()
  }

  // Trigger reward after a specific event fires N times.
  //
  // Example:
  //   app.rewardAfterEvents('level_complete', 1)
  //   → reward after completing 1 level
  rewardAfterEvents(event: AwarizonEvent, count: number): void {
    this.eventRewardRules.set(event, { count })
  }

  // ── SESSION TRACKING ──────────────────────

  getSessionTime(): number {
    return this.tracker.getSessionSeconds()
  }

  getInteractionCount(): number {
    return this.tracker.getInteractions()
  }

  isEngagementEligible(): boolean {
    return this.tracker.isEligible(MIN_SESSION_SECONDS, MIN_INTERACTIONS)
  }

  // ── UI HELPERS ────────────────────────────

  showMessage(message: string): void {
    showToast(message)
  }

  showReward(amount: string): void {
    showRewardToast(amount)
  }

  // Show a hint that the app should be opened from the Awarizon
  // inbox to earn rewards.
  showInboxHint(): void {
    if (!this.context) {
      showToast('💛 Open from Awarizon to earn RIZ')
    }
  }

  // ── DEEP LINK ─────────────────────────────

  // Generate a deep link URL for your app. Include this in your
  // campaign manifest as the app_url field.
  generateDeepLink(baseUrl: string): string {
    if (!this.context) return baseUrl
    return buildDeepLink(baseUrl, this.context)
  }

  // ── WALLET PROFILE ────────────────────────

  // Manually update the wallet targeting profile. Called automatically
  // after triggerReward() succeeds, but can also be called directly.
  //
  // Example:
  //   await app.updateProfile()
  //   // or with override:
  //   await app.updateProfile({ category: 'Gaming' })
  async updateProfile(override?: { category?: AppCategory }): Promise<void> {
    if (!this.signer || !this.context) return

    const savedCategory = this.config.category
    if (override?.category) {
      this.config.category = override.category
    }

    await this.updateWalletProfile()

    if (override?.category) {
      this.config.category = savedCategory
    }
  }

  // ── WALLET ACTIONS ────────────────────────

  // Open the Awarizon wallet app via deep link on mobile.
  openWallet(): void {
    if (typeof window === 'undefined') return
    window.location.href = 'awarizon://inbox'
    setTimeout(() => {
      window.open('https://awarizon.com', '_blank')
    }, 1000)
  }

  // ── CLEANUP ───────────────────────────────

  // Clean up timers and event listeners. Call when your app unmounts.
  destroy(): void {
    clearInterval(this.autoRewardInterval)
    this.tracker.destroy()
    this.signer?.disconnect()
  }

  // ── PRIVATE ───────────────────────────────

  private async connectSigner(): Promise<void> {
    if (!this.context) return

    // Prefer the Awarizon wallet's own injection — same signing
    // capability as the bridge below, but discoverable by any dApp,
    // not just apps opened from this app-sdk's WebView.
    if (isAwarizonAvailable()) {
      this.signer = await signerFromAwarizonWallet(
        this.context.rpc,
        'AwarizonApp',
      )
      return
    }

    // Use the injected signer from the WebView bridge — the wallet
    // handles signing natively.
    if (typeof window !== 'undefined' && window.AwarizonBridge?.sign) {
      const injectedSigner = {
        signRaw: async ({ data }: any) => {
          const signature = await window.AwarizonBridge!.sign!(data)
          return { id: 1, signature }
        },
      }

      this.signer = await Signer.fromInjected(
        this.context.rpc,
        this.context.address,
        injectedSigner as any,
      )
      return
    }

    // No bridge signer available — this happens when context comes
    // from URL only (no wallet extension present). Engagement
    // tracking stays active but reward claim requires a wallet.
    console.warn(
      '[AwarizonApp] No signer available. ' +
      'Engagement tracking active but reward claim requires wallet.'
    )
  }

  // Update the wallet's on-chain targeting profile: category history,
  // activity count, region, and wallet age. Called automatically after
  // triggerReward() succeeds — failures here must not affect the reward
  // claim result, so errors are swallowed and only logged.
  private async updateWalletProfile(): Promise<void> {
    if (!this.signer || !this.context) return

    try {
      const category = this.config.category
      const categoryCode = category
        ? (CATEGORY_CODES[category] ?? 0)
        : null

      // Get current wallet stats from chain.
      const api = this.signer.getApi()
      const accountInfo = await (api.query as any).system.account(
        this.context.address
      )
      const nonce = accountInfo.nonce.toNumber()

      // Estimate wallet age from chain block.
      const currentBlock = await (api.query as any).system.number()
      const BLOCKS_PER_DAY = 28800 // 3s blocks
      const walletAgeDays = Math.max(
        1,
        Math.floor(currentBlock.toNumber() / BLOCKS_PER_DAY)
      )

      const activityCount = Math.max(1, nonce + 1)
      const regionCode = detectRegionCode()

      // Only include this app's category if one was configured.
      const categoryHistory = categoryCode !== null ? [categoryCode] : []

      await this.signer.developer.updateWalletIndex({
        walletAgeDays,
        activityCount,
        categoryHistory,
        regionCode,
      })

      this.config.onProfileUpdated?.()
    } catch (err) {
      console.warn(
        '[AwarizonApp] Profile update failed:',
        (err as Error).message
      )
    }
  }
}
