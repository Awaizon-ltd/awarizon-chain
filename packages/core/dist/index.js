"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AwarizonCore: () => AwarizonCore,
  AwarizonKeyring: () => AwarizonKeyring,
  DEFAULT_ENDPOINT: () => import_sdk12.DEFAULT_ENDPOINT,
  MAX_CAMPAIGN_DURATION_DAYS: () => import_sdk12.MAX_CAMPAIGN_DURATION_DAYS,
  MICRO_RIZ: () => import_sdk12.MICRO_RIZ,
  MIN_CAMPAIGN_DURATION_DAYS: () => import_sdk12.MIN_CAMPAIGN_DURATION_DAYS,
  MIN_INTERACTIONS: () => import_sdk12.MIN_INTERACTIONS,
  MIN_SESSION_SECONDS: () => import_sdk12.MIN_SESSION_SECONDS,
  PLANCK: () => import_sdk12.PLANCK,
  RIZ: () => import_sdk12.RIZ,
  createCore: () => createCore,
  formatAmount: () => formatAmount,
  isValidAmount: () => isValidAmount,
  parseAmount: () => parseAmount
});
module.exports = __toCommonJS(index_exports);

// src/AwarizonCore.ts
var import_sdk11 = require("@awarizon/sdk");

// src/keyring/index.ts
var import_util_crypto = require("@polkadot/util-crypto");
var import_keyring = require("@polkadot/keyring");
var import_util = require("@polkadot/util");
var AwarizonKeyring = class {
  constructor() {
    this.keyring = new import_keyring.Keyring({ type: "sr25519", ss58Format: 42 });
  }
  async initialize() {
    await (0, import_util_crypto.cryptoWaitReady)();
  }
  generate(wordCount = 12) {
    const mnemonic = (0, import_util_crypto.mnemonicGenerate)(wordCount);
    const pair = this.keyring.addFromMnemonic(mnemonic);
    return {
      mnemonic,
      address: pair.address,
      publicKey: (0, import_util.u8aToHex)(pair.publicKey)
    };
  }
  validate(mnemonic) {
    return (0, import_util_crypto.mnemonicValidate)(mnemonic);
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
      publicKey: (0, import_util.u8aToHex)(pair.publicKey)
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
var import_sdk2 = require("@awarizon/sdk");

// src/utils/amounts.ts
var import_sdk = require("@awarizon/sdk");
function parseAmount(input) {
  const clean = input.replace(/\s*RIZ\s*/gi, "").trim();
  if (!clean || isNaN(Number(clean))) {
    throw new Error(
      `Invalid amount: "${input}". Use format "10 RIZ" or "10"`
    );
  }
  const [whole, decimal = ""] = clean.split(".");
  const paddedDecimal = decimal.padEnd(12, "0").slice(0, 12);
  return BigInt(whole || "0") * import_sdk.RIZ + BigInt(paddedDecimal);
}
function formatAmount(planck, decimals = 4) {
  const whole = planck / import_sdk.RIZ;
  const remainder = planck % import_sdk.RIZ;
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
    const raw = await (0, import_sdk2.getNetworkStats)(this.api);
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
    const raw = await (0, import_sdk2.getTokenStats)(this.api);
    return {
      totalIssuance: formatAmount(BigInt(raw.total_issuance)),
      engagementPool: formatAmount(BigInt(raw.engagement_pool_balance))
    };
  }
  async validatorCount() {
    const count = await (0, import_sdk2.getValidatorCount)(this.api);
    return Number(count);
  }
  async activeValidators() {
    return (0, import_sdk2.getActiveValidators)(this.api);
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
var import_sdk3 = require("@awarizon/sdk");
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
    const result = await (0, import_sdk3.signAndSend)(this.api, ext, params.signer);
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
var import_sdk4 = require("@awarizon/sdk");
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
    const raw = await (0, import_sdk4.getInboxRecord)(this.api, address, recordId);
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
    return (0, import_sdk4.getInboxCount)(this.api, address);
  }
  async engage(params) {
    const sessionSeconds = params.sessionSeconds ?? import_sdk4.MIN_SESSION_SECONDS;
    const interactions = params.interactions ?? import_sdk4.MIN_INTERACTIONS;
    const ext = (0, import_sdk4.buildSubmitEngagement)(
      this.api,
      params.recordId,
      sessionSeconds,
      interactions
    );
    const result = await (0, import_sdk4.signAndSend)(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async claim(params) {
    const ext = (0, import_sdk4.buildClaimReward)(this.api, params.recordId);
    const result = await (0, import_sdk4.signAndSend)(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true, reward: "1.0000 RIZ" };
  }
  async dismiss(params) {
    const ext = (0, import_sdk4.buildDismissInboxRecord)(this.api, params.recordId);
    const result = await (0, import_sdk4.signAndSend)(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
};

// src/modules/developer.ts
var import_sdk5 = require("@awarizon/sdk");
var DeveloperModule = class {
  constructor(api) {
    this.api = api;
  }
  async register(params) {
    const ext = (0, import_sdk5.buildRegisterDeveloper)(this.api);
    const result = await (0, import_sdk5.signAndSend)(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async stake(params) {
    const planck = parseAmount(params.amount);
    const ext = (0, import_sdk5.buildStakeRiz)(this.api, planck);
    const result = await (0, import_sdk5.signAndSend)(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async status(address) {
    const profile = await (0, import_sdk5.getDeveloperProfile)(this.api, address);
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
var import_sdk6 = require("@awarizon/sdk");
var AppsModule = class {
  constructor(api) {
    this.api = api;
  }
  async register(params) {
    const ext = (0, import_sdk6.buildRegisterManifest)(
      this.api,
      params.manifestHash,
      params.category,
      params.metadataUri
    );
    const result = await (0, import_sdk6.signAndSend)(this.api, ext, params.signer);
    return {
      hash: result.blockHash,
      blockNumber: 0,
      success: true,
      manifestHash: params.manifestHash
    };
  }
  async list(developerAddress) {
    const hashes = await (0, import_sdk6.getDeveloperManifests)(this.api, developerAddress);
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
var import_sdk7 = require("@awarizon/sdk");
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
    const campaignId = (0, import_sdk7.generateCampaignId)(params.manifestHash);
    const criteria = buildTargetingCriteria(params.targeting);
    const ext = (0, import_sdk7.buildCreateCampaign)(
      this.api,
      campaignId,
      params.manifestHash,
      criteria,
      params.durationDays,
      params.maxDeliveries
    );
    const result = await (0, import_sdk7.signAndSend)(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true, campaignId };
  }
  async get(campaignId) {
    const raw = await (0, import_sdk7.getCampaign)(this.api, campaignId);
    if (!raw) return null;
    return rawToCampaign(raw);
  }
  async terminate(params) {
    const ext = (0, import_sdk7.buildTerminateCampaign)(this.api, params.campaignId);
    const result = await (0, import_sdk7.signAndSend)(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async deliver(params) {
    const ext = (0, import_sdk7.buildDeliverToInbox)(
      this.api,
      params.wallet,
      params.campaignId,
      params.recordId
    );
    const result = await (0, import_sdk7.signAndSend)(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async deliveryStatus(campaignId) {
    const raw = await (0, import_sdk7.getCampaignDeliveryStatus)(this.api, campaignId);
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
var import_sdk8 = require("@awarizon/sdk");
var AssetsModule = class {
  constructor(api) {
    this.api = api;
  }
  async create(params) {
    const ext = (0, import_sdk8.buildCreateAsset)(this.api, params.id, params.admin, params.minBalance);
    const result = await (0, import_sdk8.signAndSend)(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true, assetId: params.id };
  }
  async mint(params) {
    const ext = (0, import_sdk8.buildMintAsset)(this.api, params.assetId, params.to, params.amount);
    const result = await (0, import_sdk8.signAndSend)(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async transfer(params) {
    const ext = (0, import_sdk8.buildTransferAsset)(this.api, params.assetId, params.to, params.amount);
    const result = await (0, import_sdk8.signAndSend)(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async burn(params) {
    const ext = this.api.tx.assets.burn(params.assetId, params.who, params.amount);
    const result = await (0, import_sdk8.signAndSend)(this.api, ext, params.signer);
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
var import_sdk9 = require("@awarizon/sdk");
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
    const result = await (0, import_sdk9.signAndSend)(this.api, ext, params.signer);
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
    const result = await (0, import_sdk9.signAndSend)(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async transfer(params) {
    const ext = this.api.tx.nfts.transfer(params.collection, params.item, params.to);
    const result = await (0, import_sdk9.signAndSend)(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async burn(params) {
    const ext = this.api.tx.nfts.burn(params.collection, params.item);
    const result = await (0, import_sdk9.signAndSend)(this.api, ext, params.signer);
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
var import_sdk10 = require("@awarizon/sdk");
function bpsToPercent(bps) {
  return Math.round(bps / 100);
}
var ValidatorsModule = class {
  constructor(api) {
    this.api = api;
  }
  async register(params) {
    const planck = parseAmount(params.stake);
    const ext = (0, import_sdk10.buildRegisterValidator)(this.api, planck, params.regionCode, params.countryCode);
    const result = await (0, import_sdk10.signAndSend)(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async delegate(params) {
    const planck = parseAmount(params.amount);
    const ext = (0, import_sdk10.buildDelegateStake)(this.api, params.to, planck);
    const result = await (0, import_sdk10.signAndSend)(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async undelegate(params) {
    const ext = (0, import_sdk10.buildUndelegateStake)(this.api, params.from);
    const result = await (0, import_sdk10.signAndSend)(this.api, ext, params.signer);
    return { hash: result.blockHash, blockNumber: 0, success: true };
  }
  async performance(address) {
    const [validatorRaw, perfRaw] = await Promise.all([
      this.api.query.awarizonConsensus.validators(address),
      (0, import_sdk10.getValidatorPerformance)(this.api, address)
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
    const addresses = await (0, import_sdk10.getActiveValidators)(this.api);
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
    this.client = new import_sdk11.AwarizonClient(this.config.endpoint);
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
var import_sdk12 = require("@awarizon/sdk");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AwarizonCore,
  AwarizonKeyring,
  DEFAULT_ENDPOINT,
  MAX_CAMPAIGN_DURATION_DAYS,
  MICRO_RIZ,
  MIN_CAMPAIGN_DURATION_DAYS,
  MIN_INTERACTIONS,
  MIN_SESSION_SECONDS,
  PLANCK,
  RIZ,
  createCore,
  formatAmount,
  isValidAmount,
  parseAmount
});
//# sourceMappingURL=index.js.map