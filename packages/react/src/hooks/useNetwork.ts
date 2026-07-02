import { useState, useEffect } from 'react'
import { useAwarizonContext } from '../context/AwarizonContext'
import type { NetworkStats } from '@awarizon/core'

export function useNetwork() {
  const { core, connected } = useAwarizonContext()

  const [stats, setStats] = useState<NetworkStats | null>(null)
  const [latestBlock, setLatestBlock] = useState(0)
  const [latestHash, setLatestHash] = useState('')
  const [tps, setTps] = useState(0)
  const [recentExtrinsicCounts, setRecentCounts] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!core || !connected) return

    let cancelled = false
    let unsub: (() => void) | null = null

    async function setup() {
      try {
        const networkStats = await core!.network.stats()
        if (!cancelled) { setStats(networkStats); setLoading(false) }

        unsub = await core!.network.subscribeBlocks(async (blockNumber, hash) => {
          if (cancelled) return

          setLatestBlock(blockNumber)
          setLatestHash(hash)

          // Fetch extrinsic count for TPS estimate
          try {
            const api = core!.getApi()
            const block = await api.rpc.chain.getBlock(hash)
            const extCount = block.block.extrinsics.length
            setRecentCounts(prev => {
              const updated = [...prev, extCount].slice(-10)
              setTps(updated.reduce((a, b) => a + b, 0) / 30)
              return updated
            })
          } catch {
            // Skip TPS update if block fetch fails
          }

          // Refresh stats every 5 blocks
          if (blockNumber % 5 === 0) {
            try {
              const refreshed = await core!.network.stats()
              if (!cancelled) setStats(refreshed)
            } catch {
              // Keep old data
            }
          }
        })
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to connect to network')
          setLoading(false)
        }
      }
    }

    setup()
    return () => { cancelled = true; unsub?.() }
  }, [core, connected])

  return { stats, latestBlock, latestHash, tps, recentExtrinsicCounts, loading, error }
}
