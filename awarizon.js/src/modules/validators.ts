import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import {
  getActiveValidators, getValidatorCount, getValidatorPerformance,
  buildRegisterValidator, buildDelegateStake, buildUndelegateStake,
  buildUpdatePerformance,
  buildSetCommission, buildClaimValidatorReward, buildClaimDelegationReward,
  buildClaimAllDelegationRewards, buildClaimSlashCompensation,
} from '@awarizon/sdk'
import { AwarizonError } from '../errors'
import {
  parseAmount, formatAmount, resolveAddress, submitAndWait,
  type AmountInput, type TxResult,
} from '../utils'

export interface ValidatorInfo {
  address: string
  selfStake: string
  delegatedStake: string
  regionCode: number
  countryCode: number
  uptimeBps: number
  finalityBps: number
  blocksBps: number
  slashCount: number
  isActive: boolean
  epochRegistered: number
}

export interface ValidatorPerformance {
  performanceScore: number
  effectiveRank: string
  uptimeBps: number
  finalityBps: number
  blocksBps: number
  slashCount: number
}

export interface EpochRewardRecord {
  epoch: number
  fees_collected: number
  yield_emission: number
  total_pool: number
  burned: number
  to_inbox: number
  to_staking: number
  validators_rewarded: number
  delegators_rewarded: number
}

export class ValidatorsModule {
  constructor(
    private api: ApiPromise,
    private pair: KeyringPair | null
  ) {}

  // READ — works without keypair (pair can be null)
  async list(): Promise<ValidatorInfo[]> {
    const addresses = await getActiveValidators(this.api)
    const infos = await Promise.all(
      addresses.map((addr) => (this.api.query as any).awarizonConsensus.validators(addr))
    )
    return infos
      .map((v) => v.toJSON() as any)
      .filter((json): json is NonNullable<typeof json> => Boolean(json))
      .map((json) => ({
        address: json.account,
        selfStake: formatAmount(BigInt(json.self_stake ?? '0')),
        delegatedStake: formatAmount(BigInt(json.delegated_stake ?? '0')),
        regionCode: json.region_code,
        countryCode: json.country_code,
        uptimeBps: json.uptime_bps,
        finalityBps: json.finality_bps,
        blocksBps: json.blocks_bps,
        slashCount: json.slash_count,
        isActive: json.is_active,
        epochRegistered: Number(json.epoch_registered ?? 0),
      }))
  }

  async count(): Promise<number> {
    return getValidatorCount(this.api)
  }

  async getPendingDelegatorReward(delegator: string, validator: string): Promise<string> {
    const delegatorAddr = await resolveAddress(delegator, this.api)
    const validatorAddr = await resolveAddress(validator, this.api)
    const result = await (this.api.query as any).awarizonConsensus
      .pendingDelegatorRewards(delegatorAddr, validatorAddr)
    return formatAmount(BigInt(result.toString() ?? '0'))
  }

  async getYieldReserveRemaining(): Promise<string> {
    const result = await (this.api.query as any).awarizonConsensus.yieldReserveRemaining()
    return formatAmount(BigInt(result.toString() ?? '0'))
  }

  async getInsurancePoolBalance(): Promise<string> {
    const result = await (this.api.query as any).awarizonConsensus.insurancePoolBalance()
    return formatAmount(BigInt(result.toString() ?? '0'))
  }

  async getEpochRewardHistory(epoch: number): Promise<EpochRewardRecord | null> {
    const result = await (this.api.query as any).awarizonConsensus.epochRewardHistory(epoch)
    return result.toJSON() as EpochRewardRecord | null
  }

  async getValidatorPendingReward(validator: string): Promise<string> {
    const addr = await resolveAddress(validator, this.api)
    const info = await (this.api.query as any).awarizonConsensus.validators(addr)
    const json = info.toJSON() as any
    return formatAmount(BigInt(json?.pending_validator_reward ?? 0))
  }

  async performance(address: string): Promise<ValidatorPerformance | null> {
    const addr = await resolveAddress(address, this.api)
    const perf = await getValidatorPerformance(this.api, addr)
    if (!perf) return null
    return {
      performanceScore: perf.performance_score,
      effectiveRank: perf.effective_rank,
      uptimeBps: perf.uptime_bps,
      finalityBps: perf.finality_bps,
      blocksBps: perf.blocks_bps,
      slashCount: perf.slash_count,
    }
  }

  // WRITE (pair required)
  async register(params: {
    selfStake: AmountInput
    regionCode: number
    countryCode: number
  }): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = buildRegisterValidator(
      this.api, parseAmount(params.selfStake), params.regionCode, params.countryCode
    )
    return submitAndWait(extrinsic, this.pair)
  }

  async delegate(validator: string, amount: AmountInput): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const target = await resolveAddress(validator, this.api)
    const extrinsic = buildDelegateStake(this.api, target, parseAmount(amount))
    return submitAndWait(extrinsic, this.pair)
  }

  async undelegate(validator: string): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const target = await resolveAddress(validator, this.api)
    const extrinsic = buildUndelegateStake(this.api, target)
    return submitAndWait(extrinsic, this.pair)
  }

  async updatePerformance(params: {
    uptime: number
    finality: number
    blocksProduced: number
  }): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = buildUpdatePerformance(
      this.api, this.pair.address, params.uptime, params.finality, params.blocksProduced
    )
    return submitAndWait(extrinsic, this.pair)
  }

  async setCommission(commission: number): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    if (commission < 0 || commission > 20) {
      throw new Error('Commission must be 0-20')
    }
    const extrinsic = buildSetCommission(this.api, commission)
    return submitAndWait(extrinsic, this.pair)
  }

  async claimValidatorReward(): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = buildClaimValidatorReward(this.api)
    return submitAndWait(extrinsic, this.pair)
  }

  async claimDelegationReward(validator: string): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const target = await resolveAddress(validator, this.api)
    const extrinsic = buildClaimDelegationReward(this.api, target)
    return submitAndWait(extrinsic, this.pair)
  }

  async claimAllDelegationRewards(): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = buildClaimAllDelegationRewards(this.api)
    return submitAndWait(extrinsic, this.pair)
  }

  async claimSlashCompensation(validator: string): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const target = await resolveAddress(validator, this.api)
    const extrinsic = buildClaimSlashCompensation(this.api, target)
    return submitAndWait(extrinsic, this.pair)
  }
}
