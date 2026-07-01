// AwarizonTargeting pallet — targeting extrinsics
// Pallet index: 9 (runtime/src/lib.rs #[runtime::pallet_index(9)])
// call_index 0: build_bloom_filter(campaign_id)
// call_index 1: check_wallet_match(campaign_id, wallet)
// call_index 2: run_targeting_batch(campaign_id, wallets)

import { ApiPromise } from '@polkadot/api'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { ISubmittableResult } from '@polkadot/types/types'

export function buildBloomFilter(
  api: ApiPromise,
  campaignId: string  // [u8; 32] 0x hex
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonTargeting.buildBloomFilter(campaignId)
}

export function buildCheckWalletMatch(
  api: ApiPromise,
  campaignId: string,  // [u8; 32] 0x hex
  wallet: string       // SS58 address
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonTargeting.checkWalletMatch(campaignId, wallet)
}

export function buildRunTargetingBatch(
  api: ApiPromise,
  campaignId: string,  // [u8; 32] 0x hex
  wallets: string[]    // SS58 addresses, max 100 (BoundedVec<AccountId, 100>)
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonTargeting.runTargetingBatch(campaignId, wallets)
}
