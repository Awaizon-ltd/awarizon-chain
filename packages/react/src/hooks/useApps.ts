import { useState, useEffect, useCallback } from 'react'
import { useAwarizonContext } from '../context/AwarizonContext'
import type { AppManifest, TxResult } from '@awarizon/core'
import type { AppCategory } from '@awarizon/sdk'

export function useApps(targetAddress?: string) {
  const { core, address, pair, connected } = useAwarizonContext()

  const effectiveAddress = targetAddress ?? address

  const [apps, setApps] = useState<AppManifest[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!core || !effectiveAddress || !connected) return
    try {
      setLoading(true)
      setError(null)
      const list = await core.apps.list(effectiveAddress)
      setApps(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load apps')
    } finally {
      setLoading(false)
    }
  }, [core, effectiveAddress, connected])

  useEffect(() => { refresh() }, [refresh])

  const register = useCallback(
    async (params: { manifestHash: string; category: AppCategory; metadataUri: string }): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to register app.')
      setActionLoading(true)
      try {
        const result = await core.apps.register({ ...params, signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  return {
    apps,
    loading, actionLoading, error,
    register, refresh,
  }
}
