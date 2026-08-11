import { Asset } from 'awarizon.js'

// URL-safe asset identifier — same 'native' / 'token:<id>' convention
// the indexer already uses (see lib/indexer.ts's parseIndexerAsset),
// reused here so Add Liquidity can rebuild its pool from the URL
// alone when router state isn't available (direct link, refresh).
export function assetToParam(asset: Asset): string {
  return asset.type === 'native' ? 'native' : `token:${asset.id}`
}

export function paramToAsset(param: string): Asset {
  if (param === 'native') return Asset.native()
  const m = param.match(/^token:(\d+)$/)
  if (m) return Asset.token(Number(m[1]))
  throw new Error(`Invalid asset param: "${param}"`)
}
