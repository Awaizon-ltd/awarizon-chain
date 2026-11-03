import { create } from 'zustand'
import { Asset } from 'awarizon.js'
import { listAllAssets } from '../lib/indexer'
import { fetchAssetList } from '../lib/assetlist'

export interface AssetInfo {
  key: string // 'native' or `token-${id}`
  asset: Asset
  name: string
  symbol: string
  decimals: number
  logoURI: string | null
}

const NATIVE_INFO: AssetInfo = {
  key: 'native',
  asset: Asset.native(),
  name: 'Awarizon RIZ',
  symbol: 'RIZ',
  decimals: 12,
  logoURI: '/awarizon-logo.png',
}

function unknownTokenInfo(id: number): AssetInfo {
  return {
    key: `token-${id}`,
    asset: Asset.token(id),
    name: `Asset #${id}`,
    symbol: `#${id}`,
    decimals: 12,
    logoURI: null,
  }
}

interface AssetRegistryState {
  loaded: boolean
  loading: boolean
  list: AssetInfo[]
  byId: Record<number, AssetInfo>
  load: () => Promise<void>
  get: (asset: Asset) => AssetInfo
}

// Names/symbols/decimals come from the indexer (assets table, kept in
// sync with on-chain Created/MetadataSet/... events) — logos come
// from the developer portal's assetlist.json, since pallet_assets has
// nowhere on-chain to store one. Neither source needs a wallet
// connection, so this loads independent of chain/wallet state.
export const useAssetRegistry = create<AssetRegistryState>(
  (set, get) => ({
    loaded: false,
    loading: false,
    list: [NATIVE_INFO],
    byId: {},

    load: async () => {
      if (get().loading || get().loaded) return
      set({ loading: true })
      try {
        const [assets, listedTokens] = await Promise.all([
          listAllAssets(),
          fetchAssetList(),
        ])
        const logoMap = Object.fromEntries(
          listedTokens.map(t => [Number(t.address), t.logoURI])
        )
        const byId: Record<number, AssetInfo> = {}
        const list: AssetInfo[] = [NATIVE_INFO]
        for (const a of assets) {
          const info: AssetInfo = {
            key: `token-${a.assetId}`,
            asset: Asset.token(a.assetId),
            name: a.name || `Asset #${a.assetId}`,
            symbol: a.symbol || `#${a.assetId}`,
            decimals: a.decimals,
            logoURI: logoMap[a.assetId] ?? null,
          }
          byId[a.assetId] = info
          list.push(info)
        }
        set({ list, byId, loaded: true, loading: false })
      } catch {
        set({ loading: false })
      }
    },

    get: (asset) => {
      // Asset.isNative() isn't a type predicate, so it doesn't narrow
      // the union — checking .type directly does.
      if (asset.type === 'native') return NATIVE_INFO
      return get().byId[asset.id] ?? unknownTokenInfo(asset.id)
    },
  })
)
