import { useState, useEffect, useCallback } from 'react'
import { useAwarizonContext } from '../context/AwarizonContext'
import type { Balance, TxResult } from '@awarizon/core'

export function useWallet() {
  const { core, address, pair, connected } = useAwarizonContext()

  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!core || !address || !connected) return

    let cancelled = false

    async function fetchBalance() {
      try {
        setLoading(true)
        const bal = await core!.wallet.balance(address!)
        if (!cancelled) setBalance(bal)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch balance')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchBalance()

    let unsub: (() => void) | null = null
    core.network.subscribeBlocks(() => { fetchBalance() })
      .then(u => { unsub = u })

    return () => {
      cancelled = true
      unsub?.()
    }
  }, [core, address, connected])

  const send = useCallback(
    async (params: { to: string; amount: string }): Promise<TxResult> => {
      if (!core || !pair) {
        throw new Error('Wallet is locked. Unlock your wallet first.')
      }
      return core.wallet.send({ to: params.to, amount: params.amount, signer: pair })
    },
    [core, pair]
  )

  const totalIssuance = useCallback(async () => {
    if (!core) return null
    return core.wallet.totalIssuance()
  }, [core])

  return { balance, loading, error, send, totalIssuance, address }
}
