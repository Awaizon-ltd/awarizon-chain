// AwarizonState pallet — campaign extrinsics
// call_index 3:  create_campaign(campaign_id, manifest_hash, targeting, duration_days, max_deliveries)
// call_index 5:  terminate_campaign(campaign_id)
// call_index 10: advance_epoch()
// call_index 11: expire_campaign(campaign_id)
// call_index 12: reset_daily_engagement()
// call_index 16: trigger_campaign_delivery(campaign_id)

import { ApiPromise } from '@polkadot/api'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { ISubmittableResult } from '@polkadot/types/types'
import type { TargetingCriteria } from '../types'

export function buildCreateCampaign(
  api: ApiPromise,
  campaignId: string,           // [u8; 32] 0x hex
  manifestHash: string,          // [u8; 32] 0x hex
  targeting: TargetingCriteria,
  durationDays: number,          // u32, 1–90
  maxDeliveries: bigint          // u64
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonState.createCampaign(
    campaignId,
    manifestHash,
    targeting,
    durationDays,
    maxDeliveries
  )
}

export function buildTerminateCampaign(
  api: ApiPromise,
  campaignId: string  // [u8; 32] 0x hex
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonState.terminateCampaign(campaignId)
}

export function buildExpireCampaign(
  api: ApiPromise,
  campaignId: string  // [u8; 32] 0x hex
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonState.expireCampaign(campaignId)
}

export function buildAdvanceEpoch(
  api: ApiPromise
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonState.advanceEpoch()
}

export function buildResetDailyEngagement(
  api: ApiPromise
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonState.resetDailyEngagement()
}

// Trigger OCW-based delivery: the developer signs once and the chain
// delivers to every wallet matching the campaign's targeting criteria.
export function buildTriggerCampaignDelivery(
  api: ApiPromise,
  campaignId: string  // [u8; 32] 0x hex
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonState.triggerCampaignDelivery(campaignId)
}
