import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useWalletStore } from '../store/walletStore'
import { useAssetRegistry } from '../store/assetRegistryStore'
import { assetToParam } from '../lib/assetParam'
import type { DexPool, DexTwap } from 'awarizon.js'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'

const PLANCK = 1_000_000_000_000n

function fmt(planck: string): string {
  const n = BigInt(planck)
  if (n === 0n) return '0'
  const whole = n / PLANCK
  const frac = (n % PLANCK).toString()
    .padStart(12, '0').slice(0, 4)
    .replace(/0+$/, '')
  return frac
    ? `${whole.toLocaleString()}.${frac}`
    : whole.toLocaleString()
}

export default function PoolDetail() {
  const { provider } = useWalletStore()
  const { get: getAssetInfo, load: loadAssetRegistry } =
    useAssetRegistry()
  const navigate = useNavigate()
  // Pools.tsx passes the pool via router state — cheaper than
  // re-fetching, and pool list order isn't a stable id across reloads.
  const pool = (useLocation().state as { pool?: DexPool } | null)?.pool
  const [twap, setTwap] = useState<DexTwap | null>(null)

  useEffect(() => {
    loadAssetRegistry()
  }, [loadAssetRegistry])

  useEffect(() => {
    if (!provider || !pool) return
    provider.dex.getTwap(pool.assetA, pool.assetB)
      .then(setTwap)
      .catch(() => setTwap(null))
  }, [provider, pool])

  const assetLabel = (asset: DexPool['assetA']) =>
    getAssetInfo(asset).symbol

  // Direct navigation / refresh loses router state — bounce back to
  // the list rather than rendering a blank page.
  if (!pool) {
    return (
      <div className="min-h-screen pt-24 pb-12
        bg-purple-glow flex items-center
        justify-center">
        <div className="glass rounded-2xl p-8
          text-center">
          <p className="text-[#9999BB] mb-4">
            Pool details aren't available directly —
            open a pool from the list instead.
          </p>
          <Link to="/pools">
            <Button>Back to Pools</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-12
      bg-purple-glow">
      <div className="max-w-2xl mx-auto px-4">

        <button
          onClick={() => navigate('/pools')}
          className="text-[#9999BB] hover:text-white
            text-sm mb-6"
        >
          ← Back to Pools
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex -space-x-2">
            <Badge asset={pool.assetA} size="lg" />
            <Badge asset={pool.assetB} size="lg" />
          </div>
          <div>
            <h1 className="text-xl font-black">
              {assetLabel(pool.assetA)} / {assetLabel(pool.assetB)}
            </h1>
            {pool.isRizPair && (
              <span className="text-xs text-purple-400">
                RIZ Pair
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="glass rounded-2xl p-6
          grid grid-cols-2 gap-6 mb-6">
          <Stat label="Reserve A" value={fmt(pool.reserveA)} />
          <Stat label="Reserve B" value={fmt(pool.reserveB)} />
          <Stat label="LP Total Supply" value={fmt(pool.lpTotalSupply)} />
          <Stat label="Fee" value={`${pool.feeBps / 100}%`} />
          <Stat label="Total Volume" value={fmt(pool.totalVolume)} />
          <Stat label="Total Burned" value={fmt(pool.totalBurned)} />
        </div>

        {twap && (
          <div className="glass rounded-2xl p-6 mb-6">
            <p className="text-sm font-semibold mb-3">
              TWAP Spot Price
            </p>
            <div className="grid grid-cols-2 gap-6">
              <Stat
                label={`${assetLabel(pool.assetA)} per ${assetLabel(pool.assetB)}`}
                value={fmt(twap.spotPriceAPerB)}
              />
              <Stat
                label={`${assetLabel(pool.assetB)} per ${assetLabel(pool.assetA)}`}
                value={fmt(twap.spotPriceBPerA)}
              />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Link
            to={`/pools/add/${assetToParam(pool.assetA)}/${assetToParam(pool.assetB)}`}
            state={{ pool }}
            className="flex-1"
          >
            <Button fullWidth>Add Liquidity</Button>
          </Link>
          <Link to="/swap" className="flex-1">
            <Button fullWidth variant="secondary">Swap</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[#9999BB] text-xs mb-1">{label}</p>
      <p className="font-mono text-sm text-purple-400">{value}</p>
    </div>
  )
}
