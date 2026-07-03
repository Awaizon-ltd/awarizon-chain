import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import {
  getCampaign,
  getCampaignDeliveryStatus,
  buildCreateCampaign,
  buildTerminateCampaign,
  buildDeliverToInbox,
  generateCampaignId,
  signAndSend,
} from '@awarizon/sdk'
import type { AppCategory, TargetingCriteria } from '@awarizon/sdk'
import type { Campaign, TxResult, TargetingOptions } from '../types'
import { parseAmount } from '../utils/amounts'

const CATEGORY_MAP: Record<string, AppCategory> = {
  DeFi: 'DeFi',
  Gaming: 'Gaming',
  Social: 'Social',
  Productivity: 'Productivity',
  Infrastructure: 'Infrastructure',
  DigitalAssets: 'DigitalAssets',
  DeveloperTools: 'DeveloperTools',
  Education: 'Education',
}

function buildTargetingCriteria(opts: TargetingOptions): TargetingCriteria {
  return {
    wallet_age_min: opts.minWalletAge ?? null,
    wallet_age_max: opts.maxWalletAge ?? null,
    riz_balance_min: opts.minBalance ? parseAmount(opts.minBalance) : null,
    riz_balance_max: opts.maxBalance ? parseAmount(opts.maxBalance) : null,
    activity_min: opts.minActivity ?? null,
    activity_max: opts.maxActivity ?? null,
    region_codes: opts.regions ?? [],
    category_history: (opts.categories ?? [])
      .map((c) => CATEGORY_MAP[c])
      .filter((c): c is AppCategory => c !== undefined),
    custom_logic_hash: null,
  }
}

function targetingDescription(opts: TargetingOptions): string {
  const parts: string[] = []
  if (opts.categories?.length) parts.push(`categories: ${opts.categories.join(', ')}`)
  if (opts.minBalance || opts.maxBalance)
    parts.push(`balance: ${opts.minBalance ?? '0'} – ${opts.maxBalance ?? '∞'}`)
  if (opts.minWalletAge || opts.maxWalletAge)
    parts.push(`wallet age: ${opts.minWalletAge ?? 0} – ${opts.maxWalletAge ?? '∞'} days`)
  if (opts.regions?.length) parts.push(`regions: ${opts.regions.join(', ')}`)
  return parts.length ? parts.join('; ') : 'no targeting filters'
}

function rawToCampaign(raw: NonNullable<Awaited<ReturnType<typeof getCampaign>>>): Campaign {
  return {
    campaignId: raw.campaign_id,
    developer: raw.developer,
    manifestHash: raw.manifest_hash,
    status: raw.status,
    createdAt: raw.created_at,
    expiresAt: raw.expires_at,
    maxDeliveries: Number(raw.max_deliveries),
    currentDeliveries: Number(raw.current_deliveries),
    targetingDescription: 'see on-chain targeting criteria',
  }
}

export class CampaignsModule {
  constructor(private api: ApiPromise) {}

  async create(params: {
    manifestHash: string
    targeting: TargetingOptions
    durationDays: number
    maxDeliveries: bigint
    signer: KeyringPair
  }): Promise<TxResult & { campaignId: string }> {
    const campaignId = generateCampaignId(params.manifestHash)
    const criteria = buildTargetingCriteria(params.targeting)

    const ext = buildCreateCampaign(
      this.api,
      campaignId,
      params.manifestHash,
      criteria,
      params.durationDays,
      params.maxDeliveries
    )
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true, campaignId }
  }

  async get(campaignId: string): Promise<Campaign | null> {
    const raw = await getCampaign(this.api, campaignId)
    if (!raw) return null
    return rawToCampaign(raw)
  }

  async terminate(params: {
    campaignId: string
    signer: KeyringPair
  }): Promise<TxResult> {
    const ext = buildTerminateCampaign(this.api, params.campaignId)
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }

  async deliver(params: {
    campaignId: string
    wallet: string
    recordId: string
    signer: KeyringPair
  }): Promise<TxResult> {
    const ext = buildDeliverToInbox(
      this.api,
      params.wallet,
      params.campaignId,
      params.recordId
    )
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }

  async deliveryStatus(campaignId: string): Promise<{
    current: number
    max: number
    remaining: number
    percentage: number
  } | null> {
    const raw = await getCampaignDeliveryStatus(this.api, campaignId)
    if (!raw) return null
    return {
      current: Number(raw.current_deliveries),
      max: Number(raw.max_deliveries),
      remaining: Number(raw.remaining),
      percentage: raw.percentage_used,
    }
  }

  // Convenience: build targeting criteria description without creating a campaign
  describeTargeting(opts: TargetingOptions): string {
    return targetingDescription(opts)
  }
}
