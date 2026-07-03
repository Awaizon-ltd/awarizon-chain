import { createContext, useContext } from 'react'
import type { Awarizon } from '../core/Awarizon'
import type { WalletConfig } from '../adapters/resolve'

export interface AwarizonClientContextValue {
  instance: Awarizon | null
  connected: boolean
  connecting: boolean
  address: string | null
  error: string | null
  connect(wallet?: string | WalletConfig): Promise<void>
  disconnect(): Promise<void>
}

export const AwarizonClientContext = createContext<AwarizonClientContextValue>({
  instance: null,
  connected: false,
  connecting: false,
  address: null,
  error: null,
  connect: async () => {},
  disconnect: async () => {},
})

export function useAwarizonClientContext(): AwarizonClientContextValue {
  return useContext(AwarizonClientContext)
}
