// AwarizonState pallet — developer extrinsics
// Pallet index: 8 (runtime/src/lib.rs #[runtime::pallet_index(8)])
// call_index 0: register_developer()
// call_index 1: stake_riz(amount: BalanceOf<T>)

import { ApiPromise } from '@polkadot/api'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { ISubmittableResult } from '@polkadot/types/types'

export function buildRegisterDeveloper(
  api: ApiPromise
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonState.registerDeveloper()
}

export function buildStakeRiz(
  api: ApiPromise,
  amount: bigint
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonState.stakeRiz(amount)
}
