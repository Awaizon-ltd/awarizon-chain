import { ApiPromise } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { AppCategory } from '@awarizon/sdk';
export { DEFAULT_ENDPOINT, MAX_CAMPAIGN_DURATION_DAYS, MICRO_RIZ, MIN_CAMPAIGN_DURATION_DAYS, MIN_INTERACTIONS, MIN_SESSION_SECONDS, PLANCK, RIZ } from '@awarizon/sdk';

interface TxResult {
    hash: string;
    blockNumber: number;
    success: boolean;
}
interface Balance {
    free: string;
    staked: string;
    reserved: string;
    total: string;
    freePlanck: bigint;
}
interface GeneratedWallet {
    mnemonic: string;
    address: string;
    publicKey: string;
}
interface WalletAccount {
    address: string;
    publicKey: string;
    name?: string;
}
interface InboxItem {
    recordId: string;
    campaignId: string;
    developer: string;
    manifestHash: string;
    category: string;
    status: 'Pending' | 'Delivered' | 'Dismissed' | 'Engaged';
    deliveredAt: number;
    engagedAt: number | null;
    rewardClaimed: boolean;
    rewardEligible: boolean;
}
interface ClaimResult extends TxResult {
    reward: string;
}
interface DeveloperStatus {
    registered: boolean;
    verified: boolean;
    stake: string;
    totalCampaigns: number;
    totalDeliveries: number;
    violationCount: number;
}
interface AppManifest {
    manifestHash: string;
    developer: string;
    category: string;
    registeredAt: number;
    metadataUri: string;
}
interface Campaign {
    campaignId: string;
    developer: string;
    manifestHash: string;
    status: 'Pending' | 'Active' | 'Expired' | 'Terminated';
    createdAt: number;
    expiresAt: number;
    maxDeliveries: number;
    currentDeliveries: number;
    targetingDescription: string;
}
interface Asset {
    id: number;
    name: string;
    symbol: string;
    decimals: number;
    supply: string;
    owner: string;
}
interface AssetBalance {
    assetId: number;
    symbol: string;
    balance: string;
    balanceRaw: bigint;
}
interface NFTItem {
    collection: number;
    item: number;
    owner: string;
    metadata: Record<string, unknown>;
}
interface ValidatorInfo {
    address: string;
    selfStake: string;
    delegatedStake: string;
    totalStake: string;
    performanceScore: number;
    uptime: number;
    slashCount: number;
    isActive: boolean;
}
interface NetworkStats {
    totalWallets: number;
    totalDeliveries: number;
    activeCampaigns: number;
    totalStaked: string;
    currentEpoch: number;
    inboxReserve: string;
    totalExtrinsics: number;
    circulatingSupply: string;
    nonCirculatingSupply: string;
}
interface TargetingOptions {
    categories?: string[];
    minBalance?: string;
    maxBalance?: string;
    minWalletAge?: number;
    maxWalletAge?: number;
    minActivity?: number;
    maxActivity?: number;
    regions?: number[];
}

declare class AwarizonKeyring {
    private keyring;
    constructor();
    initialize(): Promise<void>;
    generate(wordCount?: 12 | 24): GeneratedWallet;
    validate(mnemonic: string): boolean;
    fromMnemonic(mnemonic: string): KeyringPair;
    derive(mnemonic: string, path: string): KeyringPair;
    encrypt(pair: KeyringPair, password: string): string;
    decrypt(encrypted: string, password: string): KeyringPair;
    getAccount(pair: KeyringPair): WalletAccount;
    exportJson(pair: KeyringPair, password: string): string;
    importJson(json: string, password: string): KeyringPair;
    toAddress(publicKey: string): string;
}

declare class NetworkModule {
    private api;
    constructor(api: ApiPromise);
    stats(): Promise<NetworkStats>;
    tokenStats(): Promise<{
        totalIssuance: string;
        engagementPool: string;
    }>;
    validatorCount(): Promise<number>;
    activeValidators(): Promise<string[]>;
    subscribeBlocks(callback: (blockNumber: number, hash: string) => void): Promise<() => void>;
}

declare class WalletModule {
    private api;
    constructor(api: ApiPromise);
    balance(address: string): Promise<Balance>;
    send(params: {
        to: string;
        amount: string;
        signer: KeyringPair;
    }): Promise<TxResult>;
    totalIssuance(): Promise<string>;
}

declare class InboxModule {
    private api;
    constructor(api: ApiPromise);
    list(address: string): Promise<InboxItem[]>;
    get(address: string, recordId: string): Promise<InboxItem | null>;
    count(address: string): Promise<number>;
    engage(params: {
        recordId: string;
        sessionSeconds?: number;
        interactions?: number;
        signer: KeyringPair;
    }): Promise<TxResult>;
    claim(params: {
        recordId: string;
        signer: KeyringPair;
    }): Promise<ClaimResult>;
    dismiss(params: {
        recordId: string;
        signer: KeyringPair;
    }): Promise<TxResult>;
}

