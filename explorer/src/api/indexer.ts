const INDEXER = 'https://index.awarizon.com'
const INDEXER_WS = 'wss://index.awarizon.com/ws'

export interface IndexerBlock {
  blockNumber: number
  blockHash: string
  extrinsicCount: number
  eventCount: number
  timestamp: number | null
}

export interface IndexerTransaction {
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

// A transfer with no viewer address, so no sent/received direction —
// used for the chain-wide recent-activity feed.
export interface RecentTransfer {
  blockNumber: number
  blockHash: string
  extrinsicHash: string | null
  from: string
  to: string
  amount: string
  timestamp: number | null
}

export interface IndexerStats {
  lastIndexedBlock: number
  lastUpdated: string
  totalBlocks: number
  totalTransfers: number
  totalExtrinsics: number
}

export interface TransactionPage {
  address: string
  transactions: IndexerTransaction[]
  total: number
  limit: number
  offset: number
}

// Fetch with timeout — indexer may be briefly offline
async function fetchIndexer<T>(path: string, timeout = 8000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(`${INDEXER}${path}`, { signal: controller.signal })
    if (!res.ok) throw new Error(`Indexer ${res.status}: ${path}`)
    return res.json()
  } finally {
    clearTimeout(timer)
  }
}

export async function getIndexerStats(): Promise<IndexerStats> {
  return fetchIndexer('/stats')
}

// The server's /blocks handler only accepts `limit` (clamped to 100) — it has
// no `offset` param, so pagination has to be emulated by callers requesting
// a longer tail and slicing client-side (see useIndexerBlocksPage).
export async function getIndexerBlocks(limit = 20): Promise<IndexerBlock[]> {
  const data = await fetchIndexer<{ blocks: IndexerBlock[] }>(`/blocks?limit=${limit}`)
  return data.blocks
}

export async function getIndexerBlock(blockNumber: number): Promise<IndexerBlock | null> {
  try {
    return await fetchIndexer(`/blocks/${blockNumber}`)
  } catch {
    return null
  }
}

export async function getIndexerTransactions(
  address: string,
  limit = 20,
  offset = 0
): Promise<TransactionPage> {
  return fetchIndexer(
    `/transactions?address=${encodeURIComponent(address)}&limit=${limit}&offset=${offset}`
  )
}

// Global recent-transfers feed (no address filter) — persistent, chain-wide,
// unlike the old approach of deriving "recent activity" from an in-memory
// RPC block subscription, which went empty on refresh whenever transfers
// hadn't happened in the last few blocks the tab personally observed.
export async function getRecentTransfers(limit = 10): Promise<RecentTransfer[]> {
  const data = await fetchIndexer<{ transactions: RecentTransfer[] }>(
    `/transactions/recent?limit=${limit}`
  )
  return data.transactions
}

// ── pallet-assets (tokens) ──────────────────────────────────────────

export interface IndexerAsset {
  assetId: number
  creator: string | null
  owner: string
  name: string | null
  symbol: string | null
  decimals: number
  isFrozen: boolean
  totalSupply: string
  holderCount: number
  destroyed?: boolean
  createdBlock: number
  lastUpdatedBlock?: number
}

export interface AssetListPage {
  assets: IndexerAsset[]
  total: number
  limit: number
  offset: number
}

export interface AssetHolder {
  address: string
  balance: string
  lastUpdatedBlock: number
}

export interface AssetHolderPage {
  holders: AssetHolder[]
  total: number
  limit: number
  offset: number
}

export interface AssetTransfer {
  blockNumber: number
  extrinsicHash: string | null
  fromAddress: string | null
  toAddress: string | null
  amount: string
  timestamp: number | null
}

export interface AssetTransferPage {
  transfers: AssetTransfer[]
  limit: number
  offset: number
}

export async function getAssets(limit = 50, offset = 0): Promise<AssetListPage> {
  return fetchIndexer(`/assets?limit=${limit}&offset=${offset}`)
}

