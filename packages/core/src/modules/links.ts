import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import { getLinkedAddresses, signAndSend } from '@awarizon/sdk'
import type { ChainType, LinkedAddress, TxResult } from '../types'

export class LinksModule {
  constructor(private api: ApiPromise) {}

  buildEvmLinkMessage(awarizonAddress: string): string {
    return `Link to Awarizon: ${awarizonAddress}`
  }

  buildSolanaLinkMessage(awarizonAddress: string): string {
    return `Link to Awarizon: ${awarizonAddress}`
  }

  async linkEvm(params: {
    evmAddress: string
    signature: string
    signer: KeyringPair
  }): Promise<TxResult> {
    const addrBytes = hexToBytes20(params.evmAddress)
    const sigBytes = hexToBytes65(params.signature)
    const ext = this.api.tx.awarizonLinks.linkEvmAddress(addrBytes, sigBytes)
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }

  async linkSolana(params: {
    solanaPubkey: string
    signature: string
    signer: KeyringPair
  }): Promise<TxResult> {
    const pubkeyBytes = base58ToBytes32(params.solanaPubkey)
    const sigBytes = base64ToBytes64(params.signature)
    const ext = this.api.tx.awarizonLinks.linkSolanaAddress(pubkeyBytes, sigBytes)
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }

  async unlink(params: {
    chain: ChainType
    signer: KeyringPair
  }): Promise<TxResult> {
    const ext = this.api.tx.awarizonLinks.unlinkAddress(params.chain)
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }

  async list(address: string): Promise<LinkedAddress[]> {
    return getLinkedAddresses(this.api, address)
  }
}

function hexToBytes20(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, '')
  if (clean.length !== 40) throw new Error('EVM address must be 20 bytes (40 hex chars)')
  return Uint8Array.from(Buffer.from(clean, 'hex'))
}

function hexToBytes65(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, '')
  if (clean.length !== 130) throw new Error('Signature must be 65 bytes (130 hex chars)')
  return Uint8Array.from(Buffer.from(clean, 'hex'))
}

function base58ToBytes32(b58: string): Uint8Array {
  // Simplified: expect hex input prefixed with 0x for now
  if (b58.startsWith('0x') || b58.startsWith('0X')) {
    const clean = b58.slice(2)
    return Uint8Array.from(Buffer.from(clean.padStart(64, '0'), 'hex'))
  }
  throw new Error('Solana pubkey must be provided as 0x-prefixed hex (32 bytes)')
}

function base64ToBytes64(b64: string): Uint8Array {
  const buf = Buffer.from(b64, 'base64')
  if (buf.length !== 64) throw new Error('Ed25519 signature must be 64 bytes')
  return Uint8Array.from(buf)
}
