import { useState, useEffect, useCallback } from 'react'
import { useAwarizonContext } from '../context/AwarizonContext'
import type { TxResult, LinkedAddress, ChainType } from '@awarizon/core'

export function useLinks(targetAddress?: string) {
  const { core, address, pair, connected } = useAwarizonContext()

  const effectiveAddress = targetAddress ?? address

  const [links, setLinks] = useState<LinkedAddress[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!core || !effectiveAddress || !connected) return
    try {
      setLoading(true)
      setError(null)
      const result = await core.links.list(effectiveAddress)
      setLinks(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load linked addresses')
    } finally {
      setLoading(false)
    }
  }, [core, effectiveAddress, connected])

  useEffect(() => { refresh() }, [refresh])

  const linkEvm = useCallback(
    async (params: { evmAddress: string; signature: string }): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to link EVM address.')
      setActionLoading(true)
      try {
        const result = await core.links.linkEvm({ ...params, signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  const linkSolana = useCallback(
    async (params: { solanaPubkey: string; signature: string }): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to link Solana address.')
      setActionLoading(true)
      try {
        const result = await core.links.linkSolana({ ...params, signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  const unlink = useCallback(
    async (chain: ChainType): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to unlink address.')
      setActionLoading(true)
      try {
        const result = await core.links.unlink({ chain, signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  const buildEvmMessage = useCallback(
    (awarizonAddress: string) => {
      if (!core) throw new Error('Not connected')
      return core.links.buildEvmLinkMessage(awarizonAddress)
    },
    [core]
  )

  const buildSolanaMessage = useCallback(
    (awarizonAddress: string) => {
      if (!core) throw new Error('Not connected')
      return core.links.buildSolanaLinkMessage(awarizonAddress)
    },
    [core]
  )

  const evmAddress = links.find(l => l.chain === 'EVM')?.address ?? null
  const solanaAddress = links.find(l => l.chain === 'Solana')?.address ?? null

  return {
    links, evmAddress, solanaAddress,
    loading, actionLoading, error,
    linkEvm, linkSolana, unlink,
    buildEvmMessage, buildSolanaMessage,
    refresh,
  }
}
