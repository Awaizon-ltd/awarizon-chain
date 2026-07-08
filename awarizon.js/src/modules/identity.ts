import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import {
  getIdentity, lookupName, isNameAvailable, getTotalIdentities,
  type IdentityRecord,
} from '@awarizon/sdk'
import { AwarizonError } from '../errors'
import { isAddress, submitAndWait, type TxResult } from '../utils'

export interface ProfileParams {
  displayName?: string
  bio?: string
  avatarUri?: string
  website?: string
}

export type { IdentityRecord }

export class IdentityModule {
  constructor(
    private api: ApiPromise,
    private pair: KeyringPair | null
  ) {}

  // READ — works without keypair (pair can be null)
  async get(addressOrName: string): Promise<IdentityRecord | null> {
    if (isAddress(addressOrName)) {
      return getIdentity(this.api, addressOrName)
    }
    const name = addressOrName.replace(/\.riz$/, '').toLowerCase()
    const lookup = await lookupName(this.api, name)
    return lookup?.identity ?? null
  }

  async resolve(name: string): Promise<string | null> {
    const clean = name.replace(/\.riz$/, '').toLowerCase()
    const lookup = await lookupName(this.api, clean)
    return lookup?.account ?? null
  }

  async available(name: string): Promise<boolean> {
    const clean = name.replace(/\.riz$/, '').toLowerCase()
    return isNameAvailable(this.api, clean)
  }

  async total(): Promise<number> {
    return getTotalIdentities(this.api)
  }

  // WRITE (pair required)
  async register(name: string, profile?: ProfileParams): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = (this.api.tx as any).awarizonIdentity.registerIdentity(
      name || null,
      profile?.displayName ?? null,
      profile?.bio ?? null,
      profile?.avatarUri ?? null,
      profile?.website ?? null,
    )
    return submitAndWait(extrinsic, this.pair)
  }

  async update(profile: ProfileParams): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = (this.api.tx as any).awarizonIdentity.updateIdentity(
      profile.displayName ?? null,
      profile.bio ?? null,
      profile.avatarUri ?? null,
      profile.website ?? null,
    )
    return submitAndWait(extrinsic, this.pair)
  }
}
