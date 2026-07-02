import { createContext, useContext } from 'react'
import type { AwarizonCore } from '@awarizon/core'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { StorageAdapter } from '../storage'

export interface AwarizonContextValue {
  // Connection state
  core: AwarizonCore | null
  connected: boolean
  connecting: boolean
  connectionError: string | null

  // Wallet state
  address: string | null
  pair: KeyringPair | null
  hasStoredWallet: boolean
  walletLocked: boolean

  // Storage
  storage: StorageAdapter

  // Wallet actions
  createWallet: (password: string) => Promise<{ mnemonic: string; address: string }>
  importWallet: (mnemonic: string, password: string) => Promise<{ address: string }>
  unlockWallet: (password: string) => Promise<{ address: string }>
  lockWallet: () => void
  deleteWallet: () => Promise<void>
  exportWallet: (password: string) => Promise<string>
}

export const AwarizonContext = createContext<AwarizonContextValue | null>(null)

export function useAwarizonContext(): AwarizonContextValue {
  const ctx = useContext(AwarizonContext)
  if (!ctx) {
    throw new Error(
      'useAwarizon must be used inside <AwarizonProvider>. ' +
      'Wrap your app with <AwarizonProvider endpoint="wss://...">'
    )
  }
  return ctx
}
