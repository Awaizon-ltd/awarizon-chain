import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { DexPool } from 'awarizon.js'
import { listDexPools, getDexTotalBurned } from '../lib/indexer'
import { useAssetRegistry } from '../store/assetRegistryStore'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'

const PLANCK = 1_000_000_000_000n

function fmt(planck: string | bigint): string {
  const n = typeof planck === 'string' ? BigInt(planck) : planck
  if (n === 0n) return '0'
  const whole = n / PLANCK
  const frac = (n % PLANCK).toString()
    .padStart(12, '0').slice(0, 4)
    .replace(/0+$/, '')
  return frac
    ? `${whole.toLocaleString()}.${frac}`
    : whole.toLocaleString()
}

export default function Pools() {
  const [pools, setPools] = useState<DexPool[]>([])
  const [loading, setLoading] = useState(true)
  const [totalBurned, setTotalBurned] = useState('0')
  const { get: getAssetInfo, load: loadAssetRegistry } =
    useAssetRegistry()

  useEffect(() => {
    loadAssetRegistry()
  }, [loadAssetRegistry])

  // Reads through the indexer (dex_pools table, kept in sync via
  // route_dex) instead of provider.dex.getAllPools() — a custom RPC
  // that needs the DEX pallet's RPC extension registered on whatever
  // node it's talking to. Works even while that pallet isn't deployed
  // (just returns an empty list rather than throwing), and needs no
  // wallet/chain connection at all.
  useEffect(() => {
    async function load() {
      try {
        const [p, burned] = await Promise.all([
          listDexPools(),
          getDexTotalBurned(),
        ])
        setPools(p)
        setTotalBurned(fmt(burned) + ' RIZ')
      } catch {}
      setLoading(false)
    }
    load()
    const t = setInterval(load, 15_000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen pt-24 pb-12
      bg-purple-glow">
      <div className="max-w-4xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center
          justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black mb-1">
              Liquidity Pools
            </h1>
            <p className="text-[#9999BB] text-sm">
              Total burned:{' '}
              <span className="text-purple-400
                font-mono">
                {totalBurned}
              </span>
            </p>
          </div>
          <Link to="/pools/create">
            <Button>+ Create Pool</Button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              label: 'Total Pools',
              value: pools.length.toString()
            },
            {
              label: 'RIZ Pairs',
              value: pools.filter(
                p => p.isRizPair
              ).length.toString()
            },
            {
              label: 'Token Pairs',
              value: pools.filter(
                p => !p.isRizPair
              ).length.toString()
            },
          ].map(stat => (
            <div key={stat.label}
              className="glass rounded-xl p-4
                text-center">
              <p className="text-[#9999BB] text-xs
                mb-1">
                {stat.label}
              </p>
              <p className="text-2xl font-black
                text-purple-400">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Pool list */}
        {loading ? (
          <div className="text-center py-20
            text-[#9999BB]">
            Loading pools...
          </div>
        ) : pools.length === 0 ? (
          <div className="glass rounded-2xl p-12
            text-center">
            <p className="text-4xl mb-4">🌊</p>
            <p className="text-lg font-bold mb-2">
              No pools yet
            </p>
            <p className="text-[#9999BB] text-sm mb-6">
              Be the first to create a liquidity pool
            </p>
            <Link to="/pools/create">
              <Button>Create Pool</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Table header */}
            <div className="grid grid-cols-4 gap-4
              px-4 text-xs text-[#9999BB]
              font-semibold uppercase tracking-wider">
              <span>Pool</span>
              <span className="text-right">
                Reserve A
              </span>
              <span className="text-right">
                Reserve B
              </span>
              <span className="text-right">Fee</span>
            </div>

            {pools.map((pool, i) => (
              <Link
                key={i}
                to={`/pools/${i}`}
                state={{ pool }}
                className="block"
              >
                <div className="glass rounded-xl p-4
                  hover:border-purple-500/50
                  transition-all cursor-pointer
                  grid grid-cols-4 gap-4
                  items-center">

                  {/* Pair */}
                  <div className="flex items-center
                    gap-2 min-w-0">
                    <div className="flex -space-x-2">
                      <Badge
                        asset={pool.assetA}
                        size="sm"
                      />
                      <Badge
                        asset={pool.assetB}
                        size="sm"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold
                        text-sm truncate">
                        {getAssetInfo(pool.assetA).symbol}
                        {' / '}
                        {getAssetInfo(pool.assetB).symbol}
                      </p>
                      {pool.isRizPair && (
                        <span className="text-xs
                          text-purple-400">
                          RIZ Pair
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reserve A */}
                  <p className="text-right font-mono
                    text-sm">
                    {fmt(pool.reserveA)}
                  </p>

                  {/* Reserve B */}
                  <p className="text-right font-mono
                    text-sm">
                    {fmt(pool.reserveB)}
                  </p>

                  {/* Fee */}
                  <p className="text-right text-sm
                    text-purple-400 font-semibold">
                    {pool.feeBps / 100}%
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
