export interface Transaction {
  blockNumber: number
  blockHash: string
  // Null for rows indexed before the extrinsic_hash column existed.
  extrinsicHash: string | null
  direction: 'sent' | 'received'
  from: string
  to: string
  amount: string
  timestamp: number | null
}

export interface TransactionPage {
  address: string
  transactions: Transaction[]
  total: number
  limit: number
  offset: number
}

// A transfer with no viewer address, so no sent/received direction — used
// for the chain-wide recent-activity feed.
export interface RecentTransfer {
  blockNumber: number
  blockHash: string
  extrinsicHash: string | null
  from: string
  to: string
  amount: string
  timestamp: number | null
}

export interface IndexerBlock {
  blockNumber: number
  blockHash: string
  extrinsicCount: number
  eventCount: number
  timestamp: number | null
}

export interface IndexerStats {
  lastIndexedBlock: number
  lastUpdated: string
  totalBlocks: number
  totalTransfers: number
  totalExtrinsics: number
}

// ── Campaign / inbox event feeds ──────────────────────────────────

export interface CampaignEvent {
  blockNumber: number
  extrinsicHash: string | null
  eventType: 'created' | 'terminated' | 'expired'
  campaignId: string
  developer: string | null
  timestamp: number | null
}

export interface CampaignEventPage {
  events: CampaignEvent[]
  total: number
  limit: number
  offset: number
}

// eventType is 'claimed', not 'reward_claimed' — matches the indexer's
// inbox_events.event_type value written on RewardClaimed.
export interface InboxEvent {
  blockNumber: number
  extrinsicHash: string | null
  eventType: 'delivered' | 'engaged' | 'claimed' | 'dismissed'
  wallet: string
  campaignId: string | null
  rewardPlanck: string | null
  timestamp: number | null
}

export interface InboxEventPage {
  events: InboxEvent[]
  total: number
  limit: number
  offset: number
}

export interface CampaignIndexerStats {
  developer: string
  totalCampaigns: number
  totalDeliveries: number
  totalEngagements: number
  engagementRate: number
}

export interface AppSearchResult {
  campaignId: string
  developer: string | null
  blockNumber: number
  deliveries: number
  engagements: number
  timestamp: number | null
}

export interface AppSearchPage {
  results: AppSearchResult[]
  query: string
  total: number
}

// ── DEX indexer types ─────────────────────────────────────────────

export interface IndexerDexPool {
  assetA: string
  assetB: string
  lpAssetId: number
  reserveA: string
  reserveB: string
  lpTotalSupply: string
  totalVolume: string
  totalFees: string
  totalBurned: string
  creator: string | null
  createdBlock: number
  lastUpdatedBlock: number
}

export interface IndexerDexSwap {
  blockNumber: number
  blockHash: string
  extrinsicHash: string | null
  trader: string
  assetIn: string
  assetOut: string
  amountIn: string
  amountOut: string
  fee: string | null
  protocolFee: string | null
  isMultiHop: boolean
  hopPath: string | null
  timestamp: number | null
}

export interface IndexerDexSwapPage {
  swaps: IndexerDexSwap[]
  limit: number
  offset: number
}

export interface IndexerDexPricePoint {
  blockNumber: number
  priceAPerB: string
  priceBPerA: string
  timestamp: number | null
}

export interface IndexerDexStats {
  totalPools: number
  totalSwaps: number
  totalVolumeRiz: string
  totalFeesCollected: string
  totalProtocolBurned: string
}

// ── WebSocket subscriptions ───────────────────────────────────────
// The indexer's /ws only recognizes "blocks" and "wallet:{addr}" /
// "developer:{addr}" channels — there is no "dex" channel server-side.

export type WsChannel = 'blocks' | `wallet:${string}` | `developer:${string}`

export interface WsEvent {
  type: 'event'
  channel: string
  data: any
}

export interface WsSubscription {
  unsubscribe: () => void
}

