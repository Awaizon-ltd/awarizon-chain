// Typed wrappers for all 15 Awarizon custom RPC methods.
// Wire names and return shapes derived from node/src/awarizon_rpc.rs.

import { ApiPromise } from '@polkadot/api'
import type {
  NetworkStats,
  CampaignDeliveryStatus,
  WalletTargetingProfile,
  ValidatorPerformanceResponse,
  TokenStats,
  DeveloperProfile,
  Campaign,
  InboxRecord,
  TransactionSummary,
  VestingSchedule,
  IdentityRecord,
  NameLookup,
  LinkedAddress,
  ChainType,
  LinkStatus,
  DexAssetWire,
  DexPoolResponse,
  DexQuoteResponse,
  DexTwapResponse,
} from './types'

// The `Json` RPC codec type has no array representation — its
// constructor does `Object.entries(value || {})` and stores the
// result in a Map, so a JSON array like `[a, b]` decodes to entries
// `[['0', a], ['1', b]]`. `.toJSON()` then rebuilds that as an
// *object* (`{"0": a, "1": b}`), never a real array — confirmed live
// against dex_getAllPools, which returned `{"0": {...pool}}` for a
// single pool. Any RPC method whose result is a top-level array (not
// a single object) needs this instead of a bare `.toJSON()` — the
// codec is a real Map underneath, so pulling `.values()` off it
// sidesteps the lossy object rebuild entirely.
function jsonArray<T>(result: any): T[] {
  if (result.isEmpty) return []
  return Array.from(result.values()) as T[]
}

// ----------------------------------------------------------------
// Developer endpoints
// ----------------------------------------------------------------

export async function getDeveloperProfile(
  api: ApiPromise,
  account: string
): Promise<DeveloperProfile | null> {
  const result = await (api.rpc as any).awarizon.getDeveloperProfile(account)
  // The `Json` RPC codec type has no concept of null — its constructor
  // does `Object.entries(value || {})`, so an RPC result of `null`
  // (Option::None on the node side) decodes to an empty Map, and
  // `.toJSON()` on that returns `{}`, not `null`. `{}` is truthy, so a
  // plain `if (!json)` check here never fires for an unregistered
  // account. `.isEmpty` reflects the real "zero entries" state.
  if (result.isEmpty) return null
  const json = result.toJSON()
  return {
    ...json,
    staked_riz: BigInt(json.staked_riz ?? '0'),
    total_deliveries: BigInt(json.total_deliveries ?? '0'),
  } as DeveloperProfile
}

export async function getDeveloperCampaigns(
  api: ApiPromise,
  account: string
): Promise<string[]> {
  const result = await (api.rpc as any).awarizon.getDeveloperCampaigns(account)
  return jsonArray<string>(result)
}

export async function getDeveloperManifests(
  api: ApiPromise,
  account: string
): Promise<string[]> {
  const result = await (api.rpc as any).awarizon.getDeveloperManifests(account)
  return jsonArray<string>(result)
}

// ----------------------------------------------------------------
// Campaign endpoints
// ----------------------------------------------------------------

export async function getCampaign(
  api: ApiPromise,
  campaignId: string
): Promise<Campaign | null> {
  const result = await (api.rpc as any).awarizon.getCampaign(campaignId)
  if (result.isEmpty) return null
  const json = result.toJSON()
  return {
    ...json,
    max_deliveries: BigInt(json.max_deliveries ?? '0'),
    current_deliveries: BigInt(json.current_deliveries ?? '0'),
    storage_fee_paid: BigInt(json.storage_fee_paid ?? '0'),
  } as Campaign
}

export async function getActiveCampaignCount(api: ApiPromise): Promise<bigint> {
  const result = await (api.rpc as any).awarizon.getActiveCampaignCount()
  return BigInt(result.toString())
}

export async function getCampaignDeliveryStatus(
  api: ApiPromise,
  campaignId: string
): Promise<CampaignDeliveryStatus | null> {
  const result = await (api.rpc as any).awarizon.getCampaignDeliveryStatus(campaignId)
  if (result.isEmpty) return null
  const json = result.toJSON()
  return {
    current_deliveries: BigInt(json.current_deliveries ?? '0'),
    max_deliveries: BigInt(json.max_deliveries ?? '0'),
    remaining: BigInt(json.remaining ?? '0'),
    percentage_used: json.percentage_used as number,
  }
}

// ----------------------------------------------------------------
// Inbox endpoints
// ----------------------------------------------------------------

export async function getInboxCount(
  api: ApiPromise,
  wallet: string
): Promise<number> {
  const result = await (api.rpc as any).awarizon.getInboxCount(wallet)
  return result.toNumber()
}

