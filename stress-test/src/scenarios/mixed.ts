import { ApiPromise } from '@polkadot/api'
import type { TestWallet } from '../types'
import { buildTransferTx } from './transfers'
import { buildIdentityTx } from './identity'

// Mixed workload: 70% transfers, 20% identity, 10% system remarks
export function buildMixedTx(
  api: ApiPromise,
  from: TestWallet,
  to: TestWallet,
  index: number
) {
  const roll = index % 10

  if (roll < 7) {
    return buildTransferTx(api, from, to, index)
  } else if (roll < 9) {
    return buildIdentityTx(api, from, to, index)
  } else {
    return api.tx.system.remarkWithEvent(
      `stress-test-${index}`
    )
  }
}
