import type { ApiPromise } from '@polkadot/api'
import type { SigningSource } from '../utils'
import {
  getDeveloperProfile, getDeveloperCampaigns,
  buildRegisterDeveloper, buildStakeRiz, buildUpdateWalletIndex,
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

export interface WalletIndexParams {
  /** How old the wallet is, in days. */
  walletAgeDays: number
  /** Number of on-chain interactions. */
  activityCount: number
  /**
   * App categories the user has engaged with. Max 8 entries — the pallet
   * stores this as `BoundedVec<u8, ConstU32<8>>`, so anything past the
   * 8th entry is dropped before submission rather than rejected on-chain.
   * 0=DeFi 1=Gaming 2=Social 3=Productivity 4=Infrastructure
   * 5=DigitalAssets 6=DeveloperTools 7=Education
   */
  categoryHistory: number[]
  /**
   * Region code from geography.rs.
   * 0x01=NorthAmerica 0x02=SouthAmerica 0x03=Europe 0x04=Africa
   * 0x05=MiddleEast 0x06=SouthAsia 0x07=EastAsia 0x08=SoutheastAsia
   * 0x09=Oceania 0x0A=CentralAsia
   */
  regionCode: number
}

export class DeveloperModule {
  constructor(
    private api: ApiPromise,
    private pair: SigningSource | null
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
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  async stake(amount: AmountInput): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = buildStakeRiz(this.api, parseAmount(amount))
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  // Registers this wallet in the campaign targeting pool. Call once during
  // onboarding — required for campaigns to discover and deliver to this
  // wallet automatically.
  async updateWalletIndex(params: WalletIndexParams): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = buildUpdateWalletIndex(
      this.api,
      params.walletAgeDays,
      params.activityCount,
      params.categoryHistory.slice(0, 8),
      params.regionCode,
    )
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  // READ — works without keypair (pair can be null)
  async getCampaigns(address?: string): Promise<string[]> {
    const addr = address
      ? await resolveAddress(address, this.api)
      : this._ownAddress()
    return getDeveloperCampaigns(this.api, addr)
  }

  private _ownAddress(): string {
    if (!this.pair) throw AwarizonError.notSigned()
    return this.pair.address
  }
}
