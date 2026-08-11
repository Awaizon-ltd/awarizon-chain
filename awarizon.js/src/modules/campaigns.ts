import type { ApiPromise } from '@polkadot/api'
import type { SigningSource } from '../utils'
import {
  getCampaign, getActiveCampaignCount, getCampaignDeliveryStatus,
  buildCreateCampaign, buildTerminateCampaign, buildDeliverToInbox,
  buildTriggerCampaignDelivery,
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

export interface CampaignTargeting {
  walletAgeMin: number | null
  walletAgeMax: number | null
  rizBalanceMin: string | null
  rizBalanceMax: string | null
  activityMin: number | null
  activityMax: number | null
  regionCodes: number[]
  categoryHistory: string[]
  customLogicHash: string | null
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

function hexBytesToNumbers(hex: string): number[] {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes: number[] = []
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.slice(i, i + 2), 16))
  }
  return bytes
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
    private pair: SigningSource | null
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

  // get_campaign (the custom RPC behind get() above) never serializes
  // `targeting` into its JSON — a node-side gap, not this SDK's. The
  // storage type itself is fully registered (customTypes.ts), so this
  // reads the raw Campaign struct straight out of storage instead.
  async targeting(campaignId: string): Promise<CampaignTargeting | null> {
    const raw = await (this.api.query as any).awarizonState.campaigns(campaignId)
    const json = raw.toJSON() as any
    if (!json?.targeting) return null
    const t = json.targeting
    return {
      walletAgeMin: t.walletAgeMin ?? null,
      walletAgeMax: t.walletAgeMax ?? null,
      rizBalanceMin: t.rizBalanceMin != null ? String(t.rizBalanceMin) : null,
      rizBalanceMax: t.rizBalanceMax != null ? String(t.rizBalanceMax) : null,
      activityMin: t.activityMin ?? null,
      activityMax: t.activityMax ?? null,
      // region_codes is a Vec<u8> — @polkadot/api auto-aliases any Vec<u8>
      // to the Bytes codec, so .toJSON() gives back a hex string ("0x1502")
      // instead of a real number array. Decode it by hand.
      regionCodes: hexBytesToNumbers(t.regionCodes ?? '0x'),
      categoryHistory: t.categoryHistory ?? [],
      customLogicHash: t.customLogicHash ?? null,
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
    const result = await submitAndWait(extrinsic, this.pair, this.api)
    return { ...result, campaignId }
  }

  async terminate(campaignId: string): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = buildTerminateCampaign(this.api, campaignId)
    return submitAndWait(extrinsic, this.pair, this.api)
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
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  // Trigger OCW-based campaign delivery. The developer signs ONCE — the
  // chain automatically delivers to every wallet matching the campaign's
  // targeting criteria over the following blocks.
  async triggerDelivery(campaignId: string): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = buildTriggerCampaignDelivery(this.api, campaignId)
    return submitAndWait(extrinsic, this.pair, this.api)
  }
}
