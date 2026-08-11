import { Provider } from 'awarizon.js'
import { RPC_ENDPOINT } from '../constants'

// Server-side-only chain connection for API routes that need to read chain
// state (campaign targeting, app manifests, wallet balances) without going
// through the browser's injected wallet. Cached on `global` for the same
// reason as lib/mongodb.ts — Next's dev-mode HMR would otherwise open a
// fresh websocket connection on every edit.
declare global {
  // eslint-disable-next-line no-var
  var _chainProviderPromise: Promise<Provider> | undefined
}

export function getChainProvider(): Promise<Provider> {
  if (!global._chainProviderPromise) {
    global._chainProviderPromise = Provider.connect(RPC_ENDPOINT)
  }
  return global._chainProviderPromise
}
