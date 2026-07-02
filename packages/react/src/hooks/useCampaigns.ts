import { useState, useEffect, useCallback } from 'react'
import { useAwarizonContext } from '../context/AwarizonContext'
import { getDeveloperCampaigns } from '@awarizon/sdk'
import type { Campaign, TxResult, TargetingOptions } from '@awarizon/core'

export function useCampaigns(targetAddress?: string) {
  const { core, address, pair, connected } = useAwarizonContext()

  const effectiveAddress = targetAddress ?? address

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!core || !effectiveAddress || !connected) return
    try {
      setLoading(true)
      setError(null)
      const api = core.getApi()
      const raw = await getDeveloperCampaigns(api, effectiveAddress)
      // Map raw SDK data to core Campaign type
      const mapped: Campaign[] = (raw as any[]).map((c: any) => ({
        campaignId: c.campaign_id ?? c.campaignId ?? '',
        developer: c.developer ?? '',
        manifestHash: c.app_hash ?? c.manifest_hash ?? c.manifestHash ?? '',
        status: c.status ?? 'Pending',
        createdAt: c.created_at ?? c.createdAt ?? 0,
        expiresAt: c.expires_at ?? c.expiresAt ?? 0,
        maxDeliveries: c.max_deliveries ?? c.maxDeliveries ?? 0,
        currentDeliveries: c.current_deliveries ?? c.currentDeliveries ?? 0,
        targetingDescription: c.targeting_description ?? c.targetingDescription ?? '',
      }))
      setCampaigns(mapped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [core, effectiveAddress, connected])

  useEffect(() => { refresh() }, [refresh])

  const create = useCallback(
    async (params: {
      manifestHash: string
      targeting: TargetingOptions
      durationDays: number
      maxDeliveries: bigint
    }): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to create campaign.')
      setActionLoading(true)
      try {
        const result = await core.campaigns.create({ ...params, signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  const terminate = useCallback(
    async (campaignId: string): Promise<TxResult> => {
      if (!core || !pair) throw new Error('Wallet is locked. Unlock to terminate campaign.')
      setActionLoading(true)
      try {
        const result = await core.campaigns.terminate({ campaignId, signer: pair })
        await refresh()
        return result
      } finally {
        setActionLoading(false)
      }
    },
    [core, pair, refresh]
  )

  const activeCampaigns = campaigns.filter(c => c.status === 'Active')

  return {
    campaigns, activeCampaigns,
    loading, actionLoading, error,
    create, terminate, refresh,
  }
}
