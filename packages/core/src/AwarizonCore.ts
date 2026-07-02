import type { ApiPromise } from '@polkadot/api'
import { AwarizonClient } from '@awarizon/sdk'
import { AwarizonKeyring } from './keyring'
import { NetworkModule } from './modules/network'
import { WalletModule } from './modules/wallet'
import { InboxModule } from './modules/inbox'
import { DeveloperModule } from './modules/developer'
import { AppsModule } from './modules/apps'
import { CampaignsModule } from './modules/campaigns'
import { AssetsModule } from './modules/assets'
import { NFTsModule } from './modules/nfts'
import { ValidatorsModule } from './modules/validators'
import { IdentityModule } from './modules/identity'
import { LinksModule } from './modules/links'

export interface CoreConfig {
  endpoint: string
}

export class AwarizonCore {
  private client: AwarizonClient | null = null
  private api: ApiPromise | null = null
  readonly keyring: AwarizonKeyring

  network!: NetworkModule
  wallet!: WalletModule
  inbox!: InboxModule
  developer!: DeveloperModule
  apps!: AppsModule
  campaigns!: CampaignsModule
  assets!: AssetsModule
  nfts!: NFTsModule
  validators!: ValidatorsModule
  identity!: IdentityModule
  links!: LinksModule

  constructor(private config: CoreConfig) {
    this.keyring = new AwarizonKeyring()
  }

  async connect(): Promise<this> {
    await this.keyring.initialize()

    this.client = new AwarizonClient(this.config.endpoint)
    await this.client.connect()
    this.api = this.client.getApi()

    this.network = new NetworkModule(this.api)
    this.wallet = new WalletModule(this.api)
    this.inbox = new InboxModule(this.api)
    this.developer = new DeveloperModule(this.api)
    this.apps = new AppsModule(this.api)
    this.campaigns = new CampaignsModule(this.api)
    this.assets = new AssetsModule(this.api)
    this.nfts = new NFTsModule(this.api)
    this.validators = new ValidatorsModule(this.api)
    this.identity = new IdentityModule(this.api)
    this.links = new LinksModule(this.api)

    return this
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect()
      this.client = null
      this.api = null
    }
  }

  isConnected(): boolean {
    return this.client !== null
  }

  getApi(): ApiPromise {
    if (!this.api) {
      throw new Error('Not connected. Call connect() first.')
    }
    return this.api
  }
}

export async function createCore(config: CoreConfig): Promise<AwarizonCore> {
  const core = new AwarizonCore(config)
  await core.connect()
  return core
}
