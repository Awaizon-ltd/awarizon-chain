import { u8aToHex } from '@polkadot/util'
import { Provider } from './Provider'
import type { KeyringPair }
  from '@polkadot/keyring/types'

export class Signer extends Provider {
  private _pair: KeyringPair

  private constructor(
    endpoint: string,
    pair: KeyringPair
  ) {
    super(endpoint)
    this._pair = pair
  }

  // Internal factory — called by Wallet.connect()
  static async _create(
    endpoint: string,
    pair: KeyringPair
  ): Promise<Signer> {
    const signer = new Signer(endpoint, pair)
    await signer._connect()
    return signer
  }

  protected async _connect(): Promise<void> {
    await super._connect()
    // Reinitialize modules with keypair
    this._initModules(this._pair)
  }

  get address(): string {
    return this._pair.address
  }

  getPair(): KeyringPair {
    return this._pair
  }

  // Sign a raw message
  signMessage(message: string): string {
    const bytes = new TextEncoder().encode(message)
    const sig = this._pair.sign(bytes)
    return u8aToHex(sig)
  }
}