export class HistoryModule {
  constructor(
    private indexerEndpoint: string
  ) {}

  async transactions(
    address: string,
    options: {
      limit?: number
      offset?: number
    } = {}
  ): Promise<TransactionPage> {
    const limit = options.limit ?? 20
    const offset = options.offset ?? 0

    const url = new URL(`${this.indexerEndpoint}/transactions`)
    url.searchParams.set('address', address)
    url.searchParams.set('limit', limit.toString())
    url.searchParams.set('offset', offset.toString())

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error(`Indexer error: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }

  async transactionCount(address: string): Promise<number> {
    const page = await this.transactions(address, { limit: 1, offset: 0 })
    return page.total
  }

  /// Chain-wide recent transfers — no address filter. Persistent (backed by
  /// the indexer's database), unlike deriving "recent activity" from a live
  /// chain subscription, which only knows about transfers seen since
  /// connecting and goes empty whenever transfers are infrequent.
  async recent(limit = 20): Promise<RecentTransfer[]> {
    const url = new URL(`${this.indexerEndpoint}/transactions/recent`)
    url.searchParams.set('limit', limit.toString())

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error(`Indexer error: ${res.status} ${res.statusText}`)
    }
    const data = await res.json()
    return data.transactions
  }

  // The server's /blocks handler only accepts `limit` (clamped to 100) — it
  // has no `offset` param, so there is no true pagination through this
  // method; it always returns the most recent `limit` blocks.
  async blocks(limit = 20): Promise<IndexerBlock[]> {
    const url = new URL(`${this.indexerEndpoint}/blocks`)
    url.searchParams.set('limit', limit.toString())

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error(`Indexer error: ${res.status} ${res.statusText}`)
    }
    const data = await res.json()
    return data.blocks
  }

  async block(blockNumber: number): Promise<IndexerBlock | null> {
    const res = await fetch(`${this.indexerEndpoint}/blocks/${blockNumber}`)
    if (res.status === 404) return null
    if (!res.ok) {
      throw new Error(`Indexer error: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }

  async stats(): Promise<IndexerStats> {
    const res = await fetch(`${this.indexerEndpoint}/stats`)
    if (!res.ok) {
      throw new Error(`Indexer error: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }

  async isOnline(): Promise<boolean> {
    try {
      const res = await fetch(`${this.indexerEndpoint}/health`, {
        signal: AbortSignal.timeout(5000),
      })
      const data = await res.json()
      return data.status === 'ok'
    } catch {
      return false
    }
  }

  // ── Campaign endpoints ──────────────────────────────────────────

  async campaignEvents(options: {
    developer?: string
    eventType?: string
    limit?: number
    offset?: number
  } = {}): Promise<CampaignEventPage> {
    const limit = options.limit ?? 50
    const offset = options.offset ?? 0

    const url = new URL(`${this.indexerEndpoint}/campaign-events`)
    if (options.developer) url.searchParams.set('developer', options.developer)
    if (options.eventType) url.searchParams.set('event_type', options.eventType)
    url.searchParams.set('limit', limit.toString())
    url.searchParams.set('offset', offset.toString())

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error(`Indexer error: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }

  async campaignStats(developer: string): Promise<CampaignIndexerStats> {
    const url = new URL(`${this.indexerEndpoint}/campaign-stats`)
    url.searchParams.set('developer', developer)

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error(`Indexer error: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }

  // ── Inbox endpoints ─────────────────────────────────────────────

  async inboxEvents(options: {
    wallet?: string
    campaignId?: string
    eventType?: string
    limit?: number
    offset?: number
  } = {}): Promise<InboxEventPage> {
    const limit = options.limit ?? 20
    const offset = options.offset ?? 0

    const url = new URL(`${this.indexerEndpoint}/inbox-events`)
    if (options.wallet) url.searchParams.set('wallet', options.wallet)
    if (options.campaignId) url.searchParams.set('campaign_id', options.campaignId)
    if (options.eventType) url.searchParams.set('event_type', options.eventType)
    url.searchParams.set('limit', limit.toString())
    url.searchParams.set('offset', offset.toString())

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error(`Indexer error: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }

  // ── Search ──────────────────────────────────────────────────────

  async searchApps(query: string, options: {
    category?: string
    developer?: string
    limit?: number
  } = {}): Promise<AppSearchPage> {
    if (query.length < 2) {
      throw new Error('Query must be at least 2 characters')
    }
    const limit = options.limit ?? 20

    const url = new URL(`${this.indexerEndpoint}/search/apps`)
    url.searchParams.set('q', query)
    if (options.category) url.searchParams.set('category', options.category)
    if (options.developer) url.searchParams.set('developer', options.developer)
    url.searchParams.set('limit', limit.toString())

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error(`Indexer error: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }

  // ── DEX indexer endpoints ───────────────────────────────────────

  async dexPools(): Promise<IndexerDexPool[]> {
    const res = await fetch(`${this.indexerEndpoint}/dex/pools`)
    if (!res.ok) {
      throw new Error(`Indexer error: ${res.status} ${res.statusText}`)
    }
    const data = await res.json()
    return data.pools
  }

  async dexPool(assetA: string, assetB: string): Promise<IndexerDexPool | null> {
    const res = await fetch(`${this.indexerEndpoint}/dex/pools/${assetA}/${assetB}`)
    if (res.status === 404) return null
    if (!res.ok) {
      throw new Error(`Indexer error: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }

  async dexSwaps(options: {
    address?: string
    limit?: number
    offset?: number
  } = {}): Promise<IndexerDexSwapPage> {
    const limit = options.limit ?? 20
    const offset = options.offset ?? 0

    const url = new URL(`${this.indexerEndpoint}/dex/swaps`)
    if (options.address) url.searchParams.set('address', options.address)
    url.searchParams.set('limit', limit.toString())
    url.searchParams.set('offset', offset.toString())

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error(`Indexer error: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }

  async dexPriceHistory(assetA: string, assetB: string, limit = 100): Promise<IndexerDexPricePoint[]> {
    const url = new URL(`${this.indexerEndpoint}/dex/price/${assetA}/${assetB}`)
    url.searchParams.set('limit', limit.toString())

    const res = await fetch(url.toString())
    if (!res.ok) {
      throw new Error(`Indexer error: ${res.status} ${res.statusText}`)
    }
    const data = await res.json()
    return data.prices
  }

  async dexStats(): Promise<IndexerDexStats> {
    const res = await fetch(`${this.indexerEndpoint}/dex/stats`)
    if (!res.ok) {
      throw new Error(`Indexer error: ${res.status} ${res.statusText}`)
    }
    return res.json()
  }

  // ── WebSocket subscriptions ─────────────────────────────────────

  subscribe(
    channel: WsChannel,
    onEvent: (event: WsEvent) => void,
    onError?: (err: Event) => void,
  ): WsSubscription {
    const wsUrl = this.indexerEndpoint.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws'

    let alive = true
    let ws: WebSocket

    const connect = () => {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'subscribe', channel }))
      }

      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data as string)
          if (data.type === 'event') {
            onEvent(data as WsEvent)
          }
        } catch {}
      }

      ws.onerror = (err) => {
        onError?.(err)
      }

      ws.onclose = () => {
        if (alive) {
          setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return {
      unsubscribe: () => {
        alive = false
        ws?.close()
      },
    }
  }

  subscribeBlocks(onBlock: (block: any) => void): WsSubscription {
    return this.subscribe('blocks', (event) => {
      onBlock(event.data)
    })
  }

  subscribeInbox(wallet: string, onEvent: (event: WsEvent) => void): WsSubscription {
    return this.subscribe(`wallet:${wallet}`, onEvent)
  }

  subscribeCampaigns(developer: string, onEvent: (event: WsEvent) => void): WsSubscription {
    return this.subscribe(`developer:${developer}`, onEvent)
  }
}
