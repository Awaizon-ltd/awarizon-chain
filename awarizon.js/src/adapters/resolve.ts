import { AwarizonKeyring } from '@awarizon/core'
import { MnemonicAdapter } from './mnemonic'
import { KeypairAdapter } from './keypair'
import { AwarizonWalletAdapter } from './awarizon'
import { autoDetectAdapter } from './auto'
import type { WalletAdapter } from './types'

export interface WalletConfig {
  mnemonic?: string
  encrypted?: string
  password?: string
  extension?: 'auto' | 'polkadot' | 'metamask' | 'awarizon' | string
  adapter?: WalletAdapter
}

export async function resolveWalletToAdapter(
  wallet: string | WalletConfig | WalletAdapter
): Promise<WalletAdapter> {
  // Plain string = treat as mnemonic
  if (typeof wallet === 'string') {
    return new MnemonicAdapter(wallet)
  }

  // Already a WalletAdapter (has 'type' and 'connect')
  if ('type' in wallet && typeof (wallet as WalletAdapter).connect === 'function') {
    return wallet as WalletAdapter
  }

  const cfg = wallet as WalletConfig

  if (cfg.adapter) return cfg.adapter

  if (cfg.mnemonic) return new MnemonicAdapter(cfg.mnemonic)

  if (cfg.encrypted && cfg.password) {
    const keyring = new AwarizonKeyring()
    await keyring.initialize()
    const pair = keyring.decrypt(cfg.encrypted, cfg.password)
    return new KeypairAdapter(pair)
  }

  if (cfg.extension) {
    if (cfg.extension === 'awarizon') return new AwarizonWalletAdapter()
    // 'polkadot' | 'auto' | 'metamask' | unknown — fall through to auto-detect
    // (MetaMaskAdapter is for EVM linking only, not Substrate tx signing)
    return autoDetectAdapter()
  }

  return autoDetectAdapter()
}
