// src/AwarizonCore.ts
import { AwarizonClient } from "@awarizon/sdk";

// src/keyring/index.ts
import {
  mnemonicGenerate,
  mnemonicValidate,
  cryptoWaitReady
} from "@polkadot/util-crypto";
import { Keyring } from "@polkadot/keyring";
import { u8aToHex } from "@polkadot/util";
var AwarizonKeyring = class {
  constructor() {
    this.keyring = new Keyring({ type: "sr25519", ss58Format: 42 });
  }
  async initialize() {
    await cryptoWaitReady();
  }
  generate(wordCount = 12) {
    const mnemonic = mnemonicGenerate(wordCount);
    const pair = this.keyring.addFromMnemonic(mnemonic);
    return {
      mnemonic,
      address: pair.address,
      publicKey: u8aToHex(pair.publicKey)
    };
  }
  validate(mnemonic) {
    return mnemonicValidate(mnemonic);
  }
  fromMnemonic(mnemonic) {
    if (!this.validate(mnemonic)) {
      throw new Error("Invalid mnemonic phrase");
    }
    return this.keyring.addFromMnemonic(mnemonic);
  }
  // Derive a child account. path examples: "//0", "//1", "//accountName"
  derive(mnemonic, path) {
    if (!this.validate(mnemonic)) {
      throw new Error("Invalid mnemonic phrase");
    }
    return this.keyring.addFromMnemonic(`${mnemonic}${path}`);
  }
  // Encrypt keypair to JSON string safe for storage
  encrypt(pair, password) {
    const json = pair.toJson(password);
    return JSON.stringify(json);
  }
  // Decrypt keypair from stored JSON string
  decrypt(encrypted, password) {
    try {
      const json = JSON.parse(encrypted);
      const pair = this.keyring.addFromJson(json);
      pair.decodePkcs8(password);
      return pair;
    } catch {
      throw new Error(
        "Failed to decrypt wallet. Check your password and try again."
      );
    }
  }
  getAccount(pair) {
    return {
      address: pair.address,
      publicKey: u8aToHex(pair.publicKey)
    };
  }
  exportJson(pair, password) {
    return JSON.stringify(pair.toJson(password));
  }
  importJson(json, password) {
    try {
      const parsed = JSON.parse(json);
      const pair = this.keyring.addFromJson(parsed);
      pair.decodePkcs8(password);
      return pair;
    } catch {
      throw new Error(
        "Failed to import wallet. Invalid backup file or wrong password."
      );
    }
  }
  toAddress(publicKey) {
    return this.keyring.encodeAddress(publicKey, 42);
  }
};

// src/modules/network.ts
import {
  getNetworkStats,
  getTokenStats,
  getValidatorCount,
  getActiveValidators
} from "@awarizon/sdk";

// src/utils/amounts.ts
import { RIZ } from "@awarizon/sdk";
function parseAmount(input) {
  const clean = input.replace(/\s*RIZ\s*/gi, "").trim();
  if (!clean || isNaN(Number(clean))) {
    throw new Error(
      `Invalid amount: "${input}". Use format "10 RIZ" or "10"`
    );
  }
  const [whole, decimal = ""] = clean.split(".");
  const paddedDecimal = decimal.padEnd(12, "0").slice(0, 12);
  return BigInt(whole || "0") * RIZ + BigInt(paddedDecimal);
}
function formatAmount(planck, decimals = 4) {
  const whole = planck / RIZ;
  const remainder = planck % RIZ;
  const decStr = remainder.toString().padStart(12, "0").slice(0, decimals);
  return `${whole.toLocaleString()}.${decStr} RIZ`;
}
function isValidAmount(input) {
  try {
    parseAmount(input);
    return true;
  } catch {
    return false;
  }
}

