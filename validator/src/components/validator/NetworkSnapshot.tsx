'use client'
import { useEffect, useState } from 'react'
import type { NetworkStats } from 'awarizon.js'
import { useChain } from '../../hooks/useChain'
import { EXPLORER_URL } from '../../lib/constants'

// Bordered stats panel below the hero — same visual slot as a metrics
// site's "recent confirmation time" table, filled with what Awarizon
// actually exposes (network.stats() + current block height) rather
// than fabricated latency numbers.
export default function NetworkSnapshot() {
  const { provider } = useChain()
  const [stats, setStats] = useState<NetworkStats | null>(null)
  const [block, setBlock] = useState<number | null>(null)

  useEffect(() => {
    if (!provider) return
    let cancelled = false
    Promise.all([provider.network.stats(), provider.network.block()])
      .then(([s, b]) => { if (!cancelled) { setStats(s); setBlock(b) } })
      .catch(console.error)
    return () => { cancelled = true }
  }, [provider])

  const rows = [
    { label: 'Current Epoch', value: stats?.currentEpoch },
    { label: 'Block Height', value: block },
    { label: 'Total Wallets', value: stats?.totalWallets },
    { label: 'Total Extrinsics', value: stats?.totalExtrinsics },
    { label: 'Active Campaigns', value: stats?.activeCampaigns },
    { label: 'Total Deliveries', value: stats?.totalDeliveries },
  ]

  return (
    <div className="bg-[#161029] border border-gray-800
      rounded-2xl p-8 text-center">
      <h2 className="text-2xl font-bold mb-2">Network Snapshot</h2>
      <a href={EXPLORER_URL} target="_blank" rel="noopener noreferrer"
        className="text-sm text-yellow-400 hover:underline">
        See full detail on the Explorer →
      </a>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6
        gap-6 mt-8 pt-6 border-t border-gray-800 text-left">
        {rows.map(row => (
          <div key={row.label}>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {row.label}
            </p>
            <p className="font-mono font-bold text-lg text-white">
              {row.value === undefined || row.value === null
                ? '—'
                : row.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
