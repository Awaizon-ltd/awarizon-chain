import { useState, useEffect, useCallback } from 'react'
import { useAwarizonContext } from '../context/AwarizonContext'
import type { TxResult, IdentityRecord } from '@awarizon/core'

export function useIdentity(targetAddress?: string) {
  const { core, address, pair, connected } = useAwarizonContext()

  const effectiveAddress = targetAddress ?? address

  const [identity, setIdentity] = useState<IdentityRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!core || !effectiveAddress || !connected) return
    try {
      setLoading(true)
      setError(null)
      const record = await core.identity.get(effectiveAddress)
      setIdentity(record)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load identity')
    } finally {
      setLoading(false)
    }
  }, [core, effectiveAddress, connected])

  useEffect(() => { refresh() }, [refresh])

  const register = useCallback(
    async (params: {
      rizName?: string
      displayName?: string
      bio?: string
      avatarUri?: string
      website?: string
    }): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to register identity.')
      setActionLoading(true)
      try {
        const result = await core.identity.register({ ...params, signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  const update = useCallback(
    async (params: {
      displayName?: string
      bio?: string
      avatarUri?: string
      website?: string
    }): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to update identity.')
      setActionLoading(true)
      try {
        const result = await core.identity.update({ ...params, signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  const lookup = useCallback(
    async (name: string) => {
      if (!core) return null
      return core.identity.lookup(name)
    },
    [core]
  )

  const isAvailable = useCallback(
    async (name: string): Promise<boolean> => {
      if (!core) return false
      return core.identity.isAvailable(name)
    },
    [core]
  )

  const rizName = identity?.rizName ?? null
  const displayName = identity?.displayName ?? null
  const reputationScore = identity?.reputationScore ?? 0
  const isVerified = (identity?.reputationScore ?? 0) >= 100

  return {
    identity,
    rizName, displayName, reputationScore, isVerified,
    loading, actionLoading, error,
    register, update, lookup, isAvailable, refresh,
  }
}