// src/modules/network.ts
var NetworkModule = class {
  constructor(api) {
    this.api = api;
  }
  async stats() {
    const raw = await getNetworkStats(this.api);
    return {
      totalWallets: Number(raw.total_wallets),
      totalDeliveries: Number(raw.total_deliveries),
      activeCampaigns: Number(raw.active_campaigns),
      totalStaked: formatAmount(BigInt(raw.total_staked)),
      currentEpoch: Number(raw.current_epoch),
      inboxReserve: formatAmount(BigInt(raw.inbox_reserve_balance)),
      totalExtrinsics: Number(raw.total_extrinsics),
      circulatingSupply: formatAmount(BigInt(raw.circulating_supply)),
      nonCirculatingSupply: formatAmount(BigInt(raw.non_circulating_supply))
    };
  }
  async tokenStats() {
    const raw = await getTokenStats(this.api);
    return {
      totalIssuance: formatAmount(BigInt(raw.total_issuance)),
      engagementPool: formatAmount(BigInt(raw.engagement_pool_balance))
    };
  }
  async validatorCount() {
    const count = await getValidatorCount(this.api);
    return Number(count);
  }
  async activeValidators() {
    return getActiveValidators(this.api);
  }
  subscribeBlocks(callback) {
    return new Promise((resolve, reject) => {
      this.api.rpc.chain.subscribeNewHeads((header) => {
        callback(header.number.toNumber(), header.hash.toHex());
      }).then((unsub) => resolve(unsub)).catch(reject);
    });
  }
};

// src/modules/wallet.ts
import { signAndSend } from "@awarizon/sdk";
var WalletModule = class {
  constructor(api) {
    this.api = api;
  }
  async balance(address) {
    const account = await this.api.query.system.account(address);
    const data = account.data;
    const free = BigInt(data.free.toString());
    const reserved = BigInt(data.reserved.toString());
    const total = free + reserved;
    return {
      free: formatAmount(free),
      staked: formatAmount(reserved),
      reserved: formatAmount(reserved),
      total: formatAmount(total),
      freePlanck: free
    };
  }
  async send(params) {
    const planck = parseAmount(params.amount);
    const ext = this.api.tx.balances.transferKeepAlive(params.to, planck);
    const result = await signAndSend(this.api, ext, params.signer);
    return {
      hash: result.blockHash,
      blockNumber: 0,
      success: true
    };
  }
  async totalIssuance() {
    const issuance = await this.api.query.balances.totalIssuance();
    return formatAmount(BigInt(issuance.toString()));
  }
};

