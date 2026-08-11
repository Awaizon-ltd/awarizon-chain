import type { ApiPromise } from '@polkadot/api'
import type { Listing, SwapPrice } from '../types'
import { decodeData, formatRiz, signAndSend } from '../util'

export class MarketplaceModule {
  constructor(
    private api: ApiPromise,
    private pair: any | null,
  ) {}

  private requirePair() {
    if (!this.pair) throw new Error('Signer required for write operations')
    return this.pair
  }

  /** Get all active listings across all collections. */
  async getListings(): Promise<Listing[]> {
    const entries = await (this.api.query as any).nfts.itemPriceOf.entries()
    const listings: Listing[] = []

    for (const [key, value] of entries) {
      const price = value.toJSON() as any
      if (!price) continue

      const collectionId = Number(key.args[0].toString())
      const itemId = Number(key.args[1].toString())

      const itemRaw = await (this.api.query as any).nfts.item(collectionId, itemId)
      if (itemRaw.isNone) continue
      const item = itemRaw.unwrap().toJSON() as any

      const metaRaw = await (this.api.query as any).nfts.itemMetadataOf(collectionId, itemId)
      const meta = metaRaw.toJSON() as any

      const pricePlanck = BigInt(price[0]?.toString() ?? '0')

      listings.push({
        collectionId,
        itemId,
        seller: item.owner,
        price: pricePlanck.toString(),
        priceRiz: formatRiz(pricePlanck),
        buyer: price[1] ?? undefined,
        metadataUri: decodeData(meta?.data),
      })
    }

    return listings
  }

  /** Get listings for a specific collection. */
  async getListingsByCollection(collectionId: number): Promise<Listing[]> {
    const all = await this.getListings()
    return all.filter(l => l.collectionId === collectionId)
  }

  /** Get listings by a specific seller. */
  async getListingsBySeller(seller: string): Promise<Listing[]> {
    const all = await this.getListings()
    return all.filter(l => l.seller === seller)
  }

  /** Get floor price for a collection. */
  async getFloorPrice(collectionId: number): Promise<bigint | null> {
    const listings = await this.getListingsByCollection(collectionId)
    if (!listings.length) return null

    const prices = listings.map(l => BigInt(l.price)).sort((a, b) => (a < b ? -1 : 1))
    return prices[0]
  }

  // ── Write methods ──────────────────────────

  /** List an NFT for sale. price: amount in planck (RIZ). buyer: optional — restrict to specific buyer. */
  async list(
    collectionId: number,
    itemId: number,
    price: bigint,
    buyer?: string,
  ): Promise<{ txHash: string }> {
    const pair = this.requirePair()
    const tx = (this.api.tx as any).nfts.setPrice(collectionId, itemId, price, buyer ?? null)
    return signAndSend(this.api, tx, pair)
  }

  /** Delist an NFT (remove from sale) by clearing its price. */
  async delist(collectionId: number, itemId: number): Promise<{ txHash: string }> {
    const pair = this.requirePair()
    const tx = (this.api.tx as any).nfts.setPrice(collectionId, itemId, null, null)
    return signAndSend(this.api, tx, pair)
  }

  /** Buy a listed NFT. bidPrice: max price willing to pay (planck). */
  async buy(collectionId: number, itemId: number, bidPrice: bigint): Promise<{ txHash: string }> {
    const pair = this.requirePair()
    const tx = (this.api.tx as any).nfts.buyItem(collectionId, itemId, bidPrice)
    return signAndSend(this.api, tx, pair)
  }

  /**
   * Create an NFT swap offer. `durationBlocks` is required by pallet-nfts
   * (the offer expires after this many blocks) and is capped at runtime by
   * NftsMaxDeadlineDuration.
   */
  async createSwap(
    offeredCollectionId: number,
    offeredItemId: number,
    desiredCollectionId: number,
    durationBlocks: number,
    desiredItemId?: number,
    price?: SwapPrice,
  ): Promise<{ txHash: string }> {
    const pair = this.requirePair()

    const priceParam = price
      ? {
          amount: price.amount,
          direction: price.direction === 'send' ? { send: null } : { receive: null },
        }
      : null

    const tx = (this.api.tx as any).nfts.createSwap(
      offeredCollectionId,
      offeredItemId,
      desiredCollectionId,
      desiredItemId ?? null,
      priceParam,
      durationBlocks,
    )
    return signAndSend(this.api, tx, pair)
  }

  /** Cancel a swap offer. */
  async cancelSwap(collectionId: number, itemId: number): Promise<{ txHash: string }> {
    const pair = this.requirePair()
    const tx = (this.api.tx as any).nfts.cancelSwap(collectionId, itemId)
    return signAndSend(this.api, tx, pair)
  }
}
