import type { ApiPromise } from '@polkadot/api'
import type { SigningSource } from '../utils'
import {
  getValidatorCount, getValidatorPerformance,
  buildRegisterValidator, buildDelegateStake, buildUndelegateStake,
  buildUpdatePerformance,
  buildSetCommission, buildClaimValidatorReward, buildClaimDelegationReward,
  buildClaimAllDelegationRewards, buildClaimSlashCompensation,
  buildSetRewardDestination, buildClearRewardDestination,
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
  /// Commission rate 0-20 (%) — kept by the validator from delegator rewards.
  commission: number
  /// Accumulated own-validator reward, formatted RIZ — see claimValidatorReward().
  pendingValidatorReward: string
}

export interface ValidatorPerformance {
  performanceScore: number
  effectiveRank: string
  uptimeBps: number
  finalityBps: number
  blocksBps: number
  slashCount: number
}

export interface DelegationInfo {
  delegator: string
  validator: string
  amount: string
  epochDelegated: number
}

export interface EpochRewardRecord {
  epoch: number
  feesCollected: number
  yieldEmission: number
  totalPool: number
  burned: number
  toInbox: number
  toStaking: number
  validatorsRewarded: number
  delegatorsRewarded: number
}

export class ValidatorsModule {
  constructor(
    private api: ApiPromise,
    private pair: SigningSource | null
  ) {}

  // READ — works without keypair (pair can be null)
  //
  // Reads straight from each validator's own record (Validators storage map)
  // rather than the awarizon_getActiveValidators RPC, which reflects a
  // separate ActiveValidators snapshot that's only (re)computed when someone
  // calls run_epoch_election — not automatically, and not on registration.
  // A validator's own is_active flag flips true the instant they register
  // (pallets/awarizon-consensus/src/lib.rs), so filtering on that here shows
  // them immediately instead of only after the next epoch election happens
  // to run.
  async list(): Promise<ValidatorInfo[]> {
    const entries = (await (this.api.query as any).awarizonConsensus.validators.entries()) as any[]
    return entries
      // .toJSON() on a SCALE-decoded struct returns camelCase field names
      // (isActive, selfStake, ...), not the Rust struct's own snake_case —
      // only custom RPC (serde/Json) responses come back snake_case.
      .map(([, v]: [unknown, any]) => v.toJSON() as any)
      .filter((json): json is NonNullable<typeof json> => Boolean(json) && json.isActive)
      .map((json) => ({
        address: json.account,
        selfStake: formatAmount(BigInt(json.selfStake ?? '0')),
        delegatedStake: formatAmount(BigInt(json.delegatedStake ?? '0')),
        regionCode: json.regionCode,
        countryCode: json.countryCode,
        uptimeBps: json.uptimeBps,
        finalityBps: json.finalityBps,
        blocksBps: json.blocksBps,
        slashCount: json.slashCount,
        isActive: json.isActive,
        epochRegistered: Number(json.epochRegistered ?? 0),
        commission: json.commission,
        pendingValidatorReward: formatAmount(BigInt(json.pendingValidatorReward ?? '0')),
      }))
  }

  async count(): Promise<number> {
    return getValidatorCount(this.api)
  }

  /// Get this delegator's existing delegation to a validator, or null if
  /// they haven't delegated to them. delegate_stake only allows ONE
  /// delegation per (delegator, validator) pair — calling delegate() again
  /// while one exists throws AlreadyDelegated rather than topping it up, so
  /// check this first to decide whether to show Delegate or Undelegate.
  async getDelegation(delegator: string, validator: string): Promise<DelegationInfo | null> {
    const delegatorAddr = await resolveAddress(delegator, this.api)
    const validatorAddr = await resolveAddress(validator, this.api)
    const result = await (this.api.query as any).awarizonConsensus
      .delegations(delegatorAddr, validatorAddr)
    const json = result.toJSON() as any
    if (!json) return null
    return {
      delegator: json.delegator,
      validator: json.validator,
      amount: formatAmount(BigInt(json.amount ?? '0')),
      epochDelegated: Number(json.epochDelegated ?? 0),
    }
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
    return formatAmount(BigInt(json?.pendingValidatorReward ?? 0))
  }

  /// Reward destination for a validator, or null if none is set — in which
  /// case claimValidatorReward() pays the validator's own account. Defaults
  /// to the caller's own address (requires a signed pair) if none given.
  async getRewardDestination(validator?: string): Promise<string | null> {
    let addr: string
    if (validator) {
      addr = await resolveAddress(validator, this.api)
    } else {
      if (!this.pair) throw AwarizonError.notSigned()
      addr = this.pair.address
    }
    const result = await (this.api.query as any).awarizonConsensus
      .validatorRewardDestination(addr)
    return result.isSome ? result.unwrap().toString() : null
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
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  async delegate(validator: string, amount: AmountInput): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const target = await resolveAddress(validator, this.api)
    const extrinsic = buildDelegateStake(this.api, target, parseAmount(amount))
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  async undelegate(validator: string): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const target = await resolveAddress(validator, this.api)
    const extrinsic = buildUndelegateStake(this.api, target)
    return submitAndWait(extrinsic, this.pair, this.api)
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
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  async setCommission(commission: number): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    if (commission < 0 || commission > 20) {
      throw new Error('Commission must be 0-20')
    }
    const extrinsic = buildSetCommission(this.api, commission)
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  async claimValidatorReward(): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = buildClaimValidatorReward(this.api)
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  async claimDelegationReward(validator: string): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const target = await resolveAddress(validator, this.api)
    const extrinsic = buildClaimDelegationReward(this.api, target)
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  async claimAllDelegationRewards(): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = buildClaimAllDelegationRewards(this.api)
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  async claimSlashCompensation(validator: string): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const target = await resolveAddress(validator, this.api)
    const extrinsic = buildClaimSlashCompensation(this.api, target)
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  /// Set a reward destination for this validator. Future claimValidatorReward()
  /// calls send rewards to `destination` instead of this account — for
  /// Validator-as-a-Service setups where you run the node but a customer
  /// receives the rewards. Caller must already be a registered validator.
  async setRewardDestination(destination: string): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const resolved = await resolveAddress(destination, this.api)
    const extrinsic = buildSetRewardDestination(this.api, resolved)
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  /// Clear the reward destination — future claims go back to this validator's
  /// own account.
  async clearRewardDestination(): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = buildClearRewardDestination(this.api)
    return submitAndWait(extrinsic, this.pair, this.api)
  }
}
