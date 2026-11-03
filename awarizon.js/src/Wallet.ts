import {
  mnemonicGenerate,
  mnemonicValidate,
  cryptoWaitReady,
} from '@polkadot/util-crypto'
import { Keyring } from '@polkadot/keyring'
import { u8aToHex } from '@polkadot/util'
import type { KeyringPair } from '@polkadot/keyring/types'
import { AwarizonError } from './errors'
import type { Signer } from './Signer'

// Called once before any crypto operation
let ready = false
async function ensureReady(): Promise<void> {
  if (ready) return
  await cryptoWaitReady()
  ready = true
}

export class Wallet {
  // Public readable properties — like ethers.js
  // Always available, never hidden
  readonly mnemonic: string
  readonly address: string
  readonly publicKey: string

  // Internal — not exposed directly
  private readonly _pair: KeyringPair

  private constructor(
    mnemonic: string,
    pair: KeyringPair
  ) {
    this.mnemonic = mnemonic
    this.address = pair.address
    this.publicKey = u8aToHex(pair.publicKey)
    this._pair = pair
  }

  // ─── STATIC CREATORS ─────────────────────────
  // All synchronous after ensureReady() called once

  // Create a new random wallet
  // Exactly like ethers.js Wallet.createRandom()
  // mnemonic.phrase is always accessible
  static async createRandom(
    wordCount: 12 | 24 = 12
  ): Promise<Wallet> {
    await ensureReady()
    const mnemonic = mnemonicGenerate(wordCount)
    const pair = Wallet._pairFromMnemonic(mnemonic)
    return new Wallet(mnemonic, pair)
  }

  // Restore from mnemonic phrase
  // Like ethers.js Wallet.fromPhrase()
  static async fromMnemonic(
    phrase: string
  ): Promise<Wallet> {
    await ensureReady()
    // Substrate URI syntax allows derivation paths after
    // the phrase (e.g. "...walk//Bob") — validate only the
    // base words, not the derivation suffix.
    const basePhrase = phrase.split('/')[0].trim()
    if (!mnemonicValidate(basePhrase)) {
      throw new AwarizonError(
        'Invalid mnemonic phrase. ' +
        'Check all words and try again.',
        'INVALID_MNEMONIC'
      )
    }
    const pair = Wallet._pairFromMnemonic(phrase)
    return new Wallet(phrase, pair)
  }

  // ─── OPTIONAL ENCRYPTION ─────────────────────
  // Like ethers.js wallet.encrypt()
  // Slow — developer calls this with their own
  // loading UI. Progress callback optional.

  async encrypt(
    password: string,
    progress?: (percent: number) => void
  ): Promise<string> {
    // Report 0% immediately
    progress?.(0)

    // Polkadot uses a different encryption scheme
    // than ethers.js but same concept:
    // PBKDF2/scrypt + AES encryption
    const json = this._pair.toJson(password)

    // Report 100% when done
    progress?.(100)

    return JSON.stringify(json)
  }

  // Restore from encrypted JSON
  // Like ethers.js Wallet.fromEncryptedJson()
  static async fromEncryptedJson(
    json: string,
    password: string,
    progress?: (percent: number) => void
  ): Promise<Wallet> {
    await ensureReady()
    progress?.(0)

    try {
      const keyring = new Keyring({
        type: 'sr25519',
        ss58Format: 42
      })
      const parsed = JSON.parse(json)
      const pair = keyring.addFromJson(parsed)
      pair.decodePkcs8(password)

      progress?.(100)

      // Recover mnemonic from JSON if stored
      // Polkadot JSON does not store mnemonic by default
      // so mnemonic will be empty string when restoring
      // from encrypted JSON — this matches ethers.js
      // behavior where fromEncryptedJson loses the mnemonic
      return new Wallet('', pair)
    } catch {
      throw new AwarizonError(
        'Failed to decrypt wallet. ' +
        'Check your password and try again.',
        'WRONG_PASSWORD'
      )
    }
  }

  // ─── CHAIN CONNECTION ─────────────────────────
  // Connect to Awarizon chain — returns a Signer
  // Like ethers.js wallet.connect(provider)

  async connect(
    endpoint?: string
  ): Promise<Signer> {
    const ep = endpoint
      ?? getDefaultEndpoint()
    const { Signer } = await import('./Signer')
    return Signer._create(ep, this._pair)
  }

  // ─── INTERNAL ────────────────────────────────

  private static _pairFromMnemonic(
    mnemonic: string
  ): KeyringPair {
    const keyring = new Keyring({
      type: 'sr25519',
      ss58Format: 42
    })
    return keyring.addFromMnemonic(mnemonic)
  }

  // Internal access for Signer creation
  _getPair(): KeyringPair {
    return this._pair
  }
}

function getDefaultEndpoint(): string {
  if (typeof process !== 'undefined') {
    return process.env.AWARIZON_ENDPOINT
      ?? 'wss://rpc.awarizon.com'
  }
  return 'wss://rpc.awarizon.com'
}
