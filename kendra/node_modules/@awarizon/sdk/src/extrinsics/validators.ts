// AwarizonConsensus pallet — validator extrinsics
// Pallet index: 10 (runtime/src/lib.rs #[runtime::pallet_index(10)])
// call_index 0: register_validator(self_stake: u128, region_code: u8, country_code: u8)
// call_index 1: delegate_stake(validator: AccountId, amount: u128)
// call_index 2: undelegate_stake(validator: AccountId)
// call_index 3: update_performance(validator, uptime_bps, finality_bps, blocks_bps)
// call_index 4: run_epoch_election(epoch: u64)
// call_index 5: slash_validator(validator: AccountId, reason: u8)  — root only

import { ApiPromise } from '@polkadot/api'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { ISubmittableResult } from '@polkadot/types/types'

export function buildRegisterValidator(
  api: ApiPromise,
  selfStake: bigint,    // u128 — must be >= MinValidatorStake
  regionCode: number,   // u8
  countryCode: number   // u8
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonConsensus.registerValidator(selfStake, regionCode, countryCode)
}

export function buildDelegateStake(
  api: ApiPromise,
  validator: string,  // SS58 address
  amount: bigint      // u128
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonConsensus.delegateStake(validator, amount)
}

export function buildUndelegateStake(
  api: ApiPromise,
  validator: string  // SS58 address
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonConsensus.undelegateStake(validator)
}

export function buildUpdatePerformance(
  api: ApiPromise,
  validator: string,  // SS58 address
  uptimeBps: number,  // u32, 0–10000
  finalityBps: number, // u32, 0–10000
  blocksBps: number    // u32, 0–10000
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonConsensus.updatePerformance(
    validator,
    uptimeBps,
    finalityBps,
    blocksBps
  )
}

export function buildRunEpochElection(
  api: ApiPromise,
  epoch: bigint  // u64
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonConsensus.runEpochElection(epoch)
}

export function buildSlashValidator(
  api: ApiPromise,
  validator: string,  // SS58 address
  reason: number      // u8
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonConsensus.slashValidator(validator, reason)
}
