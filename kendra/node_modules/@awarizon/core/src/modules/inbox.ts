import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import {
  getInboxCount,
  getInboxRecord,
  buildDismissInboxRecord,
  buildSubmitEngagement,
  buildClaimReward,
  signAndSend,
  MIN_SESSION_SECONDS,
  MIN_INTERACTIONS,
} from '@awarizon/sdk'
import type { InboxItem, TxResult, ClaimResult } from '../types'

export class InboxModule {
  constructor(private api: ApiPromise) {}

  // Enumerate all InboxRecords for address via StorageDoubleMap prefix iteration
  async list(address: string): Promise<InboxItem[]> {
    const entries = await (this.api.query as any).awarizonState.inboxRecords.entries(address)

    return entries.map(([, value]: [unknown, any]) => {
      const raw = value.toJSON() as Record<string, unknown>
      return {
        recordId: raw.record_id as string,
        campaignId: raw.campaign_id as string,
        developer: raw.developer as string,
        manifestHash: raw.manifest_hash as string,
        category: raw.category as string,
        status: raw.status as InboxItem['status'],
        deliveredAt: raw.delivered_at as number,
        engagedAt: (raw.engaged_at as number | null) ?? null,
        rewardClaimed: raw.reward_claimed as boolean,
        rewardEligible:
          (raw.status as string) === 'Engaged' && !(raw.reward_claimed as boolean),
      }
    })
  }

  async get(address: string, recordId: string): Promise<InboxItem | null> {
    const raw = await getInboxRecord(this.api, address, recordId)
    if (!raw) return null
    return {
      recordId: raw.record_id,
      campaignId: raw.campaign_id,
      developer: raw.developer,
      manifestHash: raw.manifest_hash,
      category: raw.category,
      status: raw.status,
      deliveredAt: raw.delivered_at,
      engagedAt: raw.engaged_at ?? null,
      rewardClaimed: raw.reward_claimed,
      rewardEligible: raw.status === 'Engaged' && !raw.reward_claimed,
    }
  }

  async count(address: string): Promise<number> {
    return getInboxCount(this.api, address)
  }

  async engage(params: {
    recordId: string
    sessionSeconds?: number
    interactions?: number
    signer: KeyringPair
  }): Promise<TxResult> {
    const sessionSeconds = params.sessionSeconds ?? MIN_SESSION_SECONDS
    const interactions = params.interactions ?? MIN_INTERACTIONS

    const ext = buildSubmitEngagement(
      this.api,
      params.recordId,
      sessionSeconds,
      interactions
    )
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }

  async claim(params: {
    recordId: string
    signer: KeyringPair
  }): Promise<ClaimResult> {
    const ext = buildClaimReward(this.api, params.recordId)
    const result = await signAndSend(this.api, ext, params.signer)
    // Base reward is 1 RIZ; DeFi/Gaming categories receive 1.5 RIZ on-chain
    return { hash: result.blockHash, blockNumber: 0, success: true, reward: '1.0000 RIZ' }
  }

  async dismiss(params: {
    recordId: string
    signer: KeyringPair
  }): Promise<TxResult> {
    const ext = buildDismissInboxRecord(this.api, params.recordId)
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }
}
