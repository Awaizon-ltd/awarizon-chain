import type { ApiPromise } from '@polkadot/api'
import { CollectionsModule } from './modules/collections'
import { ItemsModule } from './modules/items'
import { MarketplaceModule } from './modules/market'

export class NFTClient {
  readonly collections: CollectionsModule
  readonly items: ItemsModule
  readonly market: MarketplaceModule

  constructor(api: ApiPromise, pair: any | null = null) {
    this.collections = new CollectionsModule(api, pair)
    this.items = new ItemsModule(api, pair)
    this.market = new MarketplaceModule(api, pair)
  }

  /** Create a read-only client (no signing). */
  static readOnly(api: ApiPromise): NFTClient {
    return new NFTClient(api, null)
  }

  /** Create a signing client. */
  static withSigner(api: ApiPromise, pair: any): NFTClient {
    return new NFTClient(api, pair)
  }
}
