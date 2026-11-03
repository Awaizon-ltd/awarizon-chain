import { INDEXER_ENDPOINT } from '../constants'

// Some numeric fields come back from the indexer in scientific
// notation (e.g. "5e+16" instead of "50000000000000000") — likely a
// BigDecimal-to-string quirk on the Rust side for round numbers.
// `BigInt("5e+16")` throws outright, and routing it through
// `Number()` first would silently lose precision past
// Number.MAX_SAFE_INTEGER (~9e15), which token supplies routinely
// exceed at 12 decimals. This reconstructs the exact integer via
// string manipulation instead, so formatUnits() can always just
// `BigInt(...)` the result safely.
function normalizeNumericString(s: string): string {
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

// GET /assets — indexer/src/api/rest.rs, backed by the `assets` table
// (indexer/migrations/005_add_asset_tables.sql), kept in sync via
// route_assets in indexer/src/indexer/routing.rs (Created,
// MetadataSet, Issued, Transferred, Burned, OwnerChanged, etc.).
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

// No server-side owner filter exists yet, so this pages through
// /assets and filters client-side. Fine at this chain's current
// asset count; would need a real query param on the indexer side to
// stay cheap at scale.
export async function listAssetsByOwner(
  owner: string
): Promise<IndexerAsset[]> {
  const mine: IndexerAsset[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE
    const res = await fetch(
      `${INDEXER_ENDPOINT}/assets?limit=${PAGE_SIZE}&offset=${offset}`
    )
    if (!res.ok) break
    const data = await res.json()
    const batch = (data.assets ?? []) as IndexerAsset[]
    mine.push(...batch
      .filter(a => a.owner === owner && !a.destroyed)
      .map(a => ({ ...a, totalSupply: normalizeNumericString(a.totalSupply) }))
    )
    if (batch.length < PAGE_SIZE) break
  }
  return mine
}
