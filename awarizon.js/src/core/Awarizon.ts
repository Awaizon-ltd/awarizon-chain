import { createCore, DEFAULT_ENDPOINT } from '@awarizon/core'
import type { AwarizonCore } from '@awarizon/core'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { AppCategory } from '@awarizon/sdk'
import { AwarizonError } from '../errors'
import { isRizName, normalizeRizName } from '../utils/addresses'
import { resolveWalletToAdapter } from '../adapters/resolve'
import type { WalletAdapter } from '../adapters/types'
import type { WalletConfig } from '../adapters/resolve'
import type {
  TxResult,
  Balance,
  InboxItem,
  ClaimResult,
  DeveloperStatus,
  AppManifest,
  Campaign,
  Asset,
  AssetBalance,
  NFTItem,
  ValidatorInfo,
  NetworkStats,
  TargetingOptions,
  ChainType,
  LinkedAddress,
  IdentityRecord,
  NameLookup,
} from './types'

export class Awarizon {
  private _core: AwarizonCore | null = null
  private _pair: KeyringPair | null = null

  address: string | null = null

  constructor(public readonly endpoint: string = DEFAULT_ENDPOINT) {}

  private get core(): AwarizonCore {
    if (!this._core) {
      throw new AwarizonError(
        'NOT_CONNECTED',
        'Not connected. Call createClient() or await awz.connect() first.'
      )
    }
    return this._core
  }

  private get pair(): KeyringPair {
    if (!this._pair) {
      throw new AwarizonError(
        'WALLET_REQUIRED',
        'This operation requires a connected wallet. ' +
        'Configure one in createClient({ wallet: "your mnemonic" }) ' +
        'or call awz.connect("your mnemonic") after creation.'
      )
    }
    return this._pair
  }

  requireWallet(operation: string): void {
    if (!this._pair) {
      throw new AwarizonError(
        'WALLET_REQUIRED',
        `"${operation}" requires a connected wallet. ` +
        `You are in read-only mode. ` +
        `Configure a wallet in createClient({ wallet: ... }) ` +
        `or call awz.connect() with a wallet.`
      )
    }
  }

  private async _connectCore(): Promise<void> {
    if (this._core) return
    try {
      this._core = await createCore({ endpoint: this.endpoint })
    } catch (err) {
      throw AwarizonError.wrap(err, 'NOT_CONNECTED')
    }
  }

  async connect(wallet?: string | WalletConfig | WalletAdapter): Promise<this> {
    await this._connectCore()

    if (wallet) {
      const adapter = await resolveWalletToAdapter(wallet)
      const connected = await adapter.connect()
      this._pair = connected.pair
      this.address = connected.address
    }

    return this
  }

  async disconnect(): Promise<void> {
    await this._core?.disconnect()
    this._core = null
    this._pair = null
    this.address = null
  }

  get isConnected(): boolean {
    return this._core !== null
  }

  get hasWallet(): boolean {
    return this._pair !== null
  }

  private async resolveAddress(input: string): Promise<string> {
    if (isRizName(input)) {
      const name = normalizeRizName(input)
      const result = await this.core.identity.lookup(name)
      if (!result) {
        throw new AwarizonError('NAME_NOT_FOUND', `Name "${input}" not found on Awarizon.`)
      }
      return result.account
    }
    return input
  }

  // ── Wallet ─────────────────────────────────────────────────────────────────

  readonly wallet = {
    balance: (address?: string): Promise<Balance> => {
      const addr = address ?? this.address
      if (!addr) {
        throw new AwarizonError('WALLET_REQUIRED', 'Provide an address or connect a wallet first.')
      }
      return this.core.wallet.balance(addr)
    },

    send: async (params: { to: string; amount: string }): Promise<TxResult> => {
      const to = await this.resolveAddress(params.to)
      try {
        return await this.core.wallet.send({ to, amount: params.amount, signer: this.pair })
      } catch (err) {
        throw AwarizonError.wrap(err, 'TX_FAILED')
      }
    },

    totalIssuance: (): Promise<string> => {
      return this.core.wallet.totalIssuance()
    },
  }

  // ── Identity ───────────────────────────────────────────────────────────────

