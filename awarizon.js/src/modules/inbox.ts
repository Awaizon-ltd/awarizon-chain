import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import {
  getInboxCount, getInboxRecord,
  buildSubmitEngagement, buildClaimReward, buildDismissInboxRecord,
  MIN_SESSION_SECONDS, MIN_INTERACTIONS,
} from '@awarizon/sdk'
import { AwarizonError } from '../errors'
import { formatAmount, resolveAddress, submitAndWait, type TxResult } from '../utils'

export type InboxRecordStatus = 'Pending' | 'Delivered' | 'Dismissed' | 'Engaged'

export interface InboxItem {
  id: string
  campaignId: string
  developer: string
  category: string
  status: InboxRecordStatus
  deliveredAt: number
  rewardEligible: boolean
  reward: string
}

export interface ClaimResult extends TxResult {
  reward: string
}

// Reward schedule from pallets/awarizon-state/src/lib.rs::claim_reward
function rewardForCategory(category: string): bigint {
  if (category === 'DeFi' || category === 'Gaming') return 1_500_000_000_000n
  if (category === 'Social' || category === 'Productivity') return 1_250_000_000_000n
  return 1_000_000_000_000n
}

export class InboxModule {
  constructor(
    private api: ApiPromise,
    private pair: KeyringPair | null
  ) {}

  // READ — works without keypair (pair can be null)
  async list(address?: string): Promise<InboxItem[]> {
    const addr = await this._resolveOrOwn(address)
    const entries = await (this.api.query as any).awarizonState.inboxRecords.entries(addr)
    return entries.map(([, value]: [unknown, any]) => {
      const json = value.toJSON()
      const reward = rewardForCategory(json.category)
      return {
        id: json.record_id,
        campaignId: json.campaign_id,
        developer: json.developer,
        category: json.category,
        status: json.status,
        deliveredAt: Number(json.delivered_at ?? 0),
        rewardEligible: json.status === 'Engaged' && !json.reward_claimed,
        reward: formatAmount(reward),
      } as InboxItem
    })
  }

  async count(address?: string): Promise<number> {
    const addr = await this._resolveOrOwn(address)
    return getInboxCount(this.api, addr)
  }

  // WRITE (pair required)
  async engage(recordId: string): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    // Session data isn't captured by this call — submit the minimum
    // requirements the chain enforces (MIN_SESSION_SECONDS / MIN_INTERACTIONS).
    const extrinsic = buildSubmitEngagement(
      this.api, recordId, MIN_SESSION_SECONDS, MIN_INTERACTIONS
    )
    return submitAndWait(extrinsic, this.pair)
  }

  async claim(recordId: string): Promise<ClaimResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const record = await getInboxRecord(this.api, this.pair.address, recordId)
    if (!record) {
      throw new AwarizonError('Inbox record not found.', 'TRANSACTION_FAILED')
    }
    const reward = rewardForCategory((record as any).category)
    const extrinsic = buildClaimReward(this.api, recordId)
    const result = await submitAndWait(extrinsic, this.pair)
    return { ...result, reward: formatAmount(reward) }
  }

  async dismiss(recordId: string): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = buildDismissInboxRecord(this.api, recordId)
    return submitAndWait(extrinsic, this.pair)
  }

  private async _resolveOrOwn(address?: string): Promise<string> {
    if (address) return resolveAddress(address, this.api)
    if (!this.pair) {
      throw new AwarizonError(
        'No address given and no wallet connected to infer one from.',
        'INVALID_ADDRESS'
      )
    }
    return this.pair.address
  }
}
