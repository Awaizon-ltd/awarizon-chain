import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import {
  getIdentity,
  isNameAvailable,
  lookupName,
  signAndSend,
} from '@awarizon/sdk'
import type { IdentityRecord, NameLookup, TxResult } from '../types'

export class IdentityModule {
  constructor(private api: ApiPromise) {}

  async get(address: string): Promise<IdentityRecord | null> {
    return getIdentity(this.api, address)
  }

  async lookup(name: string): Promise<NameLookup | null> {
    return lookupName(this.api, name)
  }

  async isAvailable(name: string): Promise<boolean> {
    return isNameAvailable(this.api, name)
  }

  async register(params: {
    rizName?: string
    displayName?: string
    bio?: string
    avatarUri?: string
    website?: string
    signer: KeyringPair
  }): Promise<TxResult> {
    const ext = this.api.tx.awarizonIdentity.registerIdentity(
      params.rizName ?? null,
      params.displayName ?? null,
      params.bio ?? null,
      params.avatarUri ?? null,
      params.website ?? null,
    )
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }

  async update(params: {
    displayName?: string
    bio?: string
    avatarUri?: string
    website?: string
    signer: KeyringPair
  }): Promise<TxResult> {
    const ext = this.api.tx.awarizonIdentity.updateIdentity(
      params.displayName ?? null,
      params.bio ?? null,
      params.avatarUri ?? null,
      params.website ?? null,
    )
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }

  async recalculateReputation(params: {
    account: string
    signer: KeyringPair
  }): Promise<TxResult> {
    const ext = this.api.tx.awarizonIdentity.recalculateReputation(params.account)
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }
}
