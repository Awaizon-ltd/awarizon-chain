import { useEffect, useState, useCallback } from 'react'
import { useWalletStore } from '../store/walletStore'
import { useDexStore } from '../store/dexStore'
import { useAssetRegistry } from '../store/assetRegistryStore'
import type { DexQuote } from 'awarizon.js'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import SlippageSettings from
  '../components/swap/SlippageSettings'
import SwapDetails from
  '../components/swap/SwapDetails'
import TokenSelector from
  '../components/swap/TokenSelector'

const PLANCK = 1_000_000_000_000n

function formatPlanck(planck: string): string {
  const n = BigInt(planck)
  const whole = n / PLANCK
  const frac = n % PLANCK
  const fracStr = frac.toString().padStart(12, '0')
    .slice(0, 6).replace(/0+$/, '')
  return fracStr
    ? `${whole}.${fracStr}`
    : whole.toString()
}

function parseToPlanck(value: string): bigint {
  if (!value || value === '.') return 0n
  const parts = value.split('.')
  const whole = BigInt(parts[0] || '0')
  let frac = parts[1] ?? ''
  frac = frac.slice(0, 12).padEnd(12, '0')
  return whole * PLANCK + BigInt(frac)
}

export default function Swap() {
  const { provider, signer, connected } =
    useWalletStore()
  const {
    tokenIn, tokenOut,
    amountIn, amountOut,
    slippageBps,
    setAmountIn, setAmountOut,
    swapTokens,
  } = useDexStore()
  const { get: getAssetInfo, load: loadAssetRegistry } =
    useAssetRegistry()

  useEffect(() => {
    loadAssetRegistry()
  }, [loadAssetRegistry])

  const [quote, setQuote] = useState<DexQuote | null>(null)
  const [quoteLoading, setQuoteLoading] =
    useState(false)
  const [swapping, setSwapping] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(
    null
  )
  const [error, setError] = useState<string | null>(
    null
  )
  const [showTokenSelector, setShowTokenSelector] =
    useState<'in' | 'out' | null>(null)

  // Fetch quote when amountIn changes
  const fetchQuote = useCallback(async () => {
    if (!provider || !amountIn || amountIn === '0') {
      setQuote(null)
      setAmountOut('')
      return
    }
    try {
      setQuoteLoading(true)
      const planck = parseToPlanck(amountIn)
      if (planck === 0n) {
        setQuote(null)
        setAmountOut('')
        return
      }
      const q = await provider.dex.getQuote(
        tokenIn, tokenOut, planck
      )
      setQuote(q)
      setAmountOut(formatPlanck(q.amountOut))
    } catch {
      setQuote(null)
      setAmountOut('')
    } finally {
      setQuoteLoading(false)
    }
  }, [provider, amountIn, tokenIn, tokenOut])

  useEffect(() => {
    const timer = setTimeout(fetchQuote, 500)
    return () => clearTimeout(timer)
  }, [fetchQuote])

  // Auto-refresh quote every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchQuote, 10_000)
    return () => clearInterval(interval)
  }, [fetchQuote])

  const handleSwap = async () => {
    if (!signer || !amountIn) return
    setSwapping(true)
    setError(null)
    setTxHash(null)
    try {
      const planck = parseToPlanck(amountIn)
      const result = await signer.dex.swapExactIn(
        tokenIn, tokenOut, planck,
        { slippageBps }
      )
      setTxHash(result.hash)
      setAmountIn('')
      setAmountOut('')
      setQuote(null)
    } catch (err: any) {
      setError(err.message ?? 'Swap failed')
    } finally {
      setSwapping(false)
    }
  }

  const priceImpact = quote?.priceImpactBps ?? 0
  const highImpact = priceImpact > 100 // > 1%

  return (
    <div className="min-h-screen pt-24 pb-12
      bg-purple-glow">
      <div className="max-w-md lg:max-w-xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center
          justify-between mb-4">
          <h1 className="text-xl font-bold">Swap</h1>
          <SlippageSettings />
        </div>

        {/* Swap Card */}
        <div className="glass rounded-2xl p-4
          space-y-2">

          {/* Token In */}
          <div className="bg-dex-surface2 rounded-xl p-4">
            <div className="flex items-center
              justify-between mb-2">
              <span className="text-[#9999BB] text-sm">
                You pay
              </span>
              {connected && (
                <span className="text-[#9999BB] text-xs">
                  Balance: —
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <input
                type="number"
                value={amountIn}
                onChange={e =>
                  setAmountIn(e.target.value)
                }
                placeholder="0.0"
                className="min-w-0 flex-1 bg-transparent
                  text-xl sm:text-2xl font-bold text-white
                  placeholder-[#555577]
                  focus:outline-none"
              />
              <button
                onClick={() =>
                  setShowTokenSelector('in')
                }
                className="flex items-center gap-1.5 sm:gap-2
                  max-w-[45%] bg-dex-bg rounded-xl
                  px-2.5 py-1.5 sm:px-3 sm:py-2
                  hover:bg-dex-border transition-all
                  flex-shrink-0"
              >
                <Badge asset={tokenIn} size="sm" />
                <span className="font-semibold text-sm truncate">
                  {getAssetInfo(tokenIn).symbol}
                </span>
                <span className="text-[#9999BB] flex-shrink-0">▾</span>
              </button>
            </div>
          </div>

          {/* Swap Arrow */}
          <div className="flex justify-center -my-1
            relative z-10">
            <button
              onClick={swapTokens}
              className="w-10 h-10 rounded-xl
                bg-dex-surface border-2 border-dex-bg
                flex items-center justify-center
                hover:bg-purple-500 hover:border-purple-500
                transition-all group"
            >
              <svg width="16" height="16"
                viewBox="0 0 16 16" fill="none"
                className="text-[#9999BB]
                  group-hover:text-white transition-colors">
                <path
                  d="M8 3v10M5 10l3 3 3-3M11 6L8 3 5 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Token Out */}
          <div className="bg-dex-surface2 rounded-xl p-4">
            <div className="flex items-center
              justify-between mb-2">
              <span className="text-[#9999BB] text-sm">
                You receive
              </span>
              {quoteLoading && (
                <span className="text-[#9999BB] text-xs
                  animate-pulse">
                  Getting quote...
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <input
                type="number"
                value={amountOut}
                readOnly
                placeholder="0.0"
                className="min-w-0 flex-1 bg-transparent
                  text-xl sm:text-2xl font-bold text-white
                  placeholder-[#555577]
                  focus:outline-none cursor-default"
              />
              <button
                onClick={() =>
                  setShowTokenSelector('out')
                }
                className="flex items-center gap-1.5 sm:gap-2
                  max-w-[45%] bg-dex-bg rounded-xl
                  px-2.5 py-1.5 sm:px-3 sm:py-2
                  hover:bg-dex-border transition-all
                  flex-shrink-0"
              >
                <Badge asset={tokenOut} size="sm" />
                <span className="font-semibold text-sm truncate">
                  {getAssetInfo(tokenOut).symbol}
                </span>
                <span className="text-[#9999BB] flex-shrink-0">▾</span>
              </button>
            </div>
          </div>

          {/* Quote details */}
          {quote && (
            <SwapDetails
              quote={quote}
              slippageBps={slippageBps}
            />
          )}

          {/* High price impact warning */}
          {highImpact && (
            <div className="bg-yellow-500/10
              border border-yellow-500/30
              rounded-xl p-3 text-yellow-400
              text-sm text-center">
              ⚠️ High price impact:{' '}
              {(priceImpact / 100).toFixed(2)}%
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10
              border border-red-500/30
              rounded-xl p-3 text-red-400
              text-sm text-center">
              {error}
            </div>
          )}

          {/* Success */}
          {txHash && (
            <div className="bg-green-500/10
              border border-green-500/30
              rounded-xl p-3 text-green-400
              text-sm text-center">
              ✓ Swap successful!
            </div>
          )}

          {/* Swap Button */}
          {!connected ? (
            <Button
              fullWidth
              onClick={() =>
                document.getElementById('connect-btn')
                  ?.click()
              }
            >
              Connect Wallet
            </Button>
          ) : !amountIn || amountIn === '0' ? (
            <Button fullWidth disabled>
              Enter an amount
            </Button>
          ) : !quote && !quoteLoading ? (
            <Button fullWidth disabled>
              No route found
            </Button>
          ) : (
            <Button
              fullWidth
              loading={swapping}
              disabled={swapping || quoteLoading}
              onClick={handleSwap}
              className={highImpact
                ? 'bg-yellow-500 hover:bg-yellow-600'
                : ''
              }
            >
              {swapping
                ? 'Swapping...'
                : highImpact
                ? 'Swap Anyway'
                : 'Swap'
              }
            </Button>
          )}
        </div>

        {/* Powered by */}
        <p className="text-center text-[#555577]
          text-xs mt-6">
          Powered by Rizswap · 0.25% fee on RIZ pairs
        </p>
      </div>

      {/* Token Selector Modal */}
      {showTokenSelector && (
        <TokenSelector
          side={showTokenSelector}
          onClose={() => setShowTokenSelector(null)}
        />
      )}
    </div>
  )
}