export async function getInboxRecord(
  api: ApiPromise,
  wallet: string,
  recordId: string
): Promise<InboxRecord | null> {
  const result = await (api.rpc as any).awarizon.getInboxRecord(wallet, recordId)
  if (result.isEmpty) return null
  return result.toJSON() as InboxRecord
}

// ----------------------------------------------------------------
// Targeting endpoints
// ----------------------------------------------------------------

export async function getWalletTargetingProfile(
  api: ApiPromise,
  wallet: string
): Promise<WalletTargetingProfile> {
  const result = await (api.rpc as any).awarizon.getWalletTargetingProfile(wallet)
  return result.toJSON() as WalletTargetingProfile
}

export async function checkCampaignMatch(
  api: ApiPromise,
  campaignId: string,
  wallet: string
): Promise<boolean> {
  const result = await (api.rpc as any).awarizon.checkCampaignMatch(campaignId, wallet)
  return result.isTrue
}

// ----------------------------------------------------------------
// Validator endpoints
// ----------------------------------------------------------------

export async function getActiveValidators(api: ApiPromise): Promise<string[]> {
  const result = await (api.rpc as any).awarizon.getActiveValidators()
  return result.toJSON() as string[]
}

export async function getValidatorCount(api: ApiPromise): Promise<number> {
  const result = await (api.rpc as any).awarizon.getValidatorCount()
  return result.toNumber()
}

export async function getValidatorPerformance(
  api: ApiPromise,
  account: string
): Promise<ValidatorPerformanceResponse | null> {
  const result = await (api.rpc as any).awarizon.getValidatorPerformance(account)
  return result.toJSON() as ValidatorPerformanceResponse | null
}

// ----------------------------------------------------------------
// Network stats endpoints
// ----------------------------------------------------------------

export async function getNetworkStats(api: ApiPromise): Promise<NetworkStats> {
  const result = await (api.rpc as any).awarizon.getNetworkStats()
  const json = result.toJSON() as Record<string, unknown>
  return {
    total_wallets: BigInt(String(json.total_wallets ?? '0')),
    total_deliveries: BigInt(String(json.total_deliveries ?? '0')),
    active_campaigns: BigInt(String(json.active_campaigns ?? '0')),
    total_staked: String(json.total_staked ?? '0'),
    current_epoch: BigInt(String(json.current_epoch ?? '0')),
    inbox_reserve_balance: String(json.inbox_reserve_balance ?? '0'),
    total_extrinsics: Number(json.total_extrinsics ?? 0),
    circulating_supply: String(json.circulating_supply ?? '0'),
    non_circulating_supply: String(json.non_circulating_supply ?? '0'),
  }
}

export async function getTokenStats(api: ApiPromise): Promise<TokenStats> {
  const result = await (api.rpc as any).awarizon.getTokenStats()
  return result.toJSON() as TokenStats
}

export async function getRecentTransactions(
  api: ApiPromise
): Promise<TransactionSummary[]> {
  const result = await (api.rpc as any).awarizon.getRecentTransactions()
  return jsonArray<any>(result).map((r: any) => ({
    block_number: Number(r.block_number ?? 0),
    extrinsic_index: Number(r.extrinsic_index ?? 0),
    success: Boolean(r.success),
  }))
}

export async function getBlockTransactions(
  api: ApiPromise,
  blockNumber: number
): Promise<TransactionSummary[]> {
  const result = await (api.rpc as any).awarizon.getBlockTransactions(blockNumber)
  return jsonArray<any>(result).map((r: any) => ({
    block_number: Number(r.block_number ?? 0),
    extrinsic_index: Number(r.extrinsic_index ?? 0),
    success: Boolean(r.success),
  }))
}

export async function getVestingSchedule(
  api: ApiPromise,
  account: string
): Promise<VestingSchedule[]> {
  const result = await (api.query as any).vesting.vesting(account)
  const json = result.toJSON()
  if (!json || !Array.isArray(json)) return []
  return json.map((v: any) => ({
    locked: String(v.locked ?? v.Locked ?? '0'),
    per_block: String(v.perBlock ?? v.per_block ?? '0'),
    starting_block: Number(v.startingBlock ?? v.starting_block ?? 0),
  }))
}

// ----------------------------------------------------------------
// Identity endpoints
// ----------------------------------------------------------------

