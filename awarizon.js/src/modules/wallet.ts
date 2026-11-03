import type { ApiPromise } from '@polkadot/api'
import type { SigningSource } from '../utils'
import { AwarizonError } from '../errors'
import {
  parseAmount, formatAmount, resolveAddress, submitAndWait,
  type AmountInput, type TxResult,
} from '../utils'

export interface Balance {
  free: string
  staked: string
  reserved: string
  total: string
}

export class WalletModule {
  constructor(
    private api: ApiPromise,
    private pair: SigningSource | null
  ) {}

  // READ — works without keypair (pair can be null)
  async balance(address?: string): Promise<Balance> {
    const addr = address
      ? await resolveAddress(address, this.api)
      : this._ownAddress()
    const account: any = await this.api.query.system.account(addr)
    const free = BigInt(account.data.free.toString())
    const reserved = BigInt(account.data.reserved.toString())
    const frozen = BigInt(account.data.frozen?.toString() ?? '0')
    return {
      free: formatAmount(free),
      staked: formatAmount(frozen),
      reserved: formatAmount(reserved),
      total: formatAmount(free + reserved),
    }
  }

  async totalSupply(): Promise<string> {
    const result = await this.api.query.balances.totalIssuance()
    return formatAmount(BigInt(result.toString()))
  }

  // WRITE — requires keypair
  async send(to: string, amount: AmountInput): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const dest = await resolveAddress(to, this.api)
    const planck = parseAmount(amount)
    const extrinsic = this.api.tx.balances.transferKeepAlive(dest, planck)
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  private _ownAddress(): string {
    if (!this.pair) {
      throw new AwarizonError(
        'No address given and no wallet connected to infer one from.',
        'INVALID_ADDRESS'
      )
    }
    return this.pair.address
  }
}
