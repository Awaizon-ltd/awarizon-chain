'use client'
import { create } from 'zustand'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { awarizonTypes, awarizonRpc } from '@awarizon/sdk'
import { NFTClient } from '@awarizon/nft'
import { RPC, CHAIN } from './constants'

interface WalletState {
  api: ApiPromise | null
  nft: NFTClient | null
  nftSigner: NFTClient | null
  address: string | null
  name: string | null
  // Which wallet is connected — 'awarizon', or the extension's own
  // source id (e.g. 'talisman', 'polkadot-js'). Null when disconnected.
  walletName: string | null
  connected: boolean
  connecting: boolean
  error: string | null

  init: () => Promise<void>
  connectAwarizon: () => Promise<void>
  connectExtension: () => Promise<void>
  disconnect: () => void
}

export const useWallet = create<WalletState>((set, get) => ({
  api: null,
  nft: null,
  nftSigner: null,
  address: null,
  name: null,
  walletName: null,
  connected: false,
  connecting: false,
  error: null,

  init: async () => {
    if (get().api) return
    try {
      const provider = new WsProvider(RPC)
      const api = await ApiPromise.create({
        provider,
        types: awarizonTypes,
        rpc: awarizonRpc,
      })
      const nft = new NFTClient(api, null)
      set({ api, nft })
    } catch (err) {
      console.error('API init failed:', err)
    }
  },

  // Explicit connect via the injected Awarizon wallet — called when
  // the user picks "Awarizon Wallet" in the connect modal. No fallback
  // to browser extensions here; the modal offers that as its own
  // separate option instead of silently substituting one for the other.
  connectAwarizon: async () => {
    set({ connecting: true, error: null })
    try {
      let { api } = get()
      if (!api) {
        await get().init()
        api = get().api
      }
      if (!api) throw new Error('API not ready')

      // Lazy-loaded, same caution as the extension-dapp import below —
      // avoid pulling any module that might touch `window` into the
      // server render.
      const { isAwarizonAvailable, connectAwarizonWallet } =
        await import('awarizon.js')

      if (!isAwarizonAvailable()) {
        throw new Error(
          'Awarizon wallet not found. Open this app from the ' +
          'Awarizon wallet to connect automatically, or install ' +
          'the Awarizon browser extension.'
        )
      }

      const ext = await connectAwarizonWallet('RizArt')
      const accounts = await ext.accounts.get()

      if (!accounts.length) {
        throw new Error('No accounts in Awarizon wallet')
      }

      const account = accounts[0]
      const nftSigner = new NFTClient(api, {
        address: account.address,
        signer: ext.signer as any,
      })

      set({
        connected: true,
        connecting: false,
        address: account.address,
        name: account.name ?? 'Awarizon Wallet',
        walletName: 'awarizon',
        nftSigner,
      })
    } catch (err: any) {
      set({ connecting: false, error: err.message })
    }
  },

  // Explicit connect via a standard Polkadot browser extension
  // (Talisman, SubWallet, Polkadot.js).
  connectExtension: async () => {
    set({ connecting: true, error: null })
    try {
      let { api } = get()
      if (!api) {
        await get().init()
        api = get().api
      }
      if (!api) throw new Error('API not ready')

      // Lazy-loaded: @polkadot/extension-dapp touches `window` at module
      // scope, which crashes if it's ever pulled into the server render
      // (e.g. via the root layout while prerendering /_not-found).
      const { web3Enable, web3Accounts, web3FromAddress } = await import(
        '@polkadot/extension-dapp'
      )

      const extensions = await web3Enable(CHAIN)
      if (!extensions.length) {
        throw new Error('No wallet found. Install the Polkadot.js extension.')
      }

      const accounts = await web3Accounts()
      if (!accounts.length) {
        throw new Error('No accounts found.')
      }

      const account = accounts[0]
      const injector = await web3FromAddress(account.address)

      const nftSigner = new NFTClient(api, {
        address: account.address,
        signer: injector.signer,
      })

      set({
        connected: true,
        connecting: false,
        address: account.address,
        name: account.meta.name ?? null,
        walletName: account.meta.source || 'extension',
        nftSigner,
      })
    } catch (err: any) {
      set({ connecting: false, error: err.message })
    }
  },

  disconnect: () => {
    set({
      connected: false,
      address: null,
      name: null,
      walletName: null,
      nftSigner: null,
      error: null,
    })
  },
}))
