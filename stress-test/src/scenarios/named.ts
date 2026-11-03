import { ApiPromise } from '@polkadot/api'
import type { TestWallet } from '../types'
import { CONFIG } from '../config'

const AMOUNT = BigInt(
  Math.floor(parseFloat(CONFIG.transferAmount) * 1e12)
)

// Cache of resolved .riz names → addresses, shared across the scenario run
// so repeated lookups of the same popular name don't keep re-hitting RPC.
const resolvedNames = new Map<string, string>()

// Exercises .riz name resolution under load: when the recipient wallet has
// a registered name (set by the "identity" scenario), resolve it via the
// awarizon_lookupName RPC before transferring, instead of using the raw
// address directly.
export async function buildNamedTransferTx(
  api: ApiPromise,
  _from: TestWallet,
  to: TestWallet,
  _index: number
) {
  let toAddress = to.address

  if (to.rizName) {
    const cached = resolvedNames.get(to.rizName)
    if (cached) {
      toAddress = cached
    } else {
      try {
        const name = to.rizName.replace(/\.riz$/, '')
        const result = await (api.rpc as any)
          .awarizon.lookupName(name, null)
        const data = result.toJSON() as any
        if (data?.account) {
          toAddress = data.account
          resolvedNames.set(to.rizName, toAddress)
        }
      } catch {
        // Fall back to the raw address if resolution fails
      }
    }
  }

  return api.tx.balances.transferKeepAlive(
    toAddress,
    AMOUNT
  )
}
