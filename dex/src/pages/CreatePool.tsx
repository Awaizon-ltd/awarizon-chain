import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useWalletStore } from '../store/walletStore'
import { useAssetRegistry } from '../store/assetRegistryStore'
import { assetToParam } from '../lib/assetParam'
import { Asset, type DexPool } from 'awarizon.js'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import TokenSelector from
  '../components/swap/TokenSelector'

const PLANCK = 1_000_000_000_000n

function parseToPlanck(v: string): bigint {
  if (!v) return 0n
  const parts = v.split('.')
  const whole = BigInt(parts[0] || '0')
  const frac = (parts[1] ?? '').slice(0, 12)
    .padEnd(12, '0')
  return whole * PLANCK + BigInt(frac)
}

// Always creates a brand new pool — picking a pair that already has
// one is caught below and pointed at Add Liquidity instead, rather
// than silently trying and failing on-chain. Separate from
// AddLiquidity.tsx on purpose: that page is reached from one specific
// existing pool and never asks you to pick tokens at all.
export default function CreatePool() {
  const { provider, signer, connected } =
    useWalletStore()
  const { get: getAssetInfo, load: loadAssetRegistry } =
    useAssetRegistry()
  const navigate = useNavigate()

  useEffect(() => {
    loadAssetRegistry()
  }, [loadAssetRegistry])

  const [assetA, setAssetA] =
    useState<Asset>(Asset.native())
  const [assetB, setAssetB] =
    useState<Asset | null>(null)
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const [existingPool, setExistingPool] =
    useState<DexPool | null>(null)
  const [checking, setChecking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    null
  )
  const [showSelector, setShowSelector] =
    useState<'a' | 'b' | null>(null)

  // Only meaningful once both sides are picked — checks whether this
  // exact pair already has a pool, so "Create Pool" never collides
  // with an existing one.
  useEffect(() => {
    async function check() {
      if (!provider || !assetB) {
        setExistingPool(null)
        return
      }
      setChecking(true)
      try {
        setExistingPool(await provider.dex.getPool(assetA, assetB))
      } catch {
        setExistingPool(null)
      } finally {
        setChecking(false)
      }
    }
    check()
  }, [provider, assetA, assetB])

  const poolAlreadyExists = existingPool !== null

  const handleSubmit = async () => {
    if (!signer || !assetB || !amountA || !amountB ||
        poolAlreadyExists) return
    setLoading(true)
    setError(null)
    try {
      const pA = parseToPlanck(amountA)
      const pB = parseToPlanck(amountB)
      await signer.dex.createPool(assetA, assetB, pA, pB)
      navigate('/pools')
    } catch (err: any) {
      setError(err.message ?? 'Failed to create pool')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-12
      bg-purple-glow">
      <div className="max-w-md lg:max-w-xl mx-auto px-4">

        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-[#9999BB] hover:text-white"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold">
            Create Pool
          </h1>
        </div>

        <div className="glass rounded-2xl p-6
          space-y-4">

          <div className="bg-purple-500/10
            border border-purple-500/30
            rounded-xl p-3 text-purple-300
            text-sm">
            You're the first liquidity provider for a new
            pair — the ratio of tokens you deposit sets
            its starting price.
          </div>

          {/* Token A */}
          <div>
            <label className="text-sm
              text-[#9999BB] mb-2 block">
              Token A
            </label>
            <div className="bg-dex-surface2
              rounded-xl p-4">
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={amountA}
                  onChange={e =>
                    setAmountA(e.target.value)
                  }
                  placeholder="0.0"
                  className="flex-1 bg-transparent
                    text-xl font-bold text-white
                    placeholder-[#555577]
                    focus:outline-none"
                />
                <button
                  onClick={() => setShowSelector('a')}
                  className="flex items-center gap-2
                    max-w-[45%] flex-shrink-0
                    bg-dex-bg rounded-xl px-3 py-2
                    hover:bg-dex-border transition-all"
                >
                  <Badge asset={assetA} size="sm" />
                  <span className="text-sm font-semibold truncate">
                    {getAssetInfo(assetA).symbol}
                  </span>
                  <span className="text-[#9999BB] flex-shrink-0">
                    ▾
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-center
            text-[#9999BB] text-xl">+</div>

          {/* Token B */}
          <div>
            <label className="text-sm
              text-[#9999BB] mb-2 block">
              Token B
            </label>
            <div className="bg-dex-surface2
              rounded-xl p-4">
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={amountB}
                  onChange={e =>
                    setAmountB(e.target.value)
                  }
                  placeholder="0.0"
                  className="flex-1 bg-transparent
                    text-xl font-bold text-white
                    placeholder-[#555577]
                    focus:outline-none"
                />
                <button
                  onClick={() => setShowSelector('b')}
                  className="flex items-center gap-2
                    max-w-[45%] flex-shrink-0
                    bg-dex-bg rounded-xl px-3 py-2
                    hover:bg-dex-border transition-all"
                >
                  {assetB ? (
                    <>
                      <Badge asset={assetB} size="sm" />
                      <span className="text-sm font-semibold truncate">
                        {getAssetInfo(assetB).symbol}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-semibold
                      text-[#9999BB] truncate">
                      Select token
                    </span>
                  )}
                  <span className="text-[#9999BB] flex-shrink-0">
                    ▾
                  </span>
                </button>
              </div>
            </div>
          </div>

          {checking && (
            <p className="text-[#555577] text-xs text-center">
              Checking if this pair already has a pool...
            </p>
          )}

          {poolAlreadyExists && existingPool && (
            <div className="bg-yellow-500/10
              border border-yellow-500/30 rounded-xl p-3
              text-yellow-400 text-sm text-center">
              This pool already exists.{' '}
              <Link
                to={`/pools/add/${assetToParam(existingPool.assetA)}/${assetToParam(existingPool.assetB)}`}
                state={{ pool: existingPool }}
                className="underline"
              >
                Add liquidity to it instead →
              </Link>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10
              border border-red-500/30 rounded-xl p-3
              text-red-400 text-sm">
              {error}
            </div>
          )}

          <Button
            fullWidth
            loading={loading}
            disabled={
              !connected ||
              !assetB ||
              !amountA ||
              !amountB ||
              poolAlreadyExists ||
              loading
            }
            onClick={handleSubmit}
          >
            {!connected
              ? 'Connect Wallet'
              : 'Create Pool'
            }
          </Button>
        </div>
      </div>

      {showSelector && (
        <TokenSelector
          side={showSelector === 'a' ? 'in' : 'out'}
          onSelect={asset =>
            showSelector === 'a'
              ? setAssetA(asset)
              : setAssetB(asset)
          }
          onClose={() => setShowSelector(null)}
        />
      )}
    </div>
  )
}
