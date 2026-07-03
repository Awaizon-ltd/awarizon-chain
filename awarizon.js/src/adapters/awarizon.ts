import { AwarizonError } from '../errors'
import type { WalletAdapter, ConnectedWallet } from './types'

export class AwarizonWalletAdapter implements WalletAdapter {
  readonly type = 'awarizon'

  async connect(): Promise<ConnectedWallet> {
    throw new AwarizonError(
      'NOT_SUPPORTED',
      'AwarizonWalletAdapter is not yet implemented. Use MnemonicAdapter instead.'
    )
  }
}
