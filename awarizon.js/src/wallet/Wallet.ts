import { AwarizonKeyring } from '@awarizon/core'
import type { KeyringPair } from '@polkadot/keyring/types'

export interface GeneratedWallet {
  address: string
  encrypted: string
  backup: () => string[]
}

export interface RestoredWallet {
  address: string
  encrypted: string
}

export class Wallet {
  private static async keyring(): Promise<AwarizonKeyring> {
    const k = new AwarizonKeyring()
    await k.initialize()
    return k
  }

  static async createRandom(password: string): Promise<GeneratedWallet> {
    const k = await Wallet.keyring()
    const generated = k.generate()
    const pair = k.fromMnemonic(generated.mnemonic)
    const encrypted = k.encrypt(pair, password)

    let backupUsed = false
    const words = generated.mnemonic.split(' ')

    return {
      address: pair.address,
      encrypted,
      backup(): string[] {
        if (backupUsed) {
          throw new Error(
            'Recovery phrase already accessed. ' +
            'For security, it can only be shown once. ' +
            'If you need to recover your wallet, use the encrypted backup.'
          )
        }
        backupUsed = true
        const result = [...words]
        words.fill('')
        return result
      },
    }
  }

  static async fromEncryptedJson(
    encrypted: string,
    password: string
  ): Promise<RestoredWallet & { getPair: () => KeyringPair }> {
    const k = await Wallet.keyring()
    const pair = k.decrypt(encrypted, password)

    return {
      address: pair.address,
      encrypted,
      getPair: () => pair,
    }
  }

  static async fromMnemonic(mnemonic: string, password: string): Promise<RestoredWallet> {
    const k = await Wallet.keyring()
    const pair = k.fromMnemonic(mnemonic)
    const encrypted = k.encrypt(pair, password)

    return {
      address: pair.address,
      encrypted,
    }
  }
}
