import type { ApiPromise } from '@polkadot/api'
import type { SigningSource } from '../utils'
import { u8aToHex, u8aConcat, stringToU8a } from '@polkadot/util'
import { decodeAddress } from '@polkadot/util-crypto'
import { getLinkedAddresses, type LinkedAddress } from '@awarizon/sdk'
import { AwarizonError } from '../errors'
import { resolveAddress, submitAndWait, type TxResult } from '../utils'

export type { LinkedAddress }

// Message format matches pallets/awarizon-links/src/lib.rs exactly:
// b"Link to Awarizon: " + AccountId32 SCALE-encoded bytes (32 raw bytes).
// The pallet verifies the EVM/Solana signature against these exact bytes,
// not a human-readable string — returned as hex so callers sign the raw
// bytes (e.g. `wallet.signMessage(hexToU8a(message))` in ethers.js).
function linkMessage(address: string): string {
  const prefix = stringToU8a('Link to Awarizon: ')
  const accountBytes = decodeAddress(address)
  return u8aToHex(u8aConcat(prefix, accountBytes))
}

export class LinksModule {
  constructor(
    private api: ApiPromise,
    private pair: SigningSource | null
  ) {}

  // READ — works without keypair (pair can be null)
  async list(address?: string): Promise<LinkedAddress[]> {
    const addr = address
      ? await resolveAddress(address, this.api)
      : this._ownAddress()
    return getLinkedAddresses(this.api, addr)
  }

  evmMessage(awarizonAddress?: string): string {
    return linkMessage(awarizonAddress ?? this._ownAddress())
  }

  solanaMessage(awarizonAddress?: string): string {
    return linkMessage(awarizonAddress ?? this._ownAddress())
  }

  // WRITE (pair required)
  async linkEvm(evmAddress: string, signature: string): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = (this.api.tx as any).awarizonLinks.linkEvmAddress(evmAddress, signature)
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  async linkSolana(pubkey: string, signature: string): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = (this.api.tx as any).awarizonLinks.linkSolanaAddress(pubkey, signature)
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  async unlink(chain: 'EVM' | 'Solana'): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = (this.api.tx as any).awarizonLinks.unlinkAddress(chain)
    return submitAndWait(extrinsic, this.pair, this.api)
  }

  private _ownAddress(): string {
    if (!this.pair) throw AwarizonError.notSigned()
    return this.pair.address
  }
}
