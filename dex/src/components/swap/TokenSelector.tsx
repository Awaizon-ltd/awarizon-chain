import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDexStore } from '../../store/dexStore'
import { useAssetRegistry, type AssetInfo } from '../../store/assetRegistryStore'
import { Asset } from 'awarizon.js'
import Badge from '../ui/Badge'

interface Props {
  side: 'in' | 'out'
  onClose: () => void
  // Overrides the default behavior of writing the pick into dexStore's
  // tokenIn/tokenOut — used by pages (like AddLiquidity) that hold their
  // own local asset state instead of the swap store.
  onSelect?: (asset: Asset) => void
}

export default function TokenSelector({
  side, onClose, onSelect
}: Props) {
  const { setTokenIn, setTokenOut,
          tokenIn, tokenOut } = useDexStore()
  const { list, loading, load } = useAssetRegistry()
  const [search, setSearch] = useState('')

  // Every asset on chain, not just ones with an active pool — picking
  // a token with no pool yet is exactly how you create its first one
  // from Add Liquidity.
  useEffect(() => {
    load()
  }, [load])

  const filtered = list.filter(t =>
    t.symbol.toLowerCase()
      .includes(search.toLowerCase()) ||
    t.name.toLowerCase()
      .includes(search.toLowerCase())
  )

  const handleSelect = (info: AssetInfo) => {
    const asset = info.asset
    if (onSelect) {
      onSelect(asset)
    } else if (side === 'in') {
      setTokenIn(asset)
      // Swap if same as tokenOut
      if (Asset.eq(asset, tokenOut)) {
        setTokenOut(tokenIn)
      }
    } else {
      setTokenOut(asset)
      if (Asset.eq(asset, tokenIn)) {
        setTokenIn(tokenOut)
      }
    }
    onClose()
  }

  // Portaled to <body> — rendered inline, this modal could end up
  // nested under a page-specific wrapper (e.g. CreatePool.tsx's card)
  // whose stacking/overflow context clips or misplaces a `fixed`
  // descendant instead of covering the real viewport. Portaling
  // sidesteps whatever the ancestor does, same fix as the developer
  // portal's ConnectModal.
  return createPortal((
    <div
      className="fixed inset-0 z-50
        flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0
        bg-black/60 backdrop-blur-sm" />

      <div
        className="relative glass rounded-2xl
          w-full max-w-sm p-4 z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center
          justify-between mb-4">
          <h2 className="font-bold">Select Token</h2>
          <button
            onClick={onClose}
            className="text-[#9999BB] hover:text-white
              text-xl"
          >
            ×
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tokens..."
          autoFocus
          className="w-full bg-dex-surface2
            border border-dex-border rounded-xl
            px-4 py-3 text-sm text-white
            placeholder-[#555577]
            focus:outline-none focus:border-purple-500
            mb-3"
        />

        <div className="space-y-1 max-h-72
          overflow-y-auto">
          {filtered.map(info => (
            <button
              key={info.key}
              onClick={() => handleSelect(info)}
              className="w-full flex items-center gap-3
                px-3 py-3 rounded-xl text-left
                hover:bg-dex-surface2 transition-all"
            >
              <Badge asset={info.asset} size="md" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">
                  {info.symbol}
                </p>
                <p className="text-[#9999BB] text-xs truncate">
                  {info.name}
                </p>
              </div>
            </button>
          ))}
          {loading && filtered.length === 0 && (
            <p className="text-[#555577] text-sm
              text-center py-8">
              Loading tokens...
            </p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-[#555577] text-sm
              text-center py-8">
              No tokens found
            </p>
          )}
        </div>
      </div>
    </div>
  ), document.body)
}
