import type { KeyringPair } from '@polkadot/keyring/types'
import type { WalletAdapter, ConnectedWallet } from './types'

export class PolkadotAdapter implements WalletAdapter {
  readonly type = 'polkadot'

  constructor(private readonly pair: KeyringPair) {}

  async connect(): Promise<ConnectedWallet> {
    return { address: this.pair.address, pair: this.pair }
  }
}
