import { useState, useEffect, useCallback } from 'react'
import { useAwarizonContext } from '../context/AwarizonContext'
import type { InboxItem, TxResult, ClaimResult } from '@awarizon/core'

export function useInbox(targetAddress?: string) {
  const { core, address, pair, connected } = useAwarizonContext()

  const effectiveAddress = targetAddress ?? address

  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!core || !effectiveAddress || !connected) return
    try {
      setLoading(true)
      const items = await core.inbox.list(effectiveAddress)
      setInbox(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inbox')
    } finally {
      setLoading(false)
    }
  }, [core, effectiveAddress, connected])

  useEffect(() => { refresh() }, [refresh])

  const engage = useCallback(
    async (recordId: string): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to engage.')
      setActionLoading(true)
      try {
        const result = await core.inbox.engage({ recordId, signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  const claim = useCallback(
    async (recordId: string): Promise<ClaimResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to claim rewards.')
      setActionLoading(true)
      try {
        const result = await core.inbox.claim({ recordId, signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  const dismiss = useCallback(
    async (recordId: string): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to dismiss.')
      setActionLoading(true)
      try {
        const result = await core.inbox.dismiss({ recordId, signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  const unreadCount = inbox.filter(
    item => item.status === 'Pending' || item.status === 'Delivered'
  ).length

  const rewardEligible = inbox.filter(item => item.rewardEligible).length

  return {
    inbox, unreadCount, rewardEligible,
    loading, actionLoading, error,
    engage, claim, dismiss, refresh,
  }
}
