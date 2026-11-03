import { ApiPromise } from '@polkadot/api'
import type { TestWallet } from '../types'
import { CONFIG } from '../config'

const AMOUNT = BigInt(
  Math.floor(parseFloat(CONFIG.transferAmount) * 1e12)
)

export function buildTransferTx(
  api: ApiPromise,
  _from: TestWallet,
  to: TestWallet,
  _index: number
) {
  return api.tx.balances.transferKeepAlive(
    to.address,
    AMOUNT
  )
}
