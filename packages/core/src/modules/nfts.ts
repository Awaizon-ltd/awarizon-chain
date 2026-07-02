import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import { signAndSend } from '@awarizon/sdk'
import type { NFTItem, TxResult } from '../types'

export class NFTsModule {
  constructor(private api: ApiPromise) {}

  async createCollection(params: {
    collectionId: number
    admin: string
    signer: KeyringPair
  }): Promise<TxResult & { collectionId: number }> {
    // pallet_nfts: create(collection, admin, config)
    const ext = (this.api.tx.nfts as any).create(
      params.collectionId,
      params.admin,
      {}  // CollectionConfig — defaults suffice for basic usage
    )
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true, collectionId: params.collectionId }
  }

  async mint(params: {
    collection: number
    itemId: number
    owner: string
    signer: KeyringPair
  }): Promise<TxResult> {
    // pallet_nfts: mint(collection, item, mint_to, witness_data)
    const ext = (this.api.tx.nfts as any).mint(
      params.collection,
      params.itemId,
      params.owner,
      null  // witness_data (None)
    )
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }

  async transfer(params: {
    collection: number
    item: number
    to: string
    signer: KeyringPair
  }): Promise<TxResult> {
    const ext = (this.api.tx.nfts as any).transfer(params.collection, params.item, params.to)
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }

  async burn(params: {
    collection: number
    item: number
    signer: KeyringPair
  }): Promise<TxResult> {
    const ext = (this.api.tx.nfts as any).burn(params.collection, params.item)
    const result = await signAndSend(this.api, ext, params.signer)
    return { hash: result.blockHash, blockNumber: 0, success: true }
  }

  async ownerOf(params: { collection: number; item: number }): Promise<string | null> {
    const raw = await (this.api.query.nfts as any).item(params.collection, params.item)
    const json = raw.toJSON() as Record<string, unknown> | null
    if (!json) return null
    return String(json.owner ?? '')
  }

  async list(address: string): Promise<NFTItem[]> {
    // pallet_nfts stores ownership in Account storage: (owner, collection, item)
    const entries = await (this.api.query.nfts as any).account.entries(address)
    const items: NFTItem[] = []

    for (const [key] of entries) {
      const [, collection, item] = key.args as [unknown, number, number]
      items.push({
        collection: Number(collection),
        item: Number(item),
        owner: address,
        metadata: {},
      })
    }

    return items
  }
}
