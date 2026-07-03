import { Awarizon } from './core/Awarizon'
import { resolveWalletToAdapter } from './adapters/resolve'
import { getDefaultEndpoint, getDefaultMnemonic } from './utils/env'
import type { WalletConfig } from './adapters/resolve'
import type { WalletAdapter } from './adapters/types'

export type { WalletConfig }

export interface ClientConfig {
  endpoint?: string
  wallet?: string | WalletConfig
  network?: 'testnet' | 'mainnet' | string
}

export async function createClient(config: ClientConfig = {}): Promise<Awarizon> {
  const endpoint = config.endpoint ?? getDefaultEndpoint()
  const aw = new Awarizon(endpoint)

  let walletInput: string | WalletConfig | WalletAdapter | undefined = config.wallet

  // Fall back to env var mnemonic if no wallet provided
  if (!walletInput) {
    const envMnemonic = getDefaultMnemonic()
    if (envMnemonic) walletInput = envMnemonic
  }

  if (walletInput) {
    const adapter = await resolveWalletToAdapter(walletInput)
    await aw.connect(adapter)
  } else {
    // Read-only mode: connect core only, no wallet
    await aw.connect()
  }

  return aw
}
