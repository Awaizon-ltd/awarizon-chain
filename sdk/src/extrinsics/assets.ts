// pallet_assets extrinsics
// Pallet index: 11 (runtime/src/lib.rs #[runtime::pallet_index(11)] pub type Assets = pallet_assets)
// Method names follow @polkadot/api camelCase conversion of pallet_assets extrinsics.

import { ApiPromise } from '@polkadot/api'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { ISubmittableResult } from '@polkadot/types/types'

export function buildCreateAsset(
  api: ApiPromise,
  id: number,          // AssetId (u32)
  admin: string,       // SS58 address — asset admin account
  minBalance: bigint   // minimum balance (u128)
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.assets.create(id, admin, minBalance)
}

export function buildMintAsset(
  api: ApiPromise,
  id: number,            // AssetId (u32)
  beneficiary: string,   // SS58 address
  amount: bigint         // u128
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.assets.mint(id, beneficiary, amount)
}

export function buildTransferAsset(
  api: ApiPromise,
  id: number,      // AssetId (u32)
  target: string,  // SS58 address
  amount: bigint   // u128
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.assets.transfer(id, target, amount)
}
