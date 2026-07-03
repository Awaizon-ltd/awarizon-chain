import {
  mnemonicGenerate,
  mnemonicValidate,
  cryptoWaitReady,
} from '@polkadot/util-crypto'
import { Keyring } from '@polkadot/keyring'
import { u8aToHex } from '@polkadot/util'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { GeneratedWallet, WalletAccount } from '../types'

export class AwarizonKeyring {
  private keyring: Keyring

  constructor() {
    this.keyring = new Keyring({ type: 'sr25519', ss58Format: 42 })
  }

  async initialize(): Promise<void> {
    await cryptoWaitReady()
  }

  generate(wordCount: 12 | 24 = 12): GeneratedWallet {
    const mnemonic = mnemonicGenerate(wordCount)
    const pair = this.keyring.addFromMnemonic(mnemonic)
    return {
      mnemonic,
      address: pair.address,
      publicKey: u8aToHex(pair.publicKey),
    }
  }

  validate(mnemonic: string): boolean {
    return mnemonicValidate(mnemonic)
  }

  fromMnemonic(mnemonic: string): KeyringPair {
    if (!this.validate(mnemonic)) {
      throw new Error('Invalid mnemonic phrase')
    }
    return this.keyring.addFromMnemonic(mnemonic)
  }

  // Derive a child account. path examples: "//0", "//1", "//accountName"
  derive(mnemonic: string, path: string): KeyringPair {
    if (!this.validate(mnemonic)) {
      throw new Error('Invalid mnemonic phrase')
    }
    // Polkadot derivation: append path to mnemonic (e.g. "word1 ... word12//0")
    return this.keyring.addFromMnemonic(`${mnemonic}${path}`)
  }

  // Encrypt keypair to JSON string safe for storage
  encrypt(pair: KeyringPair, password: string): string {
    const json = pair.toJson(password)
    return JSON.stringify(json)
  }

  // Decrypt keypair from stored JSON string
  decrypt(encrypted: string, password: string): KeyringPair {
    try {
      const json = JSON.parse(encrypted)
      const pair = this.keyring.addFromJson(json)
      pair.decodePkcs8(password)
      return pair
    } catch {
      throw new Error(
        'Failed to decrypt wallet. Check your password and try again.'
      )
    }
  }

  getAccount(pair: KeyringPair): WalletAccount {
    return {
      address: pair.address,
      publicKey: u8aToHex(pair.publicKey),
    }
  }

  exportJson(pair: KeyringPair, password: string): string {
    return JSON.stringify(pair.toJson(password))
  }

  importJson(json: string, password: string): KeyringPair {
    try {
      const parsed = JSON.parse(json)
      const pair = this.keyring.addFromJson(parsed)
      pair.decodePkcs8(password)
      return pair
    } catch {
      throw new Error(
        'Failed to import wallet. Invalid backup file or wrong password.'
      )
    }
  }

  toAddress(publicKey: string): string {
    return this.keyring.encodeAddress(publicKey, 42)
  }
}
