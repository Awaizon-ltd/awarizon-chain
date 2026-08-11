import { useEffect, useState } from 'react'
import { useWalletStore } from '../store/walletStore'
import { useAssetRegistry } from '../store/assetRegistryStore'
import { Asset } from 'awarizon.js'
import Badge from '../components/ui/Badge'

interface TokenInfo {
  asset: Asset
  pools: number
  totalLiquidity: string
}

const PLANCK = 1_000_000_000_000n

function fmt(planck: string): string {
  const n = BigInt(planck)
  const whole = n / PLANCK
  return whole.toLocaleString()
}

export default function Tokens() {
  const { provider } = useWalletStore()
  const { get: getAssetInfo, load: loadAssetRegistry } =
    useAssetRegistry()
  const [tokens, setTokens] =
    useState<TokenInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAssetRegistry()
  }, [loadAssetRegistry])

  useEffect(() => {
    async function load() {
      if (!provider) return
      try {
        const pools = await provider.dex.getAllPools()
        const tokenMap = new Map<string, TokenInfo>()

        // Always include RIZ
        tokenMap.set('native', {
          asset: Asset.native(),
          pools: 0,
          totalLiquidity: '0',
        })

        for (const pool of pools) {
          const assets = [
            { asset: pool.assetA,
              reserve: pool.reserveA },
            { asset: pool.assetB,
              reserve: pool.reserveB },
          ]

          for (const { asset, reserve } of assets) {
            const key = asset.type === 'native'
              ? 'native'
              : `token-${asset.id}`

            const existing = tokenMap.get(key)
            if (existing) {
              existing.pools += 1
              existing.totalLiquidity = String(
                BigInt(existing.totalLiquidity)
                + BigInt(reserve)
              )
            } else {
              tokenMap.set(key, {
                asset,
                pools: 1,
                totalLiquidity: reserve,
              })
            }
          }
        }

        // Update RIZ pool count
        const riz = tokenMap.get('native')!
        riz.pools = pools.filter(
          p => p.isRizPair
        ).length

        setTokens(Array.from(tokenMap.values()))
      } catch {}
      setLoading(false)
    }
    load()
    const t = setInterval(load, 15_000)
    return () => clearInterval(t)
  }, [provider])

  return (
    <div className="min-h-screen pt-24 pb-12
      bg-purple-glow">
      <div className="max-w-4xl mx-auto px-4">

        <h1 className="text-2xl font-black mb-8">
          Tokens
        </h1>

        {loading ? (
          <div className="text-center py-20
            text-[#9999BB]">
            Loading tokens...
          </div>
        ) : (
          <div className="glass rounded-2xl
            overflow-hidden">

            {/* Header */}
            <div className="grid grid-cols-4 gap-4
              px-6 py-3 border-b border-dex-border
              text-xs text-[#9999BB] font-semibold
              uppercase tracking-wider">
              <span>#</span>
              <span>Token</span>
              <span className="text-right">Pools</span>
              <span className="text-right">
                Total Liquidity
              </span>
            </div>

            {tokens.map((token, i) => {
              const info = getAssetInfo(token.asset)
              return (
                <div
                  key={i}
                  className="grid grid-cols-4 gap-4
                    px-6 py-4 border-b border-dex-border
                    last:border-0 hover:bg-dex-surface2
                    transition-all"
                >
                  <span className="text-[#555577]
                    text-sm">
                    {i + 1}
                  </span>
                  <div className="flex items-center
                    gap-3 min-w-0">
                    <Badge asset={token.asset} size="sm" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {info.symbol}
                      </p>
                      <p className="text-[#9999BB] text-xs truncate">
                        {info.name}
                      </p>
                    </div>
                  </div>
                  <p className="text-right text-sm">
                    {token.pools}
                  </p>
                  <p className="text-right font-mono
                    text-sm text-purple-400">
                    {fmt(token.totalLiquidity)} RIZ
                  </p>
                </div>
              )
            })}

            {tokens.length === 0 && (
              <div className="text-center py-12
                text-[#9999BB]">
                No tokens found. Create a pool first.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
