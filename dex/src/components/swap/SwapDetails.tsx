import type { DexQuote } from 'awarizon.js'
import { useState } from 'react'
import { useAssetRegistry } from '../../store/assetRegistryStore'

interface Props {
  quote: DexQuote
  slippageBps: number
}

const PLANCK = 1_000_000_000_000n

function fmt(planck: string, decimals = 6): string {
  const n = BigInt(planck)
  const whole = n / PLANCK
  const frac = (n % PLANCK).toString()
    .padStart(12, '0').slice(0, decimals)
    .replace(/0+$/, '')
  return frac ? `${whole}.${frac}` : whole.toString()
}

export default function SwapDetails({
  quote, slippageBps
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const { get: getAssetInfo } = useAssetRegistry()

  const minOut = BigInt(quote.amountOut)
    * BigInt(10_000 - slippageBps) / 10_000n

  return (
    <div className="bg-dex-surface2 rounded-xl
      p-3 space-y-2 text-sm">

      {/* Summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center
          justify-between text-[#9999BB]
          hover:text-white transition-colors"
      >
        <span>
          1 {getAssetInfo(quote.assetIn).symbol} ≈{' '}
          {fmt(
            String(
              BigInt(quote.amountOut) * PLANCK
              / BigInt(quote.amountIn)
            )
          )}{' '}
          {getAssetInfo(quote.assetOut).symbol}
        </span>
        <span>{expanded ? '▴' : '▾'}</span>
      </button>

      {expanded && (
        <div className="space-y-1.5 pt-1
          border-t border-dex-border">

          <Row
            label="Price Impact"
            value={`${(quote.priceImpactBps / 100)
              .toFixed(2)}%`}
            valueColor={
              quote.priceImpactBps > 100
                ? 'text-red-400'
                : quote.priceImpactBps > 50
                ? 'text-yellow-400'
                : 'text-green-400'
            }
          />

          <Row
            label="Swap Fee"
            value={`${fmt(quote.fee)} ${
              quote.assetIn.type === 'native'
                ? 'RIZ' : 'Token'
            }`}
          />

          <Row
            label="Protocol Fee"
            value={`${fmt(quote.protocolFee)} ${
              quote.assetIn.type === 'native'
                ? 'RIZ' : 'Token'
            } (burned)`}
          />

          <Row
            label="Min. Received"
            value={`${fmt(minOut.toString())} ${
              getAssetInfo(quote.assetOut).symbol
            }`}
          />

          <Row
            label="Route"
            value={quote.viaRiz
              ? 'Multi-hop via RIZ'
              : 'Direct'
            }
          />

          <Row
            label="Slippage"
            value={`${slippageBps / 100}%`}
          />
        </div>
      )}
    </div>
  )
}

function Row({
  label, value, valueColor = 'text-white'
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="flex justify-between
      text-xs">
      <span className="text-[#9999BB]">{label}</span>
      <span className={valueColor}>{value}</span>
    </div>
  )
}
