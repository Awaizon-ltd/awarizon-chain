import { AwarizonError } from '../errors'
import type { WalletAdapter, ConnectedWallet } from './types'

export class WalletConnectAdapter implements WalletAdapter {
  readonly type = 'walletconnect'

  async connect(): Promise<ConnectedWallet> {
    throw new AwarizonError(
      'NOT_SUPPORTED',
      'WalletConnectAdapter is not yet implemented. Use MnemonicAdapter or PolkadotAdapter instead.'
    )
  }
}
