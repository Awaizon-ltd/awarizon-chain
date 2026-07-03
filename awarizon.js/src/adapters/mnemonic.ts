import { AwarizonKeyring } from '@awarizon/core'
import { AwarizonError } from '../errors'
import type { WalletAdapter, ConnectedWallet } from './types'

export class MnemonicAdapter implements WalletAdapter {
  readonly type = 'mnemonic'

  constructor(private readonly mnemonic: string) {}

  async connect(): Promise<ConnectedWallet> {
    const keyring = new AwarizonKeyring()
    await keyring.initialize()

    if (!keyring.validate(this.mnemonic)) {
      throw new AwarizonError('INVALID_MNEMONIC', 'Invalid mnemonic phrase. Check all words and try again.')
    }

    const pair = keyring.fromMnemonic(this.mnemonic)
    return { address: pair.address, pair }
  }
}
