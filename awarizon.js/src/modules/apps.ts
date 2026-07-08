import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import { hexToString } from '@polkadot/util'
import { blake2AsHex } from '@polkadot/util-crypto'
import { getDeveloperManifests, buildRegisterManifest, type AppCategory } from '@awarizon/sdk'
import { AwarizonError } from '../errors'
import { resolveAddress, submitAndWait, type TxResult } from '../utils'

export interface AppManifest {
  manifestHash: string
  developer: string
  category: AppCategory
  registeredAt: number
  metadataUri: string
}

export class AppsModule {
  constructor(
    private api: ApiPromise,
    private pair: KeyringPair | null
  ) {}

  // READ — works without keypair (pair can be null)
  async list(developerAddress?: string): Promise<AppManifest[]> {
    const addr = developerAddress
      ? await resolveAddress(developerAddress, this.api)
      : this._ownAddress()
    const hashes = await getDeveloperManifests(this.api, addr)
    const manifests = await Promise.all(
      hashes.map((hash) => (this.api.query as any).awarizonState.appManifests(hash))
    )
    return manifests
      .map((m) => m.toJSON() as any)
      .filter((json): json is NonNullable<typeof json> => Boolean(json))
      .map((json) => ({
        manifestHash: json.manifest_hash,
        developer: json.developer,
        category: json.category,
        registeredAt: Number(json.registered_at ?? 0),
        metadataUri: hexToString(json.metadata_uri),
      }))
  }

  // WRITE (pair required)
  async register(params: {
    category: string
    metadataUri: string
  }): Promise<TxResult & { manifestHash: string }> {
    if (!this.pair) throw AwarizonError.notSigned()
    const manifestHash = blake2AsHex(
      `${this.pair.address}:${params.metadataUri}:${Date.now()}`, 256
    )
    const extrinsic = buildRegisterManifest(
      this.api, manifestHash, params.category as AppCategory, params.metadataUri
    )
    const result = await submitAndWait(extrinsic, this.pair)
    return { ...result, manifestHash }
  }

  private _ownAddress(): string {
    if (!this.pair) throw AwarizonError.notSigned()
    return this.pair.address
  }
}
