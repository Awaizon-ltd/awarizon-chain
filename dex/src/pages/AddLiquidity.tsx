import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom'
import { useWalletStore } from '../store/walletStore'
import { useAssetRegistry } from '../store/assetRegistryStore'
import { paramToAsset } from '../lib/assetParam'
import type { DexPool } from 'awarizon.js'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

const PLANCK = 1_000_000_000_000n

function parseToPlanck(v: string): bigint {
  if (!v) return 0n
  const parts = v.split('.')
  const whole = BigInt(parts[0] || '0')
  const frac = (parts[1] ?? '').slice(0, 12)
    .padEnd(12, '0')
  return whole * PLANCK + BigInt(frac)
}

// Always adds to one specific, already-existing pool — reached from
// PoolDetail.tsx (or CreatePool.tsx, if you picked a pair that turns
// out to already have one) with that pool passed via router state.
// Deliberately has no token picker: the pair is fixed by which pool
// you came from, so there's nothing to choose. Separate from
// CreatePool.tsx on purpose — that one always lets you pick both
// tokens because there's no existing pool to be fixed to yet.
export default function AddLiquidity() {
  const { provider, signer, connected } =
    useWalletStore()
  const { get: getAssetInfo, load: loadAssetRegistry } =
    useAssetRegistry()
  const navigate = useNavigate()
  const { assetA: assetAParam, assetB: assetBParam } =
    useParams<{ assetA: string; assetB: string }>()
  const statePool = (useLocation().state as { pool?: DexPool } | null)?.pool

  // The pair is also carried in the URL (not just router state) —
  // state is the fast path (no network round-trip) for normal
  // navigation from PoolDetail/CreatePool, but a direct link or a
  // page refresh loses state entirely. Falling back to re-fetching
  // from the URL means this page works either way instead of only
  // ever working when you arrived via an in-app click.
  const [fetchedPool, setFetchedPool] = useState<DexPool | null>(null)
  const [poolLoading, setPoolLoading] = useState(!statePool)
  const pool = statePool ?? fetchedPool

  useEffect(() => {
    loadAssetRegistry()
  }, [loadAssetRegistry])

  useEffect(() => {
    if (statePool || !provider || !assetAParam || !assetBParam) {
      setPoolLoading(false)
      return
    }
    setPoolLoading(true)
    try {
      const a = paramToAsset(assetAParam)
      const b = paramToAsset(assetBParam)
      provider.dex.getPool(a, b)
        .then(p => setFetchedPool(p))
        .catch(() => setFetchedPool(null))
        .finally(() => setPoolLoading(false))
    } catch {
      setPoolLoading(false)
    }
  }, [statePool, provider, assetAParam, assetBParam])

  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    null
  )

  // Auto-calculate the optimal B amount from the pool's current
  // reserve ratio whenever A changes.
  useEffect(() => {
    if (!pool || !amountA) return
    const planckA = parseToPlanck(amountA)
    const rA = BigInt(pool.reserveA)
    const rB = BigInt(pool.reserveB)
    if (rA > 0n) {
      const optB = planckA * rB / rA
      const whole = optB / PLANCK
      const frac = (optB % PLANCK).toString()
        .padStart(12, '0').slice(0, 6)
        .replace(/0+$/, '')
      setAmountB(frac ? `${whole}.${frac}` : `${whole}`)
    }
  }, [pool, amountA])

  const handleSubmit = async () => {
    if (!signer || !pool || !amountA || !amountB) return
    setLoading(true)
    setError(null)
    try {
      const pA = parseToPlanck(amountA)
      const pB = parseToPlanck(amountB)
      await signer.dex.addLiquidity(
        pool.assetA, pool.assetB, pA, pB,
        { slippageBps: 50 }
      )
      navigate('/pools')
    } catch (err: any) {
      setError(err.message ?? 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  if (poolLoading) {
    return (
      <div className="min-h-screen pt-24 pb-12
        bg-purple-glow flex items-center
        justify-center">
        <p className="text-[#9999BB]">Loading pool...</p>
      </div>
    )
  }

  // Only reachable now if the pair genuinely has no pool (URL was
  // stale/wrong) — a direct link or refresh no longer lands here on
  // its own, since the effect above re-fetches from the URL.
  if (!pool) {
    return (
      <div className="min-h-screen pt-24 pb-12
        bg-purple-glow flex items-center
        justify-center">
        <div className="glass rounded-2xl p-8
          text-center">
          <p className="text-[#9999BB] mb-4">
            This pool doesn't exist — open one from the
            list instead.
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
      <div className="max-w-md lg:max-w-xl mx-auto px-4">

        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-[#9999BB] hover:text-white"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold">
            Add Liquidity
          </h1>
        </div>

        <div className="glass rounded-2xl p-6
          space-y-4">

          {/* Token A — fixed, read-only */}
          <div>
            <label className="text-sm
              text-[#9999BB] mb-2 block">
              {getAssetInfo(pool.assetA).symbol}
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
                <div className="flex items-center gap-2
                  max-w-[45%] flex-shrink-0
                  bg-dex-bg rounded-xl px-3 py-2">
                  <Badge asset={pool.assetA} size="sm" />
                  <span className="text-sm font-semibold truncate">
                    {getAssetInfo(pool.assetA).symbol}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center
            text-[#9999BB] text-xl">+</div>

          {/* Token B — fixed, read-only, amount derived from A */}
          <div>
            <label className="text-sm
              text-[#9999BB] mb-2 block">
              {getAssetInfo(pool.assetB).symbol}
            </label>
            <div className="bg-dex-surface2
              rounded-xl p-4">
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={amountB}
                  readOnly
                  placeholder="0.0"
                  className="flex-1 bg-transparent
                    text-xl font-bold text-white
                    placeholder-[#555577]
                    focus:outline-none cursor-default"
                />
                <div className="flex items-center gap-2
                  max-w-[45%] flex-shrink-0
                  bg-dex-bg rounded-xl px-3 py-2">
                  <Badge asset={pool.assetB} size="sm" />
                  <span className="text-sm font-semibold truncate">
                    {getAssetInfo(pool.assetB).symbol}
                  </span>
                </div>
              </div>
            </div>
          </div>

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
              !amountA ||
              !amountB ||
              loading
            }
            onClick={handleSubmit}
          >
            {!connected
              ? 'Connect Wallet'
              : 'Add Liquidity'
            }
          </Button>
        </div>
      </div>
    </div>
  )
}
