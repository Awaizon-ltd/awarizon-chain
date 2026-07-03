import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import {
  buildCreateAsset,
  buildMintAsset,
  buildTransferAsset,
  signAndSend,
} from '@awarizon/sdk'
import type { Asset, AssetBalance, TxResult } from '../types'

export class AssetsModule {
  constructor(private api: ApiPromise) {}

  async create(params: {
    id: number
    admin: string
    minBalance: bigint
    signer: KeyringPair
  }): Promise<TxResult & { assetId: number }> {
    const ext = buildCreateAsset(this.api, params.id, params.admin, params.minBalance)
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true, assetId: params.id }
  }

  async mint(params: {
    assetId: number
    to: string
    amount: bigint
    signer: KeyringPair
  }): Promise<TxResult> {
    const ext = buildMintAsset(this.api, params.assetId, params.to, params.amount)
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }

  async transfer(params: {
    assetId: number
    to: string
    amount: bigint
    signer: KeyringPair
  }): Promise<TxResult> {
    const ext = buildTransferAsset(this.api, params.assetId, params.to, params.amount)
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }

  async burn(params: {
    assetId: number
    who: string
    amount: bigint
    signer: KeyringPair
  }): Promise<TxResult> {
    const ext = (this.api.tx.assets as any).burn(params.assetId, params.who, params.amount)
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }

  async balance(params: { assetId: number; address: string }): Promise<AssetBalance> {
    const raw = await (this.api.query.assets as any).account(params.assetId, params.address)
    const json = raw.toJSON() as Record<string, unknown> | null
    const balRaw = BigInt(json?.balance?.toString() ?? '0')
    return {
      assetId: params.assetId,
      symbol: String(params.assetId),
      balance: balRaw.toString(),
      balanceRaw: balRaw,
    }
  }

  async metadata(assetId: number): Promise<{ name: string; symbol: string; decimals: number }> {
    const raw = await (this.api.query.assets as any).metadata(assetId)
    const json = raw.toJSON() as Record<string, unknown>
    return {
      name: String(json.name ?? ''),
      symbol: String(json.symbol ?? ''),
      decimals: Number(json.decimals ?? 0),
    }
  }

  async info(assetId: number): Promise<Asset | null> {
    const raw = await (this.api.query.assets as any).asset(assetId)
    const json = raw.toJSON() as Record<string, unknown> | null
    if (!json) return null
    const meta = await this.metadata(assetId)
    return {
      id: assetId,
      name: meta.name,
      symbol: meta.symbol,
      decimals: meta.decimals,
      supply: String(json.supply ?? '0'),
      owner: String(json.owner ?? ''),
    }
  }
}
