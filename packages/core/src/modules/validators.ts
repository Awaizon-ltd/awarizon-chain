import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import {
  getActiveValidators,
  getValidatorPerformance,
  buildRegisterValidator,
  buildDelegateStake,
  buildUndelegateStake,
  signAndSend,
} from '@awarizon/sdk'
import type { ValidatorInfo, TxResult } from '../types'
import { parseAmount, formatAmount } from '../utils/amounts'

function bpsToPercent(bps: number): number {
  return Math.round(bps / 100)
}

export class ValidatorsModule {
  constructor(private api: ApiPromise) {}

  async register(params: {
    stake: string
    regionCode: number
    countryCode: number
    signer: KeyringPair
  }): Promise<TxResult> {
    const planck = parseAmount(params.stake)
    const ext = buildRegisterValidator(this.api, planck, params.regionCode, params.countryCode)
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }

  async delegate(params: {
    to: string
    amount: string
    signer: KeyringPair
  }): Promise<TxResult> {
    const planck = parseAmount(params.amount)
    const ext = buildDelegateStake(this.api, params.to, planck)
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }

  async undelegate(params: {
    from: string
    signer: KeyringPair
  }): Promise<TxResult> {
    const ext = buildUndelegateStake(this.api, params.from)
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }

  async performance(address: string): Promise<ValidatorInfo | null> {
    const [validatorRaw, perfRaw] = await Promise.all([
      (this.api.query as any).awarizonConsensus.validators(address),
      getValidatorPerformance(this.api, address),
    ])

    const validator = validatorRaw.toJSON() as Record<string, unknown> | null
    if (!validator) return null

    const selfStake = BigInt(String(validator.self_stake ?? '0'))
    const delegatedStake = BigInt(String(validator.delegated_stake ?? '0'))

    return {
      address,
      selfStake: formatAmount(selfStake),
      delegatedStake: formatAmount(delegatedStake),
      totalStake: formatAmount(selfStake + delegatedStake),
      performanceScore: perfRaw ? perfRaw.performance_score : 0,
      uptime: perfRaw ? bpsToPercent(perfRaw.uptime_bps) : bpsToPercent(validator.uptime_bps as number ?? 0),
      slashCount: perfRaw ? perfRaw.slash_count : (validator.slash_count as number ?? 0),
      isActive: Boolean(validator.is_active),
    }
  }

  async list(): Promise<ValidatorInfo[]> {
    const addresses = await getActiveValidators(this.api)
    const results = await Promise.all(addresses.map((addr) => this.performance(addr)))
    return results.filter((v): v is ValidatorInfo => v !== null)
  }
}