export async function getAsset(assetId: number): Promise<IndexerAsset | null> {
  try {
    return await fetchIndexer(`/assets/${assetId}`)
  } catch {
    return null
  }
}

export async function getAssetHolders(assetId: number, limit = 50, offset = 0): Promise<AssetHolderPage> {
  return fetchIndexer(`/assets/${assetId}/holders?limit=${limit}&offset=${offset}`)
}

export async function getAssetTransfers(assetId: number, limit = 20, offset = 0): Promise<AssetTransferPage> {
  return fetchIndexer(`/assets/${assetId}/transfers?limit=${limit}&offset=${offset}`)
}

// ── pallet-nfts (rizart.xyz marketplace) ────────────────────────────

export interface NftCollection {
  collectionId: number
  owner: string
  creator: string | null
  metadataUri: string | null
  name: string | null
  imageUrl: string | null
  description?: string | null
  totalItems: number
  listedItems: number
  totalVolume: string
  floorPrice: string | null
  maxSupply: number | null
  createdBlock: number
  lastUpdatedBlock?: number
}

export interface NftCollectionListPage {
  collections: NftCollection[]
  total: number
  limit: number
  offset: number
}

export interface NftRanking {
  rank: number
  collectionId: number
  name: string | null
  imageUrl: string | null
  totalVolume: string
  floorPrice: string | null
  totalItems: number
  uniqueOwners: number
}

export interface NftEvent {
  blockNumber: number
  extrinsicHash: string | null
  eventType: string
  collectionId: number
  itemId: number | null
  fromAddress: string | null
  toAddress: string | null
  price: string | null
  timestamp: number | null
}

export async function getNftCollections(limit = 50, offset = 0): Promise<NftCollectionListPage> {
  return fetchIndexer(`/nft/collections?limit=${limit}&offset=${offset}`)
}

export async function getNftRankings(limit = 10): Promise<{ rankings: NftRanking[] }> {
  return fetchIndexer(`/nft/rankings?limit=${limit}`)
}

export async function getNftEvents(limit = 30): Promise<{ events: NftEvent[] }> {
  return fetchIndexer(`/nft/events?limit=${limit}`)
}

export async function isIndexerOnline(): Promise<boolean> {
  try {
    const data = await fetchIndexer<{ status: string }>('/health', 4000)
    return data.status === 'ok'
  } catch {
    return false
  }
}

// Subscribe to live blocks via WebSocket. Returns a cleanup function.
//
// The indexer's WS protocol (indexer/src/api/websocket.rs) requires an
// explicit subscribe handshake — connecting alone gets you a "connected"
// message and nothing else. Once subscribed, block events arrive wrapped in
// an envelope: {"type":"event","channel":"blocks","data":{...IndexerBlock}}.
export function subscribeIndexerBlocks(onBlock: (block: IndexerBlock) => void): () => void {
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout>
  let pingTimer: ReturnType<typeof setInterval>
  let stopped = false

  function connect() {
    if (stopped) return
    ws = new WebSocket(INDEXER_WS)

    ws.onopen = () => {
      ws?.send(JSON.stringify({ type: 'subscribe', channel: 'blocks' }))

      // Some proxies drop idle WS connections — the server understands
      // {"type":"ping"} and replies with {"type":"pong"}, so keep it alive.
      pingTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 30_000)
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'event' && msg.channel === 'blocks' && msg.data) {
          onBlock(msg.data as IndexerBlock)
        }
        // "connected" / "subscribed" / "pong" / "error" messages need no action.
      } catch {}
    }

    ws.onclose = () => {
      clearInterval(pingTimer)
      if (!stopped) reconnectTimer = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws?.close()
    }
  }

  connect()

  return () => {
    stopped = true
    clearInterval(pingTimer)
    clearTimeout(reconnectTimer)
    ws?.close()
    ws = null
  }
}
