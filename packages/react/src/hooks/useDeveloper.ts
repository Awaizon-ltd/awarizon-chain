import { useState, useEffect, useCallback } from 'react'
import { useAwarizonContext } from '../context/AwarizonContext'
import type { DeveloperStatus, TxResult } from '@awarizon/core'

export function useDeveloper(targetAddress?: string) {
  const { core, address, pair, connected } = useAwarizonContext()

  const effectiveAddress = targetAddress ?? address

  const [status, setStatus] = useState<DeveloperStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!core || !effectiveAddress || !connected) return
    try {
      setLoading(true)
      setError(null)
      const s = await core.developer.status(effectiveAddress)
      setStatus(s)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load developer status')
    } finally {
      setLoading(false)
    }
  }, [core, effectiveAddress, connected])

  useEffect(() => { refresh() }, [refresh])

  const register = useCallback(
    async (): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to register as developer.')
      setActionLoading(true)
      try {
        const result = await core.developer.register({ signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  const stake = useCallback(
    async (amount: string): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to stake.')
      setActionLoading(true)
      try {
        const result = await core.developer.stake({ amount, signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  const isRegistered = status?.registered ?? false
  const stakedAmount = status?.stake ?? '0.0000 RIZ'
  const totalCampaigns = status?.totalCampaigns ?? 0
  const violationCount = status?.violationCount ?? 0

  return {
    status, isRegistered, stakedAmount, totalCampaigns, violationCount,
    loading, actionLoading, error,
    register, stake, refresh,
  }
}