declare class DeveloperModule {
    private api;
    constructor(api: ApiPromise);
    register(params: {
        signer: KeyringPair;
    }): Promise<TxResult>;
    stake(params: {
        amount: string;
        signer: KeyringPair;
    }): Promise<TxResult>;
    status(address: string): Promise<DeveloperStatus | null>;
}

declare class AppsModule {
    private api;
    constructor(api: ApiPromise);
    register(params: {
        manifestHash: string;
        category: AppCategory;
        metadataUri: string;
        signer: KeyringPair;
    }): Promise<TxResult & {
        manifestHash: string;
    }>;
    list(developerAddress: string): Promise<AppManifest[]>;
}

declare class CampaignsModule {
    private api;
    constructor(api: ApiPromise);
    create(params: {
        manifestHash: string;
        targeting: TargetingOptions;
        durationDays: number;
        maxDeliveries: bigint;
        signer: KeyringPair;
    }): Promise<TxResult & {
        campaignId: string;
    }>;
    get(campaignId: string): Promise<Campaign | null>;
    terminate(params: {
        campaignId: string;
        signer: KeyringPair;
    }): Promise<TxResult>;
    deliver(params: {
        campaignId: string;
        wallet: string;
        recordId: string;
        signer: KeyringPair;
    }): Promise<TxResult>;
    deliveryStatus(campaignId: string): Promise<{
        current: number;
        max: number;
        remaining: number;
        percentage: number;
    } | null>;
    describeTargeting(opts: TargetingOptions): string;
}

declare class AssetsModule {
    private api;
    constructor(api: ApiPromise);
    create(params: {
        id: number;
        admin: string;
        minBalance: bigint;
        signer: KeyringPair;
    }): Promise<TxResult & {
        assetId: number;
    }>;
    mint(params: {
        assetId: number;
        to: string;
        amount: bigint;
        signer: KeyringPair;
    }): Promise<TxResult>;
    transfer(params: {
        assetId: number;
        to: string;
        amount: bigint;
        signer: KeyringPair;
    }): Promise<TxResult>;
    burn(params: {
        assetId: number;
        who: string;
        amount: bigint;
        signer: KeyringPair;
    }): Promise<TxResult>;
    balance(params: {
        assetId: number;
        address: string;
    }): Promise<AssetBalance>;
    metadata(assetId: number): Promise<{
        name: string;
        symbol: string;
        decimals: number;
    }>;
    info(assetId: number): Promise<Asset | null>;
}

declare class NFTsModule {
    private api;
    constructor(api: ApiPromise);
    createCollection(params: {
        collectionId: number;
        admin: string;
        signer: KeyringPair;
    }): Promise<TxResult & {
        collectionId: number;
    }>;
    mint(params: {
        collection: number;
        itemId: number;
        owner: string;
        signer: KeyringPair;
    }): Promise<TxResult>;
    transfer(params: {
        collection: number;
        item: number;
        to: string;
        signer: KeyringPair;
    }): Promise<TxResult>;
    burn(params: {
        collection: number;
        item: number;
        signer: KeyringPair;
    }): Promise<TxResult>;
    ownerOf(params: {
        collection: number;
        item: number;
    }): Promise<string | null>;
    list(address: string): Promise<NFTItem[]>;
}

declare class ValidatorsModule {
    private api;
    constructor(api: ApiPromise);
    register(params: {
        stake: string;
        regionCode: number;
        countryCode: number;
        signer: KeyringPair;
    }): Promise<TxResult>;
    delegate(params: {
        to: string;
        amount: string;
        signer: KeyringPair;
    }): Promise<TxResult>;
    undelegate(params: {
        from: string;
        signer: KeyringPair;
    }): Promise<TxResult>;
    performance(address: string): Promise<ValidatorInfo | null>;
    list(): Promise<ValidatorInfo[]>;
}

interface CoreConfig {
    endpoint: string;
}
declare class AwarizonCore {
    private config;
    private client;
    private api;
    readonly keyring: AwarizonKeyring;
    network: NetworkModule;
    wallet: WalletModule;
    inbox: InboxModule;
    developer: DeveloperModule;
    apps: AppsModule;
    campaigns: CampaignsModule;
    assets: AssetsModule;
    nfts: NFTsModule;
    validators: ValidatorsModule;
    constructor(config: CoreConfig);
    connect(): Promise<this>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getApi(): ApiPromise;
}
declare function createCore(config: CoreConfig): Promise<AwarizonCore>;

declare function parseAmount(input: string): bigint;
declare function formatAmount(planck: bigint, decimals?: number): string;
declare function isValidAmount(input: string): boolean;

export { type AppManifest, type Asset, type AssetBalance, AwarizonCore, AwarizonKeyring, type Balance, type Campaign, type ClaimResult, type CoreConfig, type DeveloperStatus, type GeneratedWallet, type InboxItem, type NFTItem, type NetworkStats, type TargetingOptions, type TxResult, type ValidatorInfo, type WalletAccount, createCore, formatAmount, isValidAmount, parseAmount };
