import { useState, useCallback } from 'react'
import { useAwarizonContext } from '../context/AwarizonContext'
import type { Asset, AssetBalance, TxResult } from '@awarizon/core'

export function useAssets() {
  const { core, address, pair, connected } = useAwarizonContext()

  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(
    async (params: {
      id: number
      admin: string
      minBalance: bigint
    }): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to create asset.')
      setActionLoading(true)
      try {
        return await core.assets.create({ ...params, signer: pair })
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair]
  )

  const mint = useCallback(
    async (params: { assetId: number; to: string; amount: bigint }): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to mint asset.')
      setActionLoading(true)
      try {
        return await core.assets.mint({ ...params, signer: pair })
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair]
  )

  const transfer = useCallback(
    async (params: { assetId: number; to: string; amount: bigint }): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to transfer asset.')
      setActionLoading(true)
      try {
        return await core.assets.transfer({ ...params, signer: pair })
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair]
  )

  const burn = useCallback(
    async (params: { assetId: number; who: string; amount: bigint }): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to burn asset.')
      setActionLoading(true)
      try {
        return await core.assets.burn({ ...params, signer: pair })
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair]
  )

  const balance = useCallback(
    async (assetId: number, who?: string): Promise<AssetBalance | null> => {
      if (!core || !connected) return null
      setLoading(true)
      try {
        return await core.assets.balance({ assetId, address: who ?? address ?? '' })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch balance')
        return null
      } finally {
        setLoading(false)
      }
    },
    [core, address, connected]
  )

  const info = useCallback(
    async (assetId: number): Promise<Asset | null> => {
      if (!core) return null
      return core.assets.info(assetId)
    },
    [core]
  )

  const metadata = useCallback(
    async (assetId: number) => {
      if (!core) return null
      return core.assets.metadata(assetId)
    },
    [core]
  )

  return {
    loading, actionLoading, error,
    create, mint, transfer, burn, balance, info, metadata,
  }
}