export async function getIdentity(
  api: ApiPromise,
  account: string
): Promise<IdentityRecord | null> {
  const result = await (api.rpc as any).awarizon.getIdentity(account, null)
  if (result.isEmpty) return null
  const json = result.toJSON()
  return {
    account: json.account,
    rizName: json.riz_name ?? null,
    rizNameFull: json.riz_name ? json.riz_name + '.riz' : null,
    displayName: json.display_name ?? null,
    bio: json.bio ?? null,
    avatarUri: json.avatar_uri ?? null,
    website: json.website ?? null,
    registeredAt: Number(json.registered_at ?? 0),
    verified: Boolean(json.verified),
    reputationScore: Number(json.reputation_score ?? 0),
    linkedAddresses: (json.linked_addresses ?? []).map((la: any) => ({
      chain: la.chain as ChainType,
      address: la.address as string,
      status: la.status as LinkStatus,
      linkedAt: Number(la.linked_at ?? 0),
    })),
  }
}

export async function lookupName(
  api: ApiPromise,
  name: string
): Promise<NameLookup | null> {
  const result = await (api.rpc as any).awarizon.lookupName(name, null)
  if (result.isEmpty) return null
  const json = result.toJSON()
  const identity = json.identity ? await getIdentity(api, json.account) : null
  return {
    rizName: json.riz_name as string,
    account: json.account as string,
    identity,
  }
}

export async function getLinkedAddresses(
  api: ApiPromise,
  account: string
): Promise<LinkedAddress[]> {
  const result = await (api.rpc as any).awarizon.getLinkedAddresses(account, null)
  const arr = result.toJSON() as any[]
  if (!Array.isArray(arr)) return []
  return arr.map((la: any) => ({
    chain: la.chain as ChainType,
    address: la.address as string,
    status: la.status as LinkStatus,
    linkedAt: Number(la.linked_at ?? 0),
  }))
}

export async function isNameAvailable(
  api: ApiPromise,
  name: string
): Promise<boolean> {
  const result = await (api.rpc as any).awarizon.isNameAvailable(name, null)
  return Boolean(result.toJSON())
}

export async function getTotalIdentities(api: ApiPromise): Promise<number> {
  const result = await (api.rpc as any).awarizon.getTotalIdentities(null)
  return result.toNumber()
}

// ----------------------------------------------------------------
// DEX endpoints — separate "dex" RPC namespace (see customTypes.ts)
// ----------------------------------------------------------------

// getPool/getQuote/getTwap all take a DexAssetWire ('native' — a bare
// string — or { token: id }) as a 'Json'-typed param. @polkadot/api
// encodes a Json param by running the raw JS value through the same
// Json codec used to decode responses, and that codec's constructor
// does `Object.entries(value || {})` — fine for the {token: id}
// object case, but for the bare string 'native' it explodes into
// per-character entries (confirmed live: `createType('Json',
// 'native').toJSON()` -> `{"0":"n","1":"a",...}`), which the node
// then rejects with "unknown variant `0`, expected `native` or
// `token`". Routing these three through the raw provider instead
// sends the plain JS value as-is (proper JSON.stringify, no codec
// involved) and returns already-decoded plain JSON — sidesteps this
// on both the request and response side.
async function dexRpcSend<T>(api: ApiPromise, method: string, params: unknown[]): Promise<T> {
  return (api as any)._rpcCore.provider.send(`dex_${method}`, params)
}

export async function getDexPool(
  api: ApiPromise,
  assetA: DexAssetWire,
  assetB: DexAssetWire
): Promise<DexPoolResponse | null> {
  return dexRpcSend<DexPoolResponse | null>(api, 'getPool', [assetA, assetB])
}

export async function getDexQuote(
  api: ApiPromise,
  assetIn: DexAssetWire,
  assetOut: DexAssetWire,
  amountIn: string
): Promise<DexQuoteResponse> {
  return dexRpcSend<DexQuoteResponse>(api, 'getQuote', [assetIn, assetOut, amountIn])
}

export async function getDexTwap(
  api: ApiPromise,
  assetA: DexAssetWire,
  assetB: DexAssetWire
): Promise<DexTwapResponse | null> {
  return dexRpcSend<DexTwapResponse | null>(api, 'getTwap', [assetA, assetB])
}

export async function getAllDexPools(
  api: ApiPromise,
  limit = 50
): Promise<DexPoolResponse[]> {
  const result = await (api.rpc as any).dex.getAllPools(limit)
  return jsonArray<DexPoolResponse>(result)
}

export async function getDexFeeDestination(api: ApiPromise): Promise<'burn' | 'treasury'> {
  const result = await (api.rpc as any).dex.getFeeDestination()
  return result.toString().toLowerCase() === 'treasury' ? 'treasury' : 'burn'
}

export async function getDexTotalBurned(api: ApiPromise): Promise<string> {
  const result = await (api.rpc as any).dex.getTotalBurned()
  return result.toString()
}