// src/modules/inbox.ts
import {
  getInboxCount,
  getInboxRecord,
  buildDismissInboxRecord,
  buildSubmitEngagement,
  buildClaimReward,
  signAndSend as signAndSend2,
  MIN_SESSION_SECONDS,
  MIN_INTERACTIONS
} from "@awarizon/sdk";
var InboxModule = class {
  constructor(api) {
    this.api = api;
  }
  // Enumerate all InboxRecords for address via StorageDoubleMap prefix iteration
  async list(address) {
    const entries = await this.api.query.awarizonState.inboxRecords.entries(address);
    return entries.map(([, value]) => {
      const raw = value.toJSON();
      return {
        recordId: raw.record_id,
        campaignId: raw.campaign_id,
        developer: raw.developer,
        manifestHash: raw.manifest_hash,
        category: raw.category,
        status: raw.status,
        deliveredAt: raw.delivered_at,
        engagedAt: raw.engaged_at ?? null,
        rewardClaimed: raw.reward_claimed,
        rewardEligible: raw.status === "Engaged" && !raw.reward_claimed
      };
    });
  }
  async get(address, recordId) {
    const raw = await getInboxRecord(this.api, address, recordId);
    if (!raw) return null;
    return {
      recordId: raw.record_id,
      campaignId: raw.campaign_id,
      developer: raw.developer,
      manifestHash: raw.manifest_hash,
      category: raw.category,
      status: raw.status,
      deliveredAt: raw.delivered_at,
      engagedAt: raw.engaged_at ?? null,
      rewardClaimed: raw.reward_claimed,
      rewardEligible: raw.status === "Engaged" && !raw.reward_claimed
    };
  }
  async count(address) {
    return getInboxCount(this.api, address);
  }
  async engage(params) {
    const sessionSeconds = params.sessionSeconds ?? MIN_SESSION_SECONDS;
    const interactions = params.interactions ?? MIN_INTERACTIONS;
    const ext = buildSubmitEngagement(
      this.api,
      params.recordId,
      sessionSeconds,
      interactions
    );
    const result = await signAndSend2(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async claim(params) {
    const ext = buildClaimReward(this.api, params.recordId);
    const result = await signAndSend2(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true, reward: "1.0000 RIZ" };
  }
  async dismiss(params) {
    const ext = buildDismissInboxRecord(this.api, params.recordId);
    const result = await signAndSend2(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
};

// src/modules/developer.ts
import {
  getDeveloperProfile,
  buildRegisterDeveloper,
  buildStakeRiz,
  signAndSend as signAndSend3
} from "@awarizon/sdk";
var DeveloperModule = class {
  constructor(api) {
    this.api = api;
  }
  async register(params) {
    const ext = buildRegisterDeveloper(this.api);
    const result = await signAndSend3(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async stake(params) {
    const planck = parseAmount(params.amount);
    const ext = buildStakeRiz(this.api, planck);
    const result = await signAndSend3(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async status(address) {
    const profile = await getDeveloperProfile(this.api, address);
    if (!profile) return null;
    return {
      registered: true,
      verified: profile.status === "Verified",
      stake: formatAmount(profile.staked_riz),
      totalCampaigns: profile.total_campaigns ?? 0,
      totalDeliveries: Number(profile.total_deliveries),
      violationCount: profile.violation_count ?? 0
    };
  }
};

// src/modules/apps.ts
import {
  getDeveloperManifests,
  buildRegisterManifest,
  signAndSend as signAndSend4
} from "@awarizon/sdk";
var AppsModule = class {
  constructor(api) {
    this.api = api;
  }
  async register(params) {
    const ext = buildRegisterManifest(
      this.api,
      params.manifestHash,
      params.category,
      params.metadataUri
    );
    const result = await signAndSend4(this.api, ext, params.signer);
    return {
      hash: result.blockHash,
      blockNumber: 0,
      success: true,
      manifestHash: params.manifestHash
    };
  }
  async list(developerAddress) {
    const hashes = await getDeveloperManifests(this.api, developerAddress);
    const manifests = [];
    for (const hash of hashes) {
      const raw = await this.api.query.awarizonState.manifests(hash);
      const json = raw.toJSON();
      if (!json) continue;
      manifests.push({
        manifestHash: json.manifest_hash,
        developer: json.developer,
        category: json.category,
        registeredAt: json.registered_at,
        metadataUri: typeof json.metadata_uri === "string" ? json.metadata_uri : Buffer.from(json.metadata_uri).toString("utf8")
      });
    }
    return manifests;
  }
};

// src/modules/campaigns.ts
import {
  getCampaign,
  getCampaignDeliveryStatus,
  buildCreateCampaign,
  buildTerminateCampaign,
  buildDeliverToInbox,
  generateCampaignId,
  signAndSend as signAndSend5
} from "@awarizon/sdk";
var CATEGORY_MAP = {
  DeFi: "DeFi",
  Gaming: "Gaming",
  Social: "Social",
  Productivity: "Productivity",
  Infrastructure: "Infrastructure",
  DigitalAssets: "DigitalAssets",
  DeveloperTools: "DeveloperTools",
  Education: "Education"
};
function buildTargetingCriteria(opts) {
  return {
    wallet_age_min: opts.minWalletAge ?? null,
    wallet_age_max: opts.maxWalletAge ?? null,
    riz_balance_min: opts.minBalance ? parseAmount(opts.minBalance) : null,
    riz_balance_max: opts.maxBalance ? parseAmount(opts.maxBalance) : null,
    activity_min: opts.minActivity ?? null,
    activity_max: opts.maxActivity ?? null,
    region_codes: opts.regions ?? [],
    category_history: (opts.categories ?? []).map((c) => CATEGORY_MAP[c]).filter((c) => c !== void 0),
    custom_logic_hash: null
  };
}
function targetingDescription(opts) {
  const parts = [];
  if (opts.categories?.length) parts.push(`categories: ${opts.categories.join(", ")}`);
  if (opts.minBalance || opts.maxBalance)
    parts.push(`balance: ${opts.minBalance ?? "0"} \u2013 ${opts.maxBalance ?? "\u221E"}`);
  if (opts.minWalletAge || opts.maxWalletAge)
    parts.push(`wallet age: ${opts.minWalletAge ?? 0} \u2013 ${opts.maxWalletAge ?? "\u221E"} days`);
  if (opts.regions?.length) parts.push(`regions: ${opts.regions.join(", ")}`);
  return parts.length ? parts.join("; ") : "no targeting filters";
}
function rawToCampaign(raw) {
  return {
    campaignId: raw.campaign_id,
    developer: raw.developer,
    manifestHash: raw.manifest_hash,
    status: raw.status,
    createdAt: raw.created_at,
    expiresAt: raw.expires_at,
    maxDeliveries: Number(raw.max_deliveries),
    currentDeliveries: Number(raw.current_deliveries),
    targetingDescription: "see on-chain targeting criteria"
  };
}
var CampaignsModule = class {
  constructor(api) {
    this.api = api;
  }
  async create(params) {
    const campaignId = generateCampaignId(params.manifestHash);
    const criteria = buildTargetingCriteria(params.targeting);
    const ext = buildCreateCampaign(
      this.api,
      campaignId,
      params.manifestHash,
      criteria,
      params.durationDays,
      params.maxDeliveries
    );
    const result = await signAndSend5(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true, campaignId };
  }
  async get(campaignId) {
    const raw = await getCampaign(this.api, campaignId);
    if (!raw) return null;
    return rawToCampaign(raw);
  }
  async terminate(params) {
    const ext = buildTerminateCampaign(this.api, params.campaignId);
    const result = await signAndSend5(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async deliver(params) {
    const ext = buildDeliverToInbox(
      this.api,
      params.wallet,
      params.campaignId,
      params.recordId
    );
    const result = await signAndSend5(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async deliveryStatus(campaignId) {
    const raw = await getCampaignDeliveryStatus(this.api, campaignId);
    if (!raw) return null;
    return {
      current: Number(raw.current_deliveries),
      max: Number(raw.max_deliveries),
      remaining: Number(raw.remaining),
      percentage: raw.percentage_used
    };
  }
  // Convenience: build targeting criteria description without creating a campaign
  describeTargeting(opts) {
    return targetingDescription(opts);
  }
};

// src/modules/assets.ts
import {
  buildCreateAsset,
  buildMintAsset,
  buildTransferAsset,
  signAndSend as signAndSend6
} from "@awarizon/sdk";
var AssetsModule = class {
  constructor(api) {
    this.api = api;
  }
  async create(params) {
    const ext = buildCreateAsset(this.api, params.id, params.admin, params.minBalance);
    const result = await signAndSend6(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true, assetId: params.id };
  }
  async mint(params) {
    const ext = buildMintAsset(this.api, params.assetId, params.to, params.amount);
    const result = await signAndSend6(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async transfer(params) {
    const ext = buildTransferAsset(this.api, params.assetId, params.to, params.amount);
    const result = await signAndSend6(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async burn(params) {
    const ext = this.api.tx.assets.burn(params.assetId, params.who, params.amount);
    const result = await signAndSend6(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async balance(params) {
    const raw = await this.api.query.assets.account(params.assetId, params.address);
    const json = raw.toJSON();
    const balRaw = BigInt(json?.balance?.toString() ?? "0");
    return {
      assetId: params.assetId,
      symbol: String(params.assetId),
      balance: balRaw.toString(),
      balanceRaw: balRaw
    };
  }
  async metadata(assetId) {
    const raw = await this.api.query.assets.metadata(assetId);
    const json = raw.toJSON();
    return {
      name: String(json.name ?? ""),
      symbol: String(json.symbol ?? ""),
      decimals: Number(json.decimals ?? 0)
    };
  }
  async info(assetId) {
    const raw = await this.api.query.assets.asset(assetId);
    const json = raw.toJSON();
    if (!json) return null;
    const meta = await this.metadata(assetId);
    return {
      id: assetId,
      name: meta.name,
      symbol: meta.symbol,
      decimals: meta.decimals,
      supply: String(json.supply ?? "0"),
      owner: String(json.owner ?? "")
    };
  }
};

// src/modules/nfts.ts
import { signAndSend as signAndSend7 } from "@awarizon/sdk";
var NFTsModule = class {
  constructor(api) {
    this.api = api;
  }
  async createCollection(params) {
    const ext = this.api.tx.nfts.create(
      params.collectionId,
      params.admin,
      {}
      // CollectionConfig — defaults suffice for basic usage
    );
    const result = await signAndSend7(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true, collectionId: params.collectionId };
  }
  async mint(params) {
    const ext = this.api.tx.nfts.mint(
      params.collection,
      params.itemId,
      params.owner,
      null
      // witness_data (None)
    );
    const result = await signAndSend7(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async transfer(params) {
    const ext = this.api.tx.nfts.transfer(params.collection, params.item, params.to);
    const result = await signAndSend7(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async burn(params) {
    const ext = this.api.tx.nfts.burn(params.collection, params.item);
    const result = await signAndSend7(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async ownerOf(params) {
    const raw = await this.api.query.nfts.item(params.collection, params.item);
    const json = raw.toJSON();
    if (!json) return null;
    return String(json.owner ?? "");
  }
  async list(address) {
    const entries = await this.api.query.nfts.account.entries(address);
    const items = [];
    for (const [key] of entries) {
      const [, collection, item] = key.args;
      items.push({
        collection: Number(collection),
        item: Number(item),
        owner: address,
        metadata: {}
      });
    }
    return items;
  }
};

// src/modules/validators.ts
import {
  getActiveValidators as getActiveValidators2,
  getValidatorPerformance,
  buildRegisterValidator,
  buildDelegateStake,
  buildUndelegateStake,
  signAndSend as signAndSend8
} from "@awarizon/sdk";
function bpsToPercent(bps) {
  return Math.round(bps / 100);
}
var ValidatorsModule = class {
  constructor(api) {
    this.api = api;
  }
  async register(params) {
    const planck = parseAmount(params.stake);
    const ext = buildRegisterValidator(this.api, planck, params.regionCode, params.countryCode);
    const result = await signAndSend8(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async delegate(params) {
    const planck = parseAmount(params.amount);
    const ext = buildDelegateStake(this.api, params.to, planck);
    const result = await signAndSend8(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async undelegate(params) {
    const ext = buildUndelegateStake(this.api, params.from);
    const result = await signAndSend8(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async performance(address) {
    const [validatorRaw, perfRaw] = await Promise.all([
      this.api.query.awarizonConsensus.validators(address),
      getValidatorPerformance(this.api, address)
    ]);
    const validator = validatorRaw.toJSON();
    if (!validator) return null;
    const selfStake = BigInt(String(validator.self_stake ?? "0"));
    const delegatedStake = BigInt(String(validator.delegated_stake ?? "0"));
    return {
      address,
      selfStake: formatAmount(selfStake),
      delegatedStake: formatAmount(delegatedStake),
      totalStake: formatAmount(selfStake + delegatedStake),
      performanceScore: perfRaw ? perfRaw.performance_score : 0,
      uptime: perfRaw ? bpsToPercent(perfRaw.uptime_bps) : bpsToPercent(validator.uptime_bps ?? 0),
      slashCount: perfRaw ? perfRaw.slash_count : validator.slash_count ?? 0,
      isActive: Boolean(validator.is_active)
    };
  }
  async list() {
    const addresses = await getActiveValidators2(this.api);
    const results = await Promise.all(addresses.map((addr) => this.performance(addr)));
    return results.filter((v) => v !== null);
  }
};

// src/AwarizonCore.ts
var AwarizonCore = class {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.api = null;
    this.keyring = new AwarizonKeyring();
  }
  async connect() {
    await this.keyring.initialize();
    this.client = new AwarizonClient(this.config.endpoint);
    await this.client.connect();
    this.api = this.client.getApi();
    this.network = new NetworkModule(this.api);
    this.wallet = new WalletModule(this.api);
    this.inbox = new InboxModule(this.api);
    this.developer = new DeveloperModule(this.api);
    this.apps = new AppsModule(this.api);
    this.campaigns = new CampaignsModule(this.api);
    this.assets = new AssetsModule(this.api);
    this.nfts = new NFTsModule(this.api);
    this.validators = new ValidatorsModule(this.api);
    return this;
  }
  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
      this.api = null;
    }
  }
  isConnected() {
    return this.client !== null;
  }
  getApi() {
    if (!this.api) {
      throw new Error("Not connected. Call connect() first.");
    }
    return this.api;
  }
};
async function createCore(config) {
  const core = new AwarizonCore(config);
  await core.connect();
  return core;
}

// src/index.ts
import {
  RIZ as RIZ2,
  PLANCK,
  MICRO_RIZ,
  DEFAULT_ENDPOINT,
  MIN_SESSION_SECONDS as MIN_SESSION_SECONDS2,
  MIN_INTERACTIONS as MIN_INTERACTIONS2,
  MIN_CAMPAIGN_DURATION_DAYS,
  MAX_CAMPAIGN_DURATION_DAYS
} from "@awarizon/sdk";
export {
  AwarizonCore,
  AwarizonKeyring,
  DEFAULT_ENDPOINT,
  MAX_CAMPAIGN_DURATION_DAYS,
  MICRO_RIZ,
  MIN_CAMPAIGN_DURATION_DAYS,
  MIN_INTERACTIONS2 as MIN_INTERACTIONS,
  MIN_SESSION_SECONDS2 as MIN_SESSION_SECONDS,
  PLANCK,
  RIZ2 as RIZ,
  createCore,
  formatAmount,
  isValidAmount,
  parseAmount
};
//# sourceMappingURL=index.mjs.map