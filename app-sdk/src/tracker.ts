// Tracks session time and interaction count automatically,
// without any intervention from the developer.
export class EngagementTracker {
  private startTime: number
  private interactions = 0
  private visibilityHandler?: () => void
  private interactionHandler?: () => void
  private pauseTime?: number
  private totalPausedMs = 0

  constructor() {
    this.startTime = Date.now()
    this.setupVisibilityTracking()
    this.setupInteractionTracking()
  }

  // Pauses the timer when the app is backgrounded.
  private setupVisibilityTracking() {
    if (typeof document === 'undefined') return

    this.visibilityHandler = () => {
      if (document.hidden) {
        this.pauseTime = Date.now()
      } else if (this.pauseTime) {
        this.totalPausedMs += Date.now() - this.pauseTime
        this.pauseTime = undefined
      }
    }

    document.addEventListener(
      'visibilitychange',
      this.visibilityHandler
    )
  }

  // Counts clicks, taps, and key presses.
  private setupInteractionTracking() {
    if (typeof window === 'undefined') return

    this.interactionHandler = () => {
      this.interactions++
    }

    window.addEventListener('click', this.interactionHandler)
    window.addEventListener(
      'touchstart', this.interactionHandler, { passive: true }
    )
    window.addEventListener('keydown', this.interactionHandler)
  }

  // Active session time in seconds, excluding backgrounded time.
  getSessionSeconds(): number {
    const now = Date.now()
    const elapsed = now - this.startTime
    const active = elapsed - this.totalPausedMs
    return Math.floor(active / 1000)
  }

  getInteractions(): number {
    return this.interactions
  }

  // Manually add an interaction, e.g. for custom events.
  addInteraction(count = 1) {
    this.interactions += count
  }

  isEligible(
    minSeconds = 120,
    minInteractions = 5,
  ): boolean {
    return (
      this.getSessionSeconds() >= minSeconds &&
      this.getInteractions() >= minInteractions
    )
  }

  destroy() {
    if (this.visibilityHandler) {
      document.removeEventListener(
        'visibilitychange',
        this.visibilityHandler
      )
    }
    if (this.interactionHandler) {
      window.removeEventListener('click', this.interactionHandler)
      window.removeEventListener('touchstart', this.interactionHandler)
      window.removeEventListener('keydown', this.interactionHandler)
    }
  }
}
