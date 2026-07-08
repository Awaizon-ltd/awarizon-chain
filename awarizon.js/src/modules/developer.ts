import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import {
  getDeveloperProfile,
  buildRegisterDeveloper, buildStakeRiz,
} from '@awarizon/sdk'
import { AwarizonError } from '../errors'
import {
  parseAmount, formatAmount, resolveAddress, submitAndWait,
  type AmountInput, type TxResult,
} from '../utils'

export interface DeveloperStatus {
  verified: boolean
  stake: string
  campaigns: number
  deliveries: number
  violations: number
}

export class DeveloperModule {
  constructor(
    private api: ApiPromise,
    private pair: KeyringPair | null
  ) {}

  // READ — works without keypair (pair can be null)
  async status(address?: string): Promise<DeveloperStatus | null> {
    const addr = address
      ? await resolveAddress(address, this.api)
      : this._ownAddress()
    const profile = await getDeveloperProfile(this.api, addr)
    if (!profile) return null
    return {
      verified: profile.status === 'Verified',
      stake: formatAmount(profile.staked_riz),
      campaigns: profile.total_campaigns,
      deliveries: Number(profile.total_deliveries),
      violations: profile.violation_count,
    }
  }

  // WRITE (pair required)
  async register(): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = buildRegisterDeveloper(this.api)
    return submitAndWait(extrinsic, this.pair)
  }

  async stake(amount: AmountInput): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = buildStakeRiz(this.api, parseAmount(amount))
    return submitAndWait(extrinsic, this.pair)
  }

  private _ownAddress(): string {
    if (!this.pair) throw AwarizonError.notSigned()
    return this.pair.address
  }
}
