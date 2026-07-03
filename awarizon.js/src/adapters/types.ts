import type { KeyringPair } from '@polkadot/keyring/types'

export interface ConnectedWallet {
  address: string
  pair: KeyringPair
}

export interface WalletAdapter {
  readonly type: string
  connect(): Promise<ConnectedWallet>
  disconnect?(): Promise<void>
}
