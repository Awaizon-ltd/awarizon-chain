'use client'

import { create } from 'zustand'
import type { Provider, Signer } from 'awarizon.js'
import { getProvider } from '../lib/chain'
import {
  connectViaAwarizon, connectViaPolkadotExtension,
  type InjectedSignerLike,
} from '../lib/wallet'

// Remembers which extension account was last connected, so a page
// refresh can silently reattach instead of asking the user to click
// through Connect Wallet again.
const STORAGE_KEY = 'awarizon-validator:last-extension-account'

interface WalletStoreState {
  connected: boolean
  connecting: boolean
  address: string | null
  name: string | null
  error: string | null
  // Persistent read-only connection — set once on first use, survives
  // wallet connect/disconnect so pages can still browse read-only data.
  provider: Provider | null
  // Wallet-specific connection — set on connect, torn down on disconnect.
  signer: Signer | null
  injectedSigner: InjectedSignerLike | null
  walletName: string | null

  ensureProvider: () => Promise<Provider>
  connectAwarizon: () => Promise<void>
  connectExtension: () => Promise<void>
  tryAutoReconnect: () => Promise<void>
  disconnect: () => void
}

export const useWallet = create<WalletStoreState>((set, get) => ({
  connected: false,
  connecting: false,
  address: null,
  name: null,
  error: null,
  provider: null,
  signer: null,
  injectedSigner: null,
  walletName: null,

  // Persistent read-only provider — connected once and never torn down
  // by wallet connect/disconnect.
  ensureProvider: async () => {
    const existing = get().provider
    if (existing) return existing
    const p = await getProvider()
    set({ provider: p })
    return p
  },

  connectAwarizon: async () => {
    set({ connecting: true, error: null })
    try {
      const { address, name, signer, injectedSigner, walletName } =
        await connectViaAwarizon()
      set({
        connected: true, connecting: false,
        address, name, signer, injectedSigner, walletName,
      })
    } catch (err: any) {
      set({ connecting: false, error: err.message })
    }
  },

  connectExtension: async () => {
    set({ connecting: true, error: null })
    try {
      const { address, name, signer, injectedSigner, walletName } =
        await connectViaPolkadotExtension()
      localStorage.setItem(STORAGE_KEY, address)
      set({
        connected: true, connecting: false,
        address, name, signer, injectedSigner, walletName,
      })
    } catch (err: any) {
      set({ connecting: false, error: err.message })
    }
  },

  // Silent, on mount. Tries the injected Awarizon wallet first, then
  // falls back to silently reattaching a previously-authorized browser
  // extension. Fails quietly either way — nobody explicitly asked for
  // this attempt.
  tryAutoReconnect: async () => {
    if (get().connected) return

    const { isAwarizonAvailable } = await import('awarizon.js')
    if (isAwarizonAvailable()) {
      try {
        const { address, name, signer, injectedSigner, walletName } =
          await connectViaAwarizon()
        set({ connected: true, address, name, signer, injectedSigner, walletName })
        return
      } catch {
        // Fall through to the stored-extension-account path below.
      }
    }

    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try {
      const { address, name, signer, injectedSigner, walletName } =
        await connectViaPolkadotExtension(saved)
      localStorage.setItem(STORAGE_KEY, address)
      set({ connected: true, address, name, signer, injectedSigner, walletName })
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  },

  disconnect: () => {
    const { signer } = get()
    signer?.disconnect()
    localStorage.removeItem(STORAGE_KEY)
    set({
      connected: false, address: null, name: null,
      signer: null, injectedSigner: null, walletName: null, error: null,
    })
  },
}))
