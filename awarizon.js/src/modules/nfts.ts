import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import { AwarizonError } from '../errors'
import { resolveAddress, submitAndWait, type TxResult } from '../utils'

// Default pallet_nfts CollectionConfig: no restrictions, admin-only minting.
const DEFAULT_COLLECTION_CONFIG = {
  settings: 0,
  maxSupply: null,
  mintSettings: {
    mintType: 'Issuer',
    price: null,
    startBlock: null,
    endBlock: null,
    defaultItemSettings: 0,
  },
}

export class NFTsModule {
  constructor(
    private api: ApiPromise,
    private pair: KeyringPair | null
  ) {}

  // READ — works without keypair (pair can be null)
  async ownerOf(collection: number, item: number): Promise<string | null> {
    const result = await (this.api.query as any).nfts.item(collection, item)
    const json = result.toJSON() as any
    return json?.owner ?? null
  }

  // WRITE (pair required)
  async createCollection(collectionId: number): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = (this.api.tx as any).nfts.create(
      collectionId, this.pair.address, DEFAULT_COLLECTION_CONFIG
    )
    return submitAndWait(extrinsic, this.pair)
  }

  async mint(params: {
    collection: number
    item: number
    owner: string
  }): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const owner = await resolveAddress(params.owner, this.api)
    const extrinsic = (this.api.tx as any).nfts.mint(
      params.collection, params.item, owner, null
    )
    return submitAndWait(extrinsic, this.pair)
  }

  async transfer(collection: number, item: number, to: string): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const dest = await resolveAddress(to, this.api)
    const extrinsic = (this.api.tx as any).nfts.transfer(collection, item, dest)
    return submitAndWait(extrinsic, this.pair)
  }

  async burn(collection: number, item: number): Promise<TxResult> {
    if (!this.pair) throw AwarizonError.notSigned()
    const extrinsic = (this.api.tx as any).nfts.burn(collection, item)
    return submitAndWait(extrinsic, this.pair)
  }
}
