import type { ApiPromise } from '@polkadot/api'
import type { SigningSource } from '../utils'
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
    private pair: SigningSource | null
  ) {}

  // READ — works without keypair (pair can be null)
  async get(manifestHash: string): Promise<AppManifest | null> {
    const raw = await (this.api.query as any).awarizonState.appManifests(manifestHash)
    const json = raw.toJSON() as any
    if (!json) return null
    return {
      manifestHash: json.manifestHash,
      developer: json.developer,
      category: json.category,
      registeredAt: Number(json.registeredAt ?? 0),
      metadataUri: hexToString(json.metadataUri),
    }
  }

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
        // Unlike the custom RPC methods (which build snake_case JSON
        // by hand via serde_json::json! on the Rust side), this is a
        // raw storage query — @polkadot/api decodes the SCALE struct
        // itself and auto-camelCases Rust's snake_case field names on
        // .toJSON(). Reading snake_case here silently produced
        // `undefined` for every field, which made hexToString throw
        // and the whole list() call reject.
        manifestHash: json.manifestHash,
        developer: json.developer,
        category: json.category,
        registeredAt: Number(json.registeredAt ?? 0),
        metadataUri: hexToString(json.metadataUri),
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
    const result = await submitAndWait(extrinsic, this.pair, this.api)
    return { ...result, manifestHash }
  }

  private _ownAddress(): string {
    if (!this.pair) throw AwarizonError.notSigned()
    return this.pair.address
  }
}