  readonly identity = {
    get: (address: string): Promise<IdentityRecord | null> => {
      return this.core.identity.get(address)
    },

    lookup: (name: string): Promise<NameLookup | null> => {
      return this.core.identity.lookup(normalizeRizName(name))
    },

    isAvailable: (name: string): Promise<boolean> => {
      return this.core.identity.isAvailable(normalizeRizName(name))
    },

    register: (params: {
      rizName?: string
      displayName?: string
      bio?: string
      avatarUri?: string
      website?: string
    }): Promise<TxResult> => {
      return this.core.identity.register({ ...params, signer: this.pair })
    },

    update: (params: {
      displayName?: string
      bio?: string
      avatarUri?: string
      website?: string
    }): Promise<TxResult> => {
      return this.core.identity.update({ ...params, signer: this.pair })
    },
  }

  // ── Links ──────────────────────────────────────────────────────────────────

  readonly links = {
    list: (address: string): Promise<LinkedAddress[]> => {
      return this.core.links.list(address)
    },

    buildEvmLinkMessage: (awarizonAddress?: string): string => {
      const addr = awarizonAddress ?? this.address
      if (!addr) throw new AwarizonError('WALLET_REQUIRED', 'Provide an Awarizon address or connect a wallet first.')
      return this.core.links.buildEvmLinkMessage(addr)
    },

    buildSolanaLinkMessage: (awarizonAddress?: string): string => {
      const addr = awarizonAddress ?? this.address
      if (!addr) throw new AwarizonError('WALLET_REQUIRED', 'Provide an Awarizon address or connect a wallet first.')
      return this.core.links.buildSolanaLinkMessage(addr)
    },

    linkEvm: (params: { evmAddress: string; signature: string }): Promise<TxResult> => {
      return this.core.links.linkEvm({ ...params, signer: this.pair })
    },

    linkSolana: (params: { solanaPubkey: string; signature: string }): Promise<TxResult> => {
      return this.core.links.linkSolana({ ...params, signer: this.pair })
    },

    unlink: (params: { chain: ChainType }): Promise<TxResult> => {
      return this.core.links.unlink({ ...params, signer: this.pair })
    },
  }

  // ── Inbox ──────────────────────────────────────────────────────────────────

  readonly inbox = {
    list: (address: string): Promise<InboxItem[]> => {
      return this.core.inbox.list(address)
    },

    count: (address: string): Promise<number> => {
      return this.core.inbox.count(address)
    },

    get: (address: string, recordId: string): Promise<InboxItem | null> => {
      return this.core.inbox.get(address, recordId)
    },

    engage: (params: {
      recordId: string
      sessionSeconds: number
      interactions: number
    }): Promise<TxResult> => {
      return this.core.inbox.engage({ ...params, signer: this.pair })
    },

    claim: (params: { recordId: string }): Promise<ClaimResult> => {
      return this.core.inbox.claim({ ...params, signer: this.pair })
    },

    dismiss: (params: { recordId: string }): Promise<TxResult> => {
      return this.core.inbox.dismiss({ ...params, signer: this.pair })
    },
  }

  // ── Developer ──────────────────────────────────────────────────────────────

  readonly developer = {
    register: (): Promise<TxResult> => {
      return this.core.developer.register({ signer: this.pair })
    },

    stake: (params: { amount: string }): Promise<TxResult> => {
      return this.core.developer.stake({ amount: params.amount, signer: this.pair })
    },

    status: (address: string): Promise<DeveloperStatus | null> => {
      return this.core.developer.status(address)
    },
  }

  // ── Apps ───────────────────────────────────────────────────────────────────

  readonly apps = {
    register: (params: {
      manifestHash: string
      category: AppCategory
      metadataUri: string
    }): Promise<TxResult & { manifestHash: string }> => {
      return this.core.apps.register({ ...params, signer: this.pair })
    },

    list: (developerAddress: string): Promise<AppManifest[]> => {
      return this.core.apps.list(developerAddress)
    },
  }

  // ── Campaigns ──────────────────────────────────────────────────────────────

