// AwarizonConsensus pallet — validator extrinsics
// Pallet index: 10 (runtime/src/lib.rs #[runtime::pallet_index(10)])
// call_index 0: register_validator(self_stake: u128, region_code: u8, country_code: u8)
// call_index 1: delegate_stake(validator: AccountId, amount: u128)
// call_index 2: undelegate_stake(validator: AccountId)
// call_index 3: update_performance(validator, uptime_bps, finality_bps, blocks_bps)
// call_index 4: run_epoch_election(epoch: u64)
// call_index 5: slash_validator(validator: AccountId, reason: u8)  — root only
// call_index 6: set_commission(commission: u32)
// call_index 7: claim_validator_reward()
// call_index 8: claim_delegation_reward(validator: AccountId)
// call_index 9: claim_all_delegation_rewards()
// call_index 10: report_offline(validator: AccountId, missed_blocks: u32)
// call_index 11: report_double_sign(validator: AccountId)  — root only
// call_index 12: claim_slash_compensation(validator: AccountId)
// call_index 13: init_yield_reserve()  — root only

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

export function buildSetCommission(
  api: ApiPromise,
  commission: number  // u32, 0-20
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonConsensus.setCommission(commission)
}

export function buildClaimValidatorReward(
  api: ApiPromise
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonConsensus.claimValidatorReward()
}

export function buildClaimDelegationReward(
  api: ApiPromise,
  validator: string  // SS58 address
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonConsensus.claimDelegationReward(validator)
}

export function buildClaimAllDelegationRewards(
  api: ApiPromise
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonConsensus.claimAllDelegationRewards()
}

export function buildReportOffline(
  api: ApiPromise,
  validator: string,   // SS58 address
  missedBlocks: number // u32
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonConsensus.reportOffline(validator, missedBlocks)
}

export function buildReportDoubleSign(
  api: ApiPromise,
  validator: string  // SS58 address
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonConsensus.reportDoubleSign(validator)
}

export function buildClaimSlashCompensation(
  api: ApiPromise,
  validator: string  // SS58 address
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonConsensus.claimSlashCompensation(validator)
}

export function buildInitYieldReserve(
  api: ApiPromise
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonConsensus.initYieldReserve()
}
