import { create } from 'zustand'
import {
  Provider,
  Signer,
  isAwarizonAvailable,
  connectAwarizonWallet,
  signerFromAwarizonWallet,
} from 'awarizon.js'
import {
  web3Enable,
  web3Accounts,
  web3FromAddress,
} from '@polkadot/extension-dapp'
import { RPC_ENDPOINT, CHAIN_NAME } from '../constants'

export type WalletType =
  | 'awarizon'
  | 'polkadot-extension'

export interface WalletAccount {
  address: string
  name?: string
  // Registered .riz name (e.g. "harry.riz"), fetched from chain after
  // connecting — takes priority over the wallet extension's own
  // nickname wherever the account is displayed. null once the lookup
  // has resolved and found nothing; undefined before it resolves.
  rizName?: string | null
  type: WalletType
}

interface WalletState {
  // Connection state
  connected: boolean
  connecting: boolean
  account: WalletAccount | null
  error: string | null

  // SDK instances
  provider: Provider | null
  signer: Signer | null

  // Actions
  connectExtension: () => Promise<void>
  connectAwarizon: () => Promise<void>
  loadRizName: (address: string) => Promise<void>
  disconnect: () => void
}

export const useWalletStore = create<WalletState>(
  (set, get) => ({
    connected: false,
    connecting: false,
    account: null,
    error: null,
    provider: null,
    signer: null,

    connectExtension: async () => {
      set({ connecting: true, error: null })
      try {
        // Enable Polkadot.js extension
        const extensions = await web3Enable(CHAIN_NAME)
        if (extensions.length === 0) {
          throw new Error(
            'No wallet extension found. ' +
            'Install Talisman or SubWallet.'
          )
        }

        const accounts = await web3Accounts()
        if (accounts.length === 0) {
          throw new Error(
            'No accounts found in extension.'
          )
        }

        const account = accounts[0]

        // Get injector for signing
        const injector = await web3FromAddress(
          account.address
        )

        // Create signer using injector. Deliberately not touching
        // `provider` here — it's the app-wide read-only connection
        // App.tsx sets up once on mount, and Signer already has every
        // read method Provider does (Signer extends Provider), so
        // reconnecting one here would only orphan the original
        // websocket and gain nothing.
        const signer = await Signer.fromInjected(
          RPC_ENDPOINT,
          account.address,
          injector.signer,
        )

        set({
          connected: true,
          connecting: false,
          account: {
            address: account.address,
            name: account.meta.name,
            type: 'polkadot-extension',
          },
          signer,
        })
        get().loadRizName(account.address)
      } catch (err: any) {
        set({
          connecting: false,
          error: err.message,
        })
      }
    },

    connectAwarizon: async () => {
      set({ connecting: true, error: null })
      try {
        if (!isAwarizonAvailable()) {
          throw new Error(
            'Awarizon wallet not found. Open this app from the ' +
            'Awarizon wallet to connect automatically, or install ' +
            'the Awarizon browser extension.'
          )
        }

        // Connect to the injected wallet for the account list, and
        // separately for the signer — signerFromAwarizonWallet() does
        // its own connectAwarizonWallet() + accounts.get() internally,
        // but only exposes the first account, so a direct call here is
        // still needed to read the account's display name.
        const ext = await connectAwarizonWallet(CHAIN_NAME)
        const accounts = await ext.accounts.get()

        if (!accounts.length) {
          throw new Error('No accounts in Awarizon wallet')
        }

        const account = accounts[0]

        // Deliberately not touching `provider` here — see the same
        // note in connectExtension above.
        const signer = await signerFromAwarizonWallet(
          RPC_ENDPOINT, CHAIN_NAME
        )

        set({
          connected: true,
          connecting: false,
          account: {
            address: account.address,
            name: account.name ?? 'Awarizon Wallet',
            type: 'awarizon',
          },
          signer,
        })
        get().loadRizName(account.address)
      } catch (err: any) {
        set({
          connecting: false,
          error: err.message,
        })
      }
    },

    // Best-effort .riz identity lookup, kicked off after connecting —
    // never blocks or fails the connect flow itself. Guarded against a
    // disconnect/reconnect-to-a-different-account race by checking the
    // address is still the one currently connected before writing it.
    loadRizName: async (address: string) => {
      try {
        const signer = get().signer
        if (!signer) return
        const identity = await signer.identity.get(address)
        if (get().account?.address !== address) return
        set(state => ({
          account: state.account
            ? { ...state.account, rizName: identity?.rizNameFull ?? null }
            : null,
        }))
      } catch {
        if (get().account?.address === address) {
          set(state => ({
            account: state.account
              ? { ...state.account, rizName: null }
              : null,
          }))
        }
      }
    },

    disconnect: () => {
      const { signer } = get()
      signer?.disconnect?.()
      // `provider` is intentionally left alone — it's the app-wide
      // read-only connection (see connectExtension/connectAwarizon
      // above), not something disconnect should tear down. Killing it
      // here previously broke every quote/pool/TWAP read on the page
      // until a full reload, since nothing ever reconnected it.
      set({
        connected: false,
        account: null,
        signer: null,
        error: null,
      })
    },
  })
)
