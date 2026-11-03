import { Provider } from 'awarizon.js'
import { RPC_ENDPOINT } from './constants'

// Persistent, read-only chain connection shared across the whole app —
// leaderboard/landing/dashboard reads all work off this even when no
// wallet is connected. Writes (register, claim, setCommission, ...) go
// through the signer in hooks/useWallet.ts instead, which carries its
// own independent connection.
let clientProvider: Promise<Provider> | null = null

export function getProvider(): Promise<Provider> {
  if (!clientProvider) {
    clientProvider = Provider.connect(RPC_ENDPOINT)
  }
  return clientProvider
}

// Server-side-only connection for API routes (none of the current routes
// need to read chain state directly, but this mirrors developer/dex's
// lib/chainProvider.ts pattern for when one does). Cached on `global` so
// Next's dev-mode HMR doesn't open a fresh websocket on every edit.
declare global {
  // eslint-disable-next-line no-var
  var _validatorChainProviderPromise: Promise<Provider> | undefined
}

export function getServerProvider(): Promise<Provider> {
  if (!global._validatorChainProviderPromise) {
    global._validatorChainProviderPromise = Provider.connect(RPC_ENDPOINT)
  }
  return global._validatorChainProviderPromise
}
