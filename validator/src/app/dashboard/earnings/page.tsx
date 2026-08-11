'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { EpochRewardRecord } from 'awarizon.js'
import { useWallet } from '../../../hooks/useWallet'
import { useChain } from '../../../hooks/useChain'
import { useValidator } from '../../../hooks/useValidator'
import WalletConnect from '../../../components/wallet/WalletConnect'
import RewardsChart from '../../../components/validator/RewardsChart'

const EPOCHS_SHOWN = 10

export default function EarningsPage() {
  const { connected, address } = useWallet()
  const { provider } = useChain()
  const { validator, loading: validatorLoading } = useValidator(address)

  const [history, setHistory] = useState<EpochRewardRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    if (!provider) return
    let cancelled = false
    ;(async () => {
      try {
        const { currentEpoch } = await provider.network.stats()
        const epochs = Array.from(
          { length: Math.min(EPOCHS_SHOWN, currentEpoch + 1) },
          (_, i) => currentEpoch - i
        ).filter(e => e >= 0)
        const records = await Promise.all(
          epochs.map(e => provider.validators.getEpochRewardHistory(e))
        )
        if (!cancelled) {
          setHistory(records.filter((r): r is EpochRewardRecord => r !== null))
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (!cancelled) setHistoryLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [provider])

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]
        flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect your wallet</h2>
          <p className="text-gray-400 mb-6">
            Connect to view your earnings history
          </p>
          <div className="flex justify-center"><WalletConnect /></div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white py-24">
      <div className="max-w-4xl mx-auto px-6">
        <Link href="/dashboard"
          className="text-sm text-gray-500 hover:text-white
          transition-colors mb-4 inline-block">
          ← Back to dashboard
        </Link>
        <h1 className="text-4xl font-black mb-2">Earnings</h1>
        <p className="text-gray-400 mb-10">
          Your claimable reward, plus recent epoch reward-pool history
          for network context.
        </p>

        <div className="bg-[#111118] border border-yellow-400/30
          rounded-xl p-6 mb-8">
          <p className="text-sm text-gray-400 mb-1">Pending reward (claimable)</p>
          <p className="text-3xl font-black text-yellow-400">
            {validatorLoading
              ? '...'
              : validator?.pendingValidatorReward ?? '0.0000 RIZ'}
          </p>
          {!validatorLoading && !validator && (
            <p className="text-xs text-gray-500 mt-2">
              This wallet isn't a registered validator —{' '}
              <Link href="/self-hosted/register" className="text-yellow-400 hover:underline">
                register one
              </Link>.
            </p>
          )}
        </div>

        <div className="bg-[#111118] border border-gray-800
          rounded-xl p-6">
          <h2 className="font-bold mb-1">Network staking pool per epoch</h2>
          <p className="text-xs text-gray-500 mb-4">
            Total RIZ routed to all validators/delegators each epoch — not
            validator-specific, shown for context on network-wide payouts.
          </p>
          {historyLoading ? (
            <div className="h-56 flex items-center justify-center text-gray-500 text-sm">
              Loading epoch history...
            </div>
          ) : (
            <RewardsChart history={history} />
          )}
        </div>
      </div>
    </main>
  )
}
