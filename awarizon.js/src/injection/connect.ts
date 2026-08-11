import { Signer } from '../Signer'
import type {
  AwarizonInjectedExtension,
  AwarizonInboxContext,
  InjectedAccount,
} from './types'

const PROVIDER_NAME = 'awarizon'
const CONNECT_TIMEOUT = 10_000

// Check if the Awarizon wallet is available in the current page.
export function isAwarizonAvailable(): boolean {
  return typeof window !== 'undefined' &&
    !!window.injectedWeb3?.[PROVIDER_NAME]
}

// Connect to the Awarizon wallet and return its enabled extension.
// Throws if the wallet isn't injected or the connection times out.
//
// Example:
//   const ext = await connectAwarizonWallet('MyApp')
//   const accounts = await ext.accounts.get()
export async function connectAwarizonWallet(
  appName: string
): Promise<AwarizonInjectedExtension> {
  if (!isAwarizonAvailable()) {
    throw new Error(
      'Awarizon wallet not found. ' +
      'Please open this app from the Awarizon wallet inbox.'
    )
  }

  const provider = window.injectedWeb3![PROVIDER_NAME]

  const extension = await Promise.race([
    provider.enable(appName),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Wallet connection timed out')),
        CONNECT_TIMEOUT
      )
    ),
  ])

  return extension
}

// Shortcut for connectAwarizonWallet(appName).then(ext => ext.accounts.get()).
export async function getAwarizonAccounts(
  appName: string
): Promise<InjectedAccount[]> {
  const ext = await connectAwarizonWallet(appName)
  return ext.accounts.get()
}

// Returns null if the app wasn't opened from an inbox delivery, or if
// the wallet isn't available at all.
//
// Example:
//   const ctx = await getInboxContext('MyApp')
//   if (ctx) { /* ctx.campaignId, ctx.recordId available */ }
export async function getInboxContext(
  appName: string
): Promise<AwarizonInboxContext | null> {
  if (!isAwarizonAvailable()) return null
  try {
    const ext = await connectAwarizonWallet(appName)
    return ext.awarizon.getInboxContext()
  } catch {
    return null
  }
}

// Create an awarizon.js Signer backed by the injected wallet —
// compatible with Signer.fromInjected().
//
// Example:
//   const signer = await signerFromAwarizonWallet(
//     'wss://rpc.awarizon.com', 'MyApp'
//   )
//   await signer.inbox.claim(recordId)
export async function signerFromAwarizonWallet(
  endpoint: string,
  appName: string,
): Promise<Signer> {
  const ext = await connectAwarizonWallet(appName)
  const accounts = await ext.accounts.get()

  if (!accounts.length) {
    throw new Error('No accounts in Awarizon wallet')
  }

  return Signer.fromInjected(endpoint, accounts[0].address, ext.signer as any)
}

// Subscribe to account changes. Returns an unsubscribe function.
export async function subscribeAwarizonAccounts(
  appName: string,
  callback: (accounts: InjectedAccount[]) => void,
): Promise<() => void> {
  const ext = await connectAwarizonWallet(appName)
  return ext.accounts.subscribe(callback)
}
