// AwarizonState pallet — manifest extrinsics
// call_index 2: register_manifest(manifest_hash: [u8;32], category: AppCategory, metadata_uri: BoundedVec<u8, 256>)

import { ApiPromise } from '@polkadot/api'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { ISubmittableResult } from '@polkadot/types/types'
import type { AppCategory } from '../types'

export function buildRegisterManifest(
  api: ApiPromise,
  manifestHash: string,        // 0x-prefixed 32-byte hex
  category: AppCategory,
  metadataUri: string | Uint8Array  // UTF-8 string or raw bytes, max 256 bytes
): SubmittableExtrinsic<'promise', ISubmittableResult> {
  return api.tx.awarizonState.registerManifest(manifestHash, category, metadataUri)
}
