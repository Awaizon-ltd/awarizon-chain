import { AwarizonError } from '../errors'
import type { WalletAdapter, ConnectedWallet } from './types'

export class AutoAdapter implements WalletAdapter {
  readonly type = 'auto'

  async connect(): Promise<ConnectedWallet> {
    return autoDetectAdapter().then(a => a.connect())
  }
}

export async function autoDetectAdapter(): Promise<WalletAdapter> {
  throw new AwarizonError(
    'NOT_SUPPORTED',
    'No wallet auto-detected. Use MnemonicAdapter for Node.js/React Native, or AwarizonProvider from awarizon.js/react for web apps.'
  )
}
