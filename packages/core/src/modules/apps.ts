import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import {
  getDeveloperManifests,
  buildRegisterManifest,
  signAndSend,
} from '@awarizon/sdk'
import type { AppCategory } from '@awarizon/sdk'
import type { AppManifest, TxResult } from '../types'

export class AppsModule {
  constructor(private api: ApiPromise) {}

  async register(params: {
    manifestHash: string   // 0x-prefixed 32-byte hex
    category: AppCategory
    metadataUri: string
    signer: KeyringPair
  }): Promise<TxResult & { manifestHash: string }> {
    const ext = buildRegisterManifest(
      this.api,
      params.manifestHash,
      params.category,
      params.metadataUri
    )
    const result = await signAndSend(this.api, ext, params.signer)
    return {
      hash: result.blockHash,
      blockNumber: 0,
      success: true,
      manifestHash: params.manifestHash,
    }
  }

  async list(developerAddress: string): Promise<AppManifest[]> {
    const hashes = await getDeveloperManifests(this.api, developerAddress)
    const manifests: AppManifest[] = []

    for (const hash of hashes) {
      const raw = await (this.api.query as any).awarizonState.manifests(hash)
      const json = raw.toJSON() as Record<string, unknown> | null
      if (!json) continue
      manifests.push({
        manifestHash: json.manifest_hash as string,
        developer: json.developer as string,
        category: json.category as string,
        registeredAt: json.registered_at as number,
        metadataUri: typeof json.metadata_uri === 'string'
          ? json.metadata_uri
          : Buffer.from(json.metadata_uri as number[]).toString('utf8'),
      })
    }

    return manifests
  }
}
