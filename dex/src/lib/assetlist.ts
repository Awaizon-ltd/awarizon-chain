import { ASSETLIST_URL } from '../constants'

// Matches the shape served by the developer portal's
// /api/assetlist.json (developer/src/app/api/assetlist.json/route.ts)
// — Solana token-list convention. `address` is the stringified
// pallet_assets id, since this chain has no ERC20/precompile contract
// address for assets.
export interface AssetListToken {
  chainId: number
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI: string
  tags: string[]
  extensions: { website?: string; description?: string }
}

export async function fetchAssetList(): Promise<AssetListToken[]> {
  try {
    const res = await fetch(ASSETLIST_URL)
    if (!res.ok) return []
    const data = await res.json()
    return (data.tokens ?? []) as AssetListToken[]
  } catch {
    return []
  }
}