  readonly campaigns = {
    create: (params: {
      manifestHash: string
      targeting: TargetingOptions
      durationDays: number
      maxDeliveries: bigint
    }): Promise<TxResult & { campaignId: string }> => {
      return this.core.campaigns.create({ ...params, signer: this.pair })
    },

    get: (campaignId: string): Promise<Campaign | null> => {
      return this.core.campaigns.get(campaignId)
    },

    terminate: (params: { campaignId: string }): Promise<TxResult> => {
      return this.core.campaigns.terminate({ ...params, signer: this.pair })
    },

    deliver: (params: {
      campaignId: string
      wallet: string
      recordId: string
    }): Promise<TxResult> => {
      return this.core.campaigns.deliver({ ...params, signer: this.pair })
    },

    deliveryStatus: (campaignId: string): Promise<{
      current: number
      max: number
      remaining: number
      percentage: number
    } | null> => {
      return this.core.campaigns.deliveryStatus(campaignId)
    },
  }

  // ── Assets ─────────────────────────────────────────────────────────────────

  readonly assets = {
    create: (params: {
      id: number
      admin: string
      minBalance: bigint
    }): Promise<TxResult & { assetId: number }> => {
      return this.core.assets.create({ ...params, signer: this.pair })
    },

    mint: (params: {
      assetId: number
      to: string
      amount: bigint
    }): Promise<TxResult> => {
      return this.core.assets.mint({ ...params, signer: this.pair })
    },

    transfer: (params: {
      assetId: number
      to: string
      amount: bigint
    }): Promise<TxResult> => {
      return this.core.assets.transfer({ ...params, signer: this.pair })
    },

    burn: (params: {
      assetId: number
      who: string
      amount: bigint
    }): Promise<TxResult> => {
      return this.core.assets.burn({ ...params, signer: this.pair })
    },

    balance: (params: { assetId: number; address: string }): Promise<AssetBalance> => {
      return this.core.assets.balance(params)
    },

    metadata: (assetId: number): Promise<{ name: string; symbol: string; decimals: number }> => {
      return this.core.assets.metadata(assetId)
    },

    info: (assetId: number): Promise<Asset | null> => {
      return this.core.assets.info(assetId)
    },
  }

  // ── NFTs ───────────────────────────────────────────────────────────────────

  readonly nfts = {
    createCollection: (params: {
      collectionId: number
      admin: string
    }): Promise<TxResult & { collectionId: number }> => {
      return this.core.nfts.createCollection({ ...params, signer: this.pair })
    },

    mint: (params: {
      collection: number
      itemId: number
      owner: string
    }): Promise<TxResult> => {
      return this.core.nfts.mint({ ...params, signer: this.pair })
    },

    transfer: (params: {
      collection: number
      item: number
      to: string
    }): Promise<TxResult> => {
      return this.core.nfts.transfer({ ...params, signer: this.pair })
    },

    burn: (params: {
      collection: number
      item: number
    }): Promise<TxResult> => {
      return this.core.nfts.burn({ ...params, signer: this.pair })
    },

    ownerOf: (params: { collection: number; item: number }): Promise<string | null> => {
      return this.core.nfts.ownerOf(params)
    },

    list: (address: string): Promise<NFTItem[]> => {
      return this.core.nfts.list(address)
    },
  }

  // ── Validators ─────────────────────────────────────────────────────────────

  readonly validators = {
    register: (params: {
      stake: string
      regionCode: number
      countryCode: number
    }): Promise<TxResult> => {
      return this.core.validators.register({ ...params, signer: this.pair })
    },

    delegate: (params: {
      to: string
      amount: string
    }): Promise<TxResult> => {
      return this.core.validators.delegate({ ...params, signer: this.pair })
    },

    undelegate: (params: { from: string }): Promise<TxResult> => {
      return this.core.validators.undelegate({ ...params, signer: this.pair })
    },

    performance: (address: string): Promise<ValidatorInfo | null> => {
      return this.core.validators.performance(address)
    },

    list: (): Promise<ValidatorInfo[]> => {
      return this.core.validators.list()
    },
  }

  // ── Network ────────────────────────────────────────────────────────────────

  readonly network = {
    stats: (): Promise<NetworkStats> => {
      return this.core.network.stats()
    },

    tokenStats: (): Promise<{ totalIssuance: string; engagementPool: string }> => {
      return this.core.network.tokenStats()
    },

    validatorCount: (): Promise<number> => {
      return this.core.network.validatorCount()
    },

    activeValidators: (): Promise<string[]> => {
      return this.core.network.activeValidators()
    },

    subscribeBlocks: (callback: (blockNumber: number, hash: string) => void): Promise<() => void> => {
      return this.core.network.subscribeBlocks(callback)
    },
  }
}
