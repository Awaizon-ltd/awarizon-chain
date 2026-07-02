import { useState, useEffect, useCallback } from 'react'
import { useAwarizonContext } from '../context/AwarizonContext'
import type { NFTItem, TxResult } from '@awarizon/core'

export function useNFTs(targetAddress?: string) {
  const { core, address, pair, connected } = useAwarizonContext()

  const effectiveAddress = targetAddress ?? address

  const [nfts, setNfts] = useState<NFTItem[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!core || !effectiveAddress || !connected) return
    try {
      setLoading(true)
      setError(null)
      const list = await core.nfts.list(effectiveAddress)
      setNfts(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load NFTs')
    } finally {
      setLoading(false)
    }
  }, [core, effectiveAddress, connected])

  useEffect(() => { refresh() }, [refresh])

  const createCollection = useCallback(
    async (params: { collectionId: number; admin: string }): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to create NFT collection.')
      setActionLoading(true)
      try {
        const result = await core.nfts.createCollection({ ...params, signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  const mint = useCallback(
    async (params: { collection: number; itemId: number; owner: string }): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to mint NFT.')
      setActionLoading(true)
      try {
        const result = await core.nfts.mint({ ...params, signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  const transfer = useCallback(
    async (params: { collection: number; item: number; to: string }): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to transfer NFT.')
      setActionLoading(true)
      try {
        const result = await core.nfts.transfer({ ...params, signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  const burn = useCallback(
    async (params: { collection: number; item: number }): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to burn NFT.')
      setActionLoading(true)
      try {
        const result = await core.nfts.burn({ ...params, signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  const ownerOf = useCallback(
    async (collection: number, item: number): Promise<string | null> => {
      if (!core) return null
      return core.nfts.ownerOf({ collection, item })
    },
    [core]
  )

  return {
    nfts,
    loading, actionLoading, error,
    createCollection, mint, transfer, burn, ownerOf, refresh,
  }
}
