import type { ApiPromise } from '@polkadot/api'
import type { NFTItem } from '../types'
import { decodeData, signAndSend } from '../util'

export class ItemsModule {
  constructor(
    private api: ApiPromise,
    private pair: any | null,
  ) {}

  private requirePair() {
    if (!this.pair) throw new Error('Signer required for write operations')
    return this.pair
  }

  /** Get a single NFT item. */
  async get(collectionId: number, itemId: number): Promise<NFTItem | null> {
    const raw = await (this.api.query as any).nfts.item(collectionId, itemId)
    if (raw.isNone) return null

    const data = raw.unwrap().toJSON() as any

    const metaRaw = await (this.api.query as any).nfts.itemMetadataOf(collectionId, itemId)
    const meta = metaRaw.toJSON() as any

    const priceRaw = await (this.api.query as any).nfts.itemPriceOf(collectionId, itemId)
    const price = priceRaw.toJSON() as any

    return {
      collectionId,
      itemId,
      owner: data.owner,
      approved: data.approvals?.[0]?.[0] ?? undefined,
      transferLocked: false,
      price: price?.[0]?.toString() ?? undefined,
      metadataUri: decodeData(meta?.data),
    }
  }

  /** Get all items in a collection. */
  async getByCollection(collectionId: number): Promise<NFTItem[]> {
    const entries = await (this.api.query as any).nfts.item.entries(collectionId)
    const items: NFTItem[] = []

    for (const [key, value] of entries) {
      const itemId = Number(key.args[1].toString())
      const data = value.toJSON() as any
      if (!data) continue

      const priceRaw = await (this.api.query as any).nfts.itemPriceOf(collectionId, itemId)
      const price = priceRaw.toJSON() as any

      const metaRaw = await (this.api.query as any).nfts.itemMetadataOf(collectionId, itemId)
      const meta = metaRaw.toJSON() as any

      items.push({
        collectionId,
        itemId,
        owner: data.owner,
        transferLocked: false,
        price: price?.[0]?.toString() ?? undefined,
        metadataUri: decodeData(meta?.data),
      })
    }

    return items
  }

  /** Get all NFTs owned by an address. */
  async getOwned(address: string): Promise<NFTItem[]> {
    const entries = await (this.api.query as any).nfts.account.entries(address)
    const items: NFTItem[] = []

    for (const [key] of entries) {
      const collectionId = Number(key.args[1].toString())
      const itemId = Number(key.args[2].toString())
      const item = await this.get(collectionId, itemId)
      if (item) items.push(item)
    }

    return items
  }

  // ── Write methods ──────────────────────────

  /** Submit the bare pallet-nfts `mint` extrinsic (no metadata — that's a separate on-chain call). */
  private async mintItem(
    collectionId: number,
    itemId: number,
    to?: string,
  ): Promise<{ txHash: string }> {
    const pair = this.requirePair()
    const mintTo = to ?? pair.address
    const tx = (this.api.tx as any).nfts.mint(collectionId, itemId, mintTo, null)
    return signAndSend(this.api, tx, pair)
  }

  /**
   * Set item metadata. `dataUri` should be a URI pointing to off-chain
   * metadata (hosted by the caller) — never the raw metadata JSON,
   * which will exceed the on-chain StringLimit.
   */
  async setMetadata(
    collectionId: number,
    itemId: number,
    dataUri: string,
  ): Promise<{ txHash: string }> {
    const pair = this.requirePair()
    const tx = (this.api.tx as any).nfts.setMetadata(collectionId, itemId, dataUri)
    return signAndSend(this.api, tx, pair)
  }

  /** Set item attribute. */
  async setAttribute(
    collectionId: number,
    itemId: number,
    key: string,
    value: string,
  ): Promise<{ txHash: string }> {
    const pair = this.requirePair()
    const tx = (this.api.tx as any).nfts.setAttribute(
      collectionId,
      itemId,
      { itemOwner: null },
      key,
      value,
    )
    return signAndSend(this.api, tx, pair)
  }

  /** Transfer NFT to another address. */
  async transfer(collectionId: number, itemId: number, to: string): Promise<{ txHash: string }> {
    const pair = this.requirePair()
    const tx = (this.api.tx as any).nfts.transfer(collectionId, itemId, to)
    return signAndSend(this.api, tx, pair)
  }

  /** Burn (destroy) an NFT. */
  async burn(collectionId: number, itemId: number): Promise<{ txHash: string }> {
    const pair = this.requirePair()
    const tx = (this.api.tx as any).nfts.burn(collectionId, itemId)
    return signAndSend(this.api, tx, pair)
  }

  /**
   * Mint a new NFT item and set its metadata in one call. `metadataUri`
   * must already point to off-chain metadata — hosting the image and
   * building/storing the metadata JSON is the caller's responsibility.
   */
  async mint(
    collectionId: number,
    itemId: number,
    metadataUri: string,
    to?: string,
  ): Promise<{ txHash: string }> {
    await this.mintItem(collectionId, itemId, to)
    return this.setMetadata(collectionId, itemId, metadataUri)
  }
}
