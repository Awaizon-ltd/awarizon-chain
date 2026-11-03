import { create } from 'zustand'
import { Signer, isAwarizonAvailable, connectAwarizonWallet } from 'awarizon.js'
import type { Provider } from 'awarizon.js'
import { RPC_ENDPOINT, CHAIN_NAME } from '../constants'
import type { InjectedSignerLike } from '../lib/rawAssets'

// Remembers which extension account was last connected, so a page
// refresh can silently reattach instead of asking the user to click
// through Connect Wallet again — Talisman/SubWallet already keep the
// site authorized across refreshes, only this app's in-memory state
// was resetting.
const STORAGE_KEY = 'awarizon-dev:last-extension-account'

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
// connectAwarizon() (user-triggered) and, silently, by
// tryAutoReconnect(). Throws on failure so each caller decides how to
// surface (or not surface) the error.
async function connectViaAwarizon(preferredAddress?: string) {
  if (!isAwarizonAvailable()) {
    throw new Error(
      'Awarizon wallet not found. Open this app from the Awarizon ' +
      'wallet to connect automatically, or install the Awarizon ' +
      'browser extension.'
    )
  }

  const ext = await connectAwarizonWallet(CHAIN_NAME)
  const accounts = await ext.accounts.get()
  if (!accounts.length) {
    throw new Error('No accounts in Awarizon wallet')
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
    account: { address: acc.address, meta: { name: acc.name ?? 'Awarizon Wallet' } },
    signer,
    injectedSigner: ext.signer as InjectedSignerLike,
    walletName: 'awarizon',
  }
}

// Shared by connectExtension (user-triggered) and tryAutoReconnect
// (silent, on mount) — throws on failure so each caller decides how
// to surface (or not surface) the error.
async function connectViaPolkadotExtension(preferredAddress?: string) {
  // Dynamic import, not static — @polkadot/extension-dapp does
  // `const win = window` at module top level, which crashes when
  // Next's App Router evaluates this module server-side while
  // collecting page data (every route gets one server pass even when
  // fully 'use client'). Deferring the import here means it only ever
  // loads once this function actually runs, which only happens
  // client-side (event handlers / effects).
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

  // web3Enable/web3Accounts resolve fast once already authorized, but
  // the chain connection is a real websocket handshake with no
  // built-in timeout — without this, a slow/unreachable node leaves
  // the connect modal spinning forever with no way out.
  const signer = await withTimeout(
    Signer.fromInjected(RPC_ENDPOINT, account.address, injector.signer),
    20_000,
    'Connecting to the Awarizon node timed out. Check your ' +
    'connection and try again.'
  )

  return {
    account, signer, injectedSigner: injector.signer,
    walletName: account.meta.source || 'extension',
  }
}

interface WalletState {
  connected: boolean
  connecting: boolean
  address: string | null
  name: string | null
  error: string | null
  // Persistent read-only connection — set once on app mount, survives
  // wallet connect/disconnect so pages can still browse read-only data.
  provider: Provider | null
  // Wallet-specific connection — set on connect, torn down on disconnect.
  signer: Signer | null
  // Kept alongside signer only for browser-extension accounts, where
  // Signer never exposes its injected signing callback publicly — needed
  // to sign the odd extrinsic (like assets.setMetadata) that awarizon.js
  // doesn't wrap.
  injectedSigner: InjectedSignerLike | null
  // Which wallet is currently connected — 'awarizon', or the extension's
  // own source id (e.g. 'talisman', 'polkadot-js'). Null when disconnected.
  walletName: string | null

  connectAwarizon: () => Promise<void>
  connectExtension: () => Promise<void>
  tryAutoReconnect: () => Promise<void>
  disconnect: () => void
}

export const useWalletStore = create<WalletState>(
  (set, get) => ({
    connected: false,
    connecting: false,
    address: null,
    name: null,
    error: null,
    provider: null,
    signer: null,
    injectedSigner: null,
    walletName: null,

    // Explicit connect via the injected Awarizon wallet — called when
    // the user picks "Awarizon Wallet" in the connect modal. No
    // fallback to browser extensions; the modal offers that as its
    // own separate option instead of silently substituting one for
    // the other.
    connectAwarizon: async () => {
      set({ connecting: true, error: null })
      try {
        const { account, signer, injectedSigner, walletName } =
          await connectViaAwarizon()
        set({
          connected: true, connecting: false,
          address: account.address,
          name: account.meta.name ?? null,
          signer, injectedSigner, walletName,
        })
      } catch (err: any) {
        set({ connecting: false, error: err.message })
      }
    },

    connectExtension: async () => {
      set({ connecting: true, error: null })
      try {
        const { account, signer, injectedSigner, walletName } =
          await connectViaPolkadotExtension()
        localStorage.setItem(STORAGE_KEY, account.address)
        set({
          connected: true, connecting: false,
          address: account.address,
          name: account.meta.name ?? null,
          signer, injectedSigner, walletName,
        })
      } catch (err: any) {
        set({ connecting: false, error: err.message })
      }
    },

    // Silent, on mount. Tries the injected Awarizon wallet first (no
    // stored-account needed — it's either present or it isn't), then
    // falls back to silently reattaching a previously-authorized
    // browser extension. A stale/revoked session (extension
    // uninstalled, account removed, site access revoked) fails
    // quietly and just falls back to the normal Connect Wallet button,
    // since nobody explicitly asked for this attempt and shouldn't see
    // an error for it.
    tryAutoReconnect: async () => {
      if (get().connected) return

      if (isAwarizonAvailable()) {
        try {
          const { account, signer, injectedSigner, walletName } =
            await connectViaAwarizon()
          set({
            connected: true,
            address: account.address,
            name: account.meta.name ?? null,
            signer, injectedSigner, walletName,
          })
          return
        } catch {
          // Fall through to the stored-extension-account path below.
        }
      }

      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      try {
        const { account, signer, injectedSigner, walletName } =
          await connectViaPolkadotExtension(saved)
        localStorage.setItem(STORAGE_KEY, account.address)
        set({
          connected: true,
          address: account.address,
          name: account.meta.name ?? null,
          signer, injectedSigner, walletName,
        })
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    },

    disconnect: () => {
      const { signer } = get()
      signer?.disconnect()
      localStorage.removeItem(STORAGE_KEY)
      set({
        connected: false, address: null,
        name: null, signer: null,
        injectedSigner: null, walletName: null, error: null,
      })
    },
  })
)
