import type { ApiPromise } from '@polkadot/api'
import type { Collection, CollectionConfig, CollectionStats } from '../types'
import { decodeData, signAndSend } from '../util'

function buildMintSettings(config: CollectionConfig) {
  return {
    mintType: config.mintType === 'Public' ? { public: null } : { issuer: null },
    price: config.mintPrice ?? null,
    startBlock: config.mintStartBlock ?? null,
    endBlock: config.mintEndBlock ?? null,
    defaultItemSettings: config.defaultItemSettings ?? 0,
  }
}

/**
 * pallet-nfts' `MintType` enum decodes via `.toJSON()` as
 * `{ issuer: null } | { public: null } | { holderOf: <collectionId> }`,
 * not a plain string — normalize it to a flat shape for consumers.
 */
function normalizeMintSettings(raw: any): import('../types').MintSettings | undefined {
  if (!raw) return undefined
  const mintType = raw.mintType ?? {}
  return {
    mintType: 'public' in mintType ? 'Public' : 'holderOf' in mintType ? 'HolderOf' : 'Issuer',
    holderOfCollectionId: 'holderOf' in mintType ? Number(mintType.holderOf) : undefined,
    price: raw.price ?? undefined,
    startBlock: raw.startBlock ?? undefined,
    endBlock: raw.endBlock ?? undefined,
    defaultItemSettings: raw.defaultItemSettings ?? 0,
  }
}

export class CollectionsModule {
  constructor(
    private api: ApiPromise,
    private pair: any | null,
  ) {}

  private requirePair() {
    if (!this.pair) throw new Error('Signer required for write operations')
    return this.pair
  }

  private async decorate(id: number, data: any): Promise<Collection> {
    const metaRaw = await (this.api.query as any).nfts.collectionMetadataOf(id)
    const meta = metaRaw.toJSON() as any
    const metadataUri = decodeData(meta?.data)

    const configRaw = await (this.api.query as any).nfts.collectionConfigOf(id)
    const config = configRaw.toJSON() as any

    return {
      id,
      owner: data.owner,
      items: data.items,
      itemMetadatas: data.itemMetadatas,
      itemConfigs: data.itemConfigs,
      attributes: data.attributes,
      metadataUri,
      maxSupply: config?.maxSupply ?? undefined,
      mintSettings: normalizeMintSettings(config?.mintSettings),
    }
  }

  /** Get all collections. */
  async getAll(): Promise<Collection[]> {
    const entries = await (this.api.query as any).nfts.collection.entries()
    const collections: Collection[] = []

    for (const [key, value] of entries) {
      const id = Number(key.args[0].toString())
      const data = value.toJSON() as any
      if (!data) continue
      collections.push(await this.decorate(id, data))
    }

    return collections
  }

  /** Get a single collection by ID. */
  async get(id: number): Promise<Collection | null> {
    const raw = await (this.api.query as any).nfts.collection(id)
    if (raw.isNone) return null
    const data = raw.unwrap().toJSON() as any
    return this.decorate(id, data)
  }

  /** Get collection stats. */
  async stats(id: number): Promise<CollectionStats> {
    const items = await this.getItems(id)
    const listed = items.filter(i => i.price)
    const prices = listed
      .map(i => BigInt(i.price ?? '0'))
      .sort((a, b) => (a < b ? -1 : 1))

    const owners = new Set(items.map(i => i.owner)).size

    return {
      collectionId: id,
      totalItems: items.length,
      listedItems: listed.length,
      floorPrice: prices[0]?.toString(),
      totalVolume: '0', // needs indexer
      owners,
    }
  }

  /** Get all items in a collection. */
  async getItems(collectionId: number) {
    const { ItemsModule } = await import('./items')
    const items = new ItemsModule(this.api, this.pair)
    return items.getByCollection(collectionId)
  }

  // ── Write methods ──────────────────────────

  /**
   * Create a new collection. pallet-nfts assigns the collection ID
   * automatically (via `NextCollectionId`) — it is not chosen by the
   * caller — so the assigned ID is read back from the `Created` event
   * and returned alongside the tx hash. `admin` defaults to the signer.
   */
  async create(
    config: CollectionConfig = { mintType: 'Issuer' },
    admin?: string,
  ): Promise<{ txHash: string; collectionId: number }> {
    const pair = this.requirePair()
    const palletConfig = {
      settings: 0,
      maxSupply: config.maxSupply ?? null,
      mintSettings: buildMintSettings(config),
    }

    const tx = (this.api.tx as any).nfts.create(admin ?? pair.address, palletConfig)
    const { txHash, events } = await signAndSend(this.api, tx, pair)

    const created = events
      .map((r: any) => r.event)
      .find((e: any) => e.section === 'nfts' && e.method === 'Created')
    const collectionId = created ? Number(created.data[0].toString()) : NaN

    return { txHash, collectionId }
  }

  /**
   * Set collection metadata. `dataUri` should be the URI returned by
   * off-chain metadata storage (hosted by the caller) — never the raw metadata
   * JSON, which will exceed the on-chain StringLimit.
   */
  async setMetadata(collectionId: number, dataUri: string): Promise<{ txHash: string }> {
    const pair = this.requirePair()
    const tx = (this.api.tx as any).nfts.setCollectionMetadata(collectionId, dataUri)
    return signAndSend(this.api, tx, pair)
  }

  /** Set collection max supply. */
  async setMaxSupply(collectionId: number, maxSupply: number): Promise<{ txHash: string }> {
    const pair = this.requirePair()
    const tx = (this.api.tx as any).nfts.setCollectionMaxSupply(collectionId, maxSupply)
    return signAndSend(this.api, tx, pair)
  }

  /**
   * Update mint price and/or mint time window (`mintStartBlock`/`mintEndBlock`)
   * for an existing collection. pallet-nfts enforces the window on-chain —
   * `mint()` fails with `MintNotStarted`/`MintEnded` outside it. This replaces
   * the whole mint-settings struct, so pass the full desired config, not just
   * the field you're changing.
   */
  async updateMintSettings(
    collectionId: number,
    config: CollectionConfig,
  ): Promise<{ txHash: string }> {
    const pair = this.requirePair()
    const tx = (this.api.tx as any).nfts.updateMintSettings(collectionId, buildMintSettings(config))
    return signAndSend(this.api, tx, pair)
  }

  /** Transfer collection ownership. */
  async transferOwnership(collectionId: number, newOwner: string): Promise<{ txHash: string }> {
    const pair = this.requirePair()
    const tx = (this.api.tx as any).nfts.transferOwnership(collectionId, newOwner)
    return signAndSend(this.api, tx, pair)
  }
}
