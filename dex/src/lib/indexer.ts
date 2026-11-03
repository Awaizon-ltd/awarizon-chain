import { Asset, type DexPool } from 'awarizon.js'
import { INDEXER_ENDPOINT } from '../constants'

// Some numeric fields come back from the indexer in scientific
// notation (e.g. "5e+16" instead of "50000000000000000") — likely a
// BigDecimal-to-string quirk on the Rust side for round numbers.
// `BigInt("5e+16")` throws outright, and routing it through
// `Number()` first would silently lose precision past
// Number.MAX_SAFE_INTEGER (~9e15), which every planck amount here
// exceeds. This reconstructs the exact integer via string
// manipulation instead, so callers can always just `BigInt(...)`
// the result safely regardless of which format the API used.
export function normalizeNumericString(s: string): string {
  if (!/e/i.test(s)) return s
  const [mantissa, expPart] = s.split(/e/i)
  const exp = Number(expPart)
  const negative = mantissa.startsWith('-')
  const [whole, frac = ''] = mantissa.replace('-', '').split('.')
  const digits = whole + frac
  const pointShift = exp - frac.length
  const value = pointShift >= 0
    ? digits + '0'.repeat(pointShift)
    : digits.slice(0, digits.length + pointShift) || '0'
  return negative ? `-${value}` : value
}

// GET /assets — indexer/src/api/rest.rs, backed by the `assets` table,
// kept in sync via route_assets (Created, MetadataSet, Issued,
// Transferred, Burned, OwnerChanged, etc). Same shape used by the
// developer portal's lib/indexer.ts.
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
  destroyed: boolean
  createdBlock: number
  lastUpdatedBlock: number
}

const PAGE_SIZE = 100
const MAX_PAGES = 20 // safety cap — ~2000 assets scanned at most

// Every non-destroyed asset on chain — used to populate the token
// selector so any created asset can be picked for a swap or a brand
// new pool, not just ones that already have a pool (the old
// pool-derived list made that a chicken-and-egg problem).
export async function listAllAssets(): Promise<IndexerAsset[]> {
  const all: IndexerAsset[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE
    const res = await fetch(
      `${INDEXER_ENDPOINT}/assets?limit=${PAGE_SIZE}&offset=${offset}`
    )
    if (!res.ok) break
    const data = await res.json()
    const batch = (data.assets ?? []) as IndexerAsset[]
    all.push(...batch
      .filter(a => !a.destroyed)
      .map(a => ({ ...a, totalSupply: normalizeNumericString(a.totalSupply) }))
    )
    if (batch.length < PAGE_SIZE) break
  }
  return all
}

// GET /dex/pools — indexer/src/api/rest.rs, backed by the `dex_pools`
// table, kept in sync via route_dex (PoolCreated, LiquidityAdded/
// Removed, Swapped, ...) in indexer/src/indexer/routing.rs. Doesn't
// need a live chain connection at all, unlike provider.dex.getAllPools()
// (a custom RPC method that requires the DEX pallet's RPC extension to
// be registered on the node it's talking to).
interface IndexerDexPool {
  assetA: string // 'native' or 'token:<id>' — see rest.rs's own
  assetB: string // route comment: "/dex/pools/native/token:1"
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

function parseIndexerAsset(s: string): Asset {
  if (s === 'native') return Asset.native()
  const m = s.match(/^token:(\d+)$/)
  if (m) return Asset.token(Number(m[1]))
  throw new Error(`Unrecognized indexer asset format: "${s}"`)
}

// The indexer doesn't track a per-pool fee tier or an isRizPair flag
// (the frontend derives that itself elsewhere), so those two fields
// on DexPool are filled with a fixed default here — informational
// display only, not used for any on-chain math.
const DEFAULT_FEE_BPS = 25 // 0.25%, matches Swap.tsx's footer copy

function poolFromIndexer(p: IndexerDexPool): DexPool {
  const assetA = parseIndexerAsset(p.assetA)
  const assetB = parseIndexerAsset(p.assetB)
  return {
    assetA,
    assetB,
    reserveA: normalizeNumericString(p.reserveA),
    reserveB: normalizeNumericString(p.reserveB),
    lpTotalSupply: normalizeNumericString(p.lpTotalSupply),
    lpAssetId: p.lpAssetId,
    totalVolume: normalizeNumericString(p.totalVolume),
    totalFees: normalizeNumericString(p.totalFees),
    totalBurned: normalizeNumericString(p.totalBurned),
    feeBps: DEFAULT_FEE_BPS,
    isRizPair: assetA.type === 'native' || assetB.type === 'native',
    createdAt: p.createdBlock,
    lastUpdatedBlock: p.lastUpdatedBlock,
  }
}

export async function listDexPools(): Promise<DexPool[]> {
  try {
    const res = await fetch(`${INDEXER_ENDPOINT}/dex/pools`)
    if (!res.ok) return []
    const data = await res.json()
    const pools = (data.pools ?? []) as IndexerDexPool[]
    return pools.map(poolFromIndexer)
  } catch {
    return []
  }
}

// GET /dex/stats — totalProtocolBurned is RIZ-denominated planck as a
// string, same as what provider.dex.getTotalBurned() used to read
// on-chain.
export async function getDexTotalBurned(): Promise<bigint> {
  try {
    const res = await fetch(`${INDEXER_ENDPOINT}/dex/stats`)
    if (!res.ok) return 0n
    const data = await res.json()
    return BigInt(normalizeNumericString(data.totalProtocolBurned ?? '0'))
  } catch {
    return 0n
  }
}
