import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import {
  getCampaign, getActiveCampaignCount, getCampaignDeliveryStatus,
  buildCreateCampaign, buildTerminateCampaign, buildDeliverToInbox,
  generateCampaignId,
  type AppCategory, type TargetingCriteria,
} from '@awarizon/sdk'
import { AwarizonError } from '../errors'
import {
  parseAmount, formatAmount, resolveAddress, submitAndWait,
  type AmountInput, type TxResult,
} from '../utils'

export interface Campaign {
  campaignId: string
  developer: string
  manifestHash: string
  status: string
  createdAt: number
  expiresAt: number
  maxDeliveries: number
  currentDeliveries: number
  storageFeePaid: string
}

export interface CampaignStats {
  current: number
  max: number
  remaining: number
  percentage: number
}

export interface TargetingOptions {
  walletAgeMin?: number
  walletAgeMax?: number
  rizBalanceMin?: AmountInput
  rizBalanceMax?: AmountInput
  activityMin?: number
  activityMax?: number
  regionCodes?: number[]
  categoryHistory?: AppCategory[]
  customLogicHash?: string
}

export interface CampaignParams {
  manifestHash: string
  targeting: TargetingOptions
  durationDays: number
  maxDeliveries: number
}

function toTargetingCriteria(opts: TargetingOptions): TargetingCriteria {
  return {
    wallet_age_min: opts.walletAgeMin ?? null,
    wallet_age_max: opts.walletAgeMax ?? null,
    riz_balance_min: opts.rizBalanceMin != null ? parseAmount(opts.rizBalanceMin) : null,
    riz_balance_max: opts.rizBalanceMax != null ? parseAmount(opts.rizBalanceMax) : null,
    activity_min: opts.activityMin ?? null,
    activity_max: opts.activityMax ?? null,
    region_codes: opts.regionCodes ?? [],
    category_history: opts.categoryHistory ?? [],
    custom_logic_hash: opts.customLogicHash ?? null,
  }
}

export class CampaignsModule {
  constructor(
    private api: ApiPromise,
    private pair: KeyringPair | null
  ) {}

  // READ — works without keypair (pair can be null)
  async get(campaignId: string): Promise<Campaign | null> {
    const c = await getCampaign(this.api, campaignId)
    if (!c) return null
    return {
      campaignId: c.campaign_id,
      developer: c.developer,
      manifestHash: c.manifest_hash,
      status: c.status,
      createdAt: c.created_at,
      expiresAt: c.expires_at,
      maxDeliveries: Number(c.max_deliveries),
      currentDeliveries: Number(c.current_deliveries),
      storageFeePaid: formatAmount(c.storage_fee_paid),
    }
  }

  async stats(campaignId: string): Promise<CampaignStats> {
    const s = await getCampaignDeliveryStatus(this.api, campaignId)
    if (!s) {
      return { current: 0, max: 0, remaining: 0, percentage: 0 }
    }
    return {
      current: Number(s.current_deliveries),
      max: Number(s.max_deliveries),
      remaining: Number(s.remaining),
      percentage: s.percentage_used,
    }
  }

  async activeCount(): Promise<number> {
    return Number(await getActiveCampaignCount(this.api))
  }

  // WRITE (pair required)
  async create(params: CampaignParams): Promise<TxResult & { campaignId: string }> {
    if (!this.pair) throw AwarizonError.notSigned()
    const campaignId = generateCampaignId(params.manifestHash)
    const extrinsic = buildCreateCampaign(
      this.api,
      campaignId,
      params.manifestHash,
      toTargetingCriteria(params.targeting),
      params.durationDays,
      BigInt(params.maxDeliveries),
    )
    const result = await submitAndWait(extrinsic, this.pair)
    return { ...result, campaignId }
  }

  async terminate(campaignId: string): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = buildTerminateCampaign(this.api, campaignId)
    return submitAndWait(extrinsic, this.pair)
  }

  async deliver(params: {
    campaignId: string
    wallet: string
    recordId: string
  }): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const wallet = await resolveAddress(params.wallet, this.api)
    const extrinsic = buildDeliverToInbox(
      this.api, wallet, params.campaignId, params.recordId
    )
    return submitAndWait(extrinsic, this.pair)
  }
}
