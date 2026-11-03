// Wallet-connection helpers — shared by hooks/useWallet.ts (the
// user-triggered / silent-reconnect flows) and nothing else. Kept
// separate from hooks/useWallet.ts itself so the zustand store stays
// focused on state, not on the mechanics of talking to each wallet type.
import { Signer, isAwarizonAvailable, connectAwarizonWallet } from 'awarizon.js'
import { RPC_ENDPOINT, CHAIN_NAME } from './constants'

// Deliberately duck-typed rather than importing @polkadot/extension's own
// Signer type — see awarizon.js/src/utils.ts InjectedSigner for why:
// nested @polkadot/types copies aren't structurally compatible across
// packages even at identical versions.
export interface InjectedSignerLike {
  signPayload?: (payload: any) => Promise<{ id: number; signature: `0x${string}` }>
  signRaw?: (raw: any) => Promise<{ id: number; signature: `0x${string}` }>
  update?: (id: number, status: any) => void
}

export interface ConnectedWallet {
  address: string
  name: string | null
  signer: Signer
  injectedSigner: InjectedSignerLike
  walletName: string
}

function withTimeout<T>(
  promise: Promise<T>, ms: number, message: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ])
}

// Explicit connect via the injected Awarizon wallet — used by
// connectAwarizon() (user-triggered) and, silently, by tryAutoReconnect().
export async function connectViaAwarizon(
  preferredAddress?: string
): Promise<ConnectedWallet> {
  if (!isAwarizonAvailable()) {
    throw new Error(
      'Awarizon wallet not found. Open this portal from the Awarizon ' +
      'wallet to connect automatically, or install the Awarizon ' +
      'browser extension.'
    )
  }

  const ext = await connectAwarizonWallet(CHAIN_NAME)
  const accounts = await ext.accounts.get()
  if (!accounts.length) {
    throw new Error('No accounts found in wallet.')
  }

  const acc = (preferredAddress
    ? accounts.find(a => a.address === preferredAddress)
    : undefined) ?? accounts[0]

  const signer = await withTimeout(
    Signer.fromInjected(RPC_ENDPOINT, acc.address, ext.signer as any),
    20_000,
    'Connecting to the Awarizon node timed out. Check your ' +
    'connection and try again.'
  )

  return {
    address: acc.address,
    name: acc.name ?? null,
    signer,
    injectedSigner: ext.signer as InjectedSignerLike,
    walletName: 'awarizon',
  }
}

// Shared by connectExtension (user-triggered) and tryAutoReconnect
// (silent, on mount).
export async function connectViaPolkadotExtension(
  preferredAddress?: string
): Promise<ConnectedWallet> {
  // Dynamic import, not static — @polkadot/extension-dapp reads `window`
  // at module top level, which crashes when Next's App Router evaluates
  // this module server-side while collecting page data.
  const { web3Enable, web3Accounts, web3FromAddress } =
    await import('@polkadot/extension-dapp')

  const injected = (window as any).injectedWeb3 ?? {}
  const detected = Object.keys(injected)
  if (!detected.length) throw new Error(
    'No wallet extension detected in this browser. ' +
    'Install Talisman, SubWallet, or the Polkadot.js ' +
    'extension, then reload this page.'
  )

  const extensions = await web3Enable(CHAIN_NAME)
  if (!extensions.length) throw new Error(
    `Found ${detected.join(', ')} installed, but it didn't ` +
    'authorize this site. Open the extension, check for a ' +
    'connection request popup, and approve access — then try ' +
    'again.'
  )
  const accounts = await web3Accounts()
  if (!accounts.length) throw new Error(
    'Extension authorized, but no accounts were found. ' +
    'Create or import an account in your wallet extension.'
  )

  const account = (preferredAddress
    ? accounts.find(a => a.address === preferredAddress)
    : undefined) ?? accounts[0]
  const injector = await web3FromAddress(account.address)

  const signer = await withTimeout(
    Signer.fromInjected(RPC_ENDPOINT, account.address, injector.signer),
    20_000,
    'Connecting to the Awarizon node timed out. Check your ' +
    'connection and try again.'
  )

  return {
    address: account.address,
    name: account.meta.name ?? null,
    signer,
    injectedSigner: injector.signer as InjectedSignerLike,
    walletName: account.meta.source || 'extension',
  }
}
