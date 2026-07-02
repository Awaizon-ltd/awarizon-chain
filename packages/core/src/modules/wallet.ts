import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import { signAndSend } from '@awarizon/sdk'
import type { Balance, TxResult } from '../types'
import { parseAmount, formatAmount } from '../utils/amounts'

export class WalletModule {
  constructor(private api: ApiPromise) {}

  async balance(address: string): Promise<Balance> {
    const account = await this.api.query.system.account(address)
    const data = (account as any).data
    const free = BigInt(data.free.toString())
    const reserved = BigInt(data.reserved.toString())
    const total = free + reserved

    return {
      free: formatAmount(free),
      staked: formatAmount(reserved),
      reserved: formatAmount(reserved),
      total: formatAmount(total),
      freePlanck: free,
    }
  }

  async send(params: {
    to: string
    amount: string
    signer: KeyringPair
  }): Promise<TxResult> {
    const planck = parseAmount(params.amount)
    const ext = this.api.tx.balances.transferKeepAlive(params.to, planck)
    const result = await signAndSend(this.api, ext, params.signer)
    return {
      hash: result.blockHash,
      blockNumber: 0,
      success: true,
    }
  }

  async totalIssuance(): Promise<string> {
    const issuance = await this.api.query.balances.totalIssuance()
    return formatAmount(BigInt(issuance.toString()))
  }
}
