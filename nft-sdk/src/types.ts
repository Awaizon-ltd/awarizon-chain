// ── Collection types ─────────────────────────

export interface CollectionConfig {
  /** Maximum number of items in collection. undefined = unlimited */
  maxSupply?: number
  /** Who can mint items. 'Issuer' = only collection issuer, 'Public' = anyone */
  mintType: 'Issuer' | 'Public'
  /** Price to mint, in planck (undefined = free) */
  mintPrice?: bigint
  /** Block number minting opens at (undefined = no lower bound) */
  mintStartBlock?: number
  /** Block number minting closes at (undefined = no upper bound) */
  mintEndBlock?: number
  /** Default item settings bitflag */
  defaultItemSettings?: number
}

export interface Collection {
  id: number
  owner: string
  items: number
  itemMetadatas: number
  itemConfigs: number
  attributes: number
  /** URI pointing to off-chain metadata, hosted by the caller */
  metadataUri?: string
  maxSupply?: number
  mintSettings?: MintSettings
}

export interface MintSettings {
  mintType: 'Issuer' | 'Public' | 'HolderOf'
  /** Collection ID required to mint, when mintType is 'HolderOf' */
  holderOfCollectionId?: number
  price?: string // planck
  startBlock?: number
  endBlock?: number
  defaultItemSettings: number
}

// ── Item types ───────────────────────────────

export interface NFTAttribute {
  key: string
  value: string
}

export interface NFTItem {
  collectionId: number
  itemId: number
  owner: string
  approved?: string
  transferLocked: boolean
  /** Current listing price in planck, if listed */
  price?: string
  /** URI pointing to off-chain metadata, hosted by the caller */
  metadataUri?: string
}

// ── Marketplace types ────────────────────────

export interface Listing {
  collectionId: number
  itemId: number
  seller: string
  price: string
  priceRiz: string
  /** Restricted buyer (undefined = anyone can buy) */
  buyer?: string
  metadataUri?: string
}

export interface Sale {
  collectionId: number
  itemId: number
  seller: string
  buyer: string
  price: string
  blockNumber: number
}

export interface CollectionStats {
  collectionId: number
  totalItems: number
  listedItems: number
  floorPrice?: string
  totalVolume: string
  owners: number
}

// ── Swap types ───────────────────────────────

export interface SwapPrice {
  amount: bigint
  direction: 'send' | 'receive'
}
