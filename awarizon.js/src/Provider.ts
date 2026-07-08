import { ApiPromise, WsProvider } from '@polkadot/api'
import { awarizonTypes, awarizonRpc }
  from '@awarizon/sdk'
import type { KeyringPair } from '@polkadot/keyring/types'
import { WalletModule } from './modules/wallet'
import { InboxModule } from './modules/inbox'
import { IdentityModule } from './modules/identity'
import { LinksModule } from './modules/links'
import { DeveloperModule } from './modules/developer'
import { AppsModule } from './modules/apps'
import { CampaignsModule } from './modules/campaigns'
import { AssetsModule } from './modules/assets'
import { NFTsModule } from './modules/nfts'
import { ValidatorsModule } from './modules/validators'
import { NetworkModule } from './modules/network'
import { AwarizonError } from './errors'

export class Provider {
  protected api: ApiPromise | null = null
  protected _endpoint: string

  // All modules — available after connect()
  wallet!: WalletModule
  inbox!: InboxModule
  identity!: IdentityModule
  links!: LinksModule
  developer!: DeveloperModule
  apps!: AppsModule
  campaigns!: CampaignsModule
  assets!: AssetsModule
  nfts!: NFTsModule
  validators!: ValidatorsModule
  network!: NetworkModule

  constructor(endpoint?: string) {
    this._endpoint = endpoint
      ?? getDefaultEndpoint()
  }

  static async connect(endpoint?: string): Promise<Provider> {
    const p = new Provider(endpoint)
    await p._connect()
    return p
  }

  protected async _connect(): Promise<void> {
    const wsProvider = new WsProvider(this._endpoint)
    this.api = await ApiPromise.create({
      provider: wsProvider,
      types: awarizonTypes,
      rpc: awarizonRpc,
    })
    await this.api.isReady
    this._initModules(null)
  }

  protected _initModules(
    pair: KeyringPair | null
  ): void {
    const api = this.api!
    this.wallet = new WalletModule(api, pair)
    this.inbox = new InboxModule(api, pair)
    this.identity = new IdentityModule(api, pair)
    this.links = new LinksModule(api, pair)
    this.developer = new DeveloperModule(api, pair)
    this.apps = new AppsModule(api, pair)
    this.campaigns = new CampaignsModule(api, pair)
    this.assets = new AssetsModule(api, pair)
    this.nfts = new NFTsModule(api, pair)
    this.validators = new ValidatorsModule(api, pair)
    this.network = new NetworkModule(api)
  }

  getApi(): ApiPromise {
    if (!this.api) throw AwarizonError.notConnected()
    return this.api
  }

  get connected(): boolean {
    return this.api?.isConnected ?? false
  }

  get endpoint(): string {
    return this._endpoint
  }

  async disconnect(): Promise<void> {
    await this.api?.disconnect()
    this.api = null
  }
}

function getDefaultEndpoint(): string {
  if (typeof process !== 'undefined') {
    return process.env.AWARIZON_ENDPOINT
      ?? 'wss://rpc.awarizon.com'
  }
  return 'wss://rpc.awarizon.com'
}
