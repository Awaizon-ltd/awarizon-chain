// AwarizonState pallet — inbox extrinsics
// call_index 4: deliver_to_inbox(wallet, campaign_id, record_id)
// call_index 6: dismiss_inbox_record(record_id)
// call_index 7: submit_engagement(record_id, session_duration_seconds, interaction_count)
// call_index 8: claim_reward(record_id)
// call_index 9: update_wallet_index(wallet_age_days, activity_count, category_history, region_code)

import { ApiPromise } from '@polkadot/api'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { ISubmittableResult } from '@polkadot/types/types'

export function buildDeliverToInbox(
  api: ApiPromise,
  wallet: string,      // SS58 address of target wallet
  campaignId: string,  // [u8; 32] 0x hex
  recordId: string     // [u8; 32] 0x hex
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonState.deliverToInbox(wallet, campaignId, recordId)
}

export function buildDismissInboxRecord(
  api: ApiPromise,
  recordId: string  // [u8; 32] 0x hex
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonState.dismissInboxRecord(recordId)
}

export function buildSubmitEngagement(
  api: ApiPromise,
  recordId: string,               // [u8; 32] 0x hex
  sessionDurationSeconds: number, // u32, must be >= MIN_SESSION_SECONDS (120)
  interactionCount: number        // u32, must be >= MIN_INTERACTIONS (5)
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonState.submitEngagement(
    recordId,
    sessionDurationSeconds,
    interactionCount
  )
}

export function buildClaimReward(
  api: ApiPromise,
  recordId: string  // [u8; 32] 0x hex
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonState.claimReward(recordId)
}

export function buildUpdateWalletIndex(
  api: ApiPromise,
  walletAgeDays: number,      // u32
  activityCount: number,       // u32
  categoryHistory: number[],   // BoundedVec<u8, 8> — AppCategory IDs
  regionCode: number           // u8
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonState.updateWalletIndex(
    walletAgeDays,
    activityCount,
    categoryHistory,
    regionCode
  )
}
