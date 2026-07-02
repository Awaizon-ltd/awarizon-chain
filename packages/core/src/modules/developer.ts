import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import {
  getDeveloperProfile,
  buildRegisterDeveloper,
  buildStakeRiz,
  signAndSend,
} from '@awarizon/sdk'
import type { DeveloperStatus, TxResult } from '../types'
import { parseAmount, formatAmount } from '../utils/amounts'

export class DeveloperModule {
  constructor(private api: ApiPromise) {}

  async register(params: { signer: KeyringPair }): Promise<TxResult> {
    const ext = buildRegisterDeveloper(this.api)
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }

  async stake(params: { amount: string; signer: KeyringPair }): Promise<TxResult> {
    const planck = parseAmount(params.amount)
    const ext = buildStakeRiz(this.api, planck)
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }

  async status(address: string): Promise<DeveloperStatus | null> {
    const profile = await getDeveloperProfile(this.api, address)
    if (!profile) return null
    return {
      registered: true,
      verified: profile.status === 'Verified',
      stake: formatAmount(profile.staked_riz),
      totalCampaigns: profile.total_campaigns ?? 0,
      totalDeliveries: Number(profile.total_deliveries),
      violationCount: profile.violation_count ?? 0,
    }
  }
}
