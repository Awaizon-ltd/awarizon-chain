import { u8aToHex } from '@polkadot/util'
import { Provider } from './Provider'
import type { KeyringPair }
  from '@polkadot/keyring/types'
import { AwarizonError } from './errors'
import { isKeyringPair, type InjectedSigner, type SigningSource } from './utils'

export class Signer extends Provider {
  private _source: SigningSource

  private constructor(
    endpoint: string,
    source: SigningSource
  ) {
    super(endpoint)
    this._source = source
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

  // Connect using a browser-extension account (Polkadot.js, Talisman,
  // SubWallet, ...) — signs via the extension's injected signer instead
  // of a local keypair. `injectedSigner` is the `signer` field from
  // `web3FromAddress(address)` (@polkadot/extension-dapp).
  static async fromInjected(
    endpoint: string,
    address: string,
    injectedSigner: InjectedSigner
  ): Promise<Signer> {
    const signer = new Signer(
      endpoint, { address, signer: injectedSigner }
    )
    await signer._connect()
    return signer
  }

  protected async _connect(): Promise<void> {
    await super._connect()
    // Reinitialize modules with the signing source
    this._initModules(this._source)
  }

  get address(): string {
    return this._source.address
  }

  // Only available for local (mnemonic) wallets — a browser extension
  // never exposes its raw keypair.
  getPair(): KeyringPair | null {
    return isKeyringPair(this._source) ? this._source : null
  }

  // Sign a raw message. Only supported for local (mnemonic) wallets —
  // extension-backed signers must use their own signRaw flow, which is
  // async and out of scope here.
  signMessage(message: string): string {
    const pair = this.getPair()
    if (!pair) {
      throw new AwarizonError(
        'signMessage() requires a local wallet. ' +
        'Browser-extension accounts cannot sign raw messages here.',
        'NOT_SUPPORTED'
      )
    }
    const bytes = new TextEncoder().encode(message)
    const sig = pair.sign(bytes)
    return u8aToHex(sig)
  }
}
