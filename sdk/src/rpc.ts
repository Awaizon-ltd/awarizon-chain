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
} from './types'

// ----------------------------------------------------------------
// Developer endpoints
// ----------------------------------------------------------------

export async function getDeveloperProfile(
  api: ApiPromise,
  account: string
): Promise<DeveloperProfile | null> {
  const result = await (api.rpc as any).awarizon.getDeveloperProfile(account)
  const json = result.toJSON()
  if (!json) return null
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
  return result.toJSON() as string[]
}

export async function getDeveloperManifests(
  api: ApiPromise,
  account: string
): Promise<string[]> {
  const result = await (api.rpc as any).awarizon.getDeveloperManifests(account)
  return result.toJSON() as string[]
}

// ----------------------------------------------------------------
// Campaign endpoints
// ----------------------------------------------------------------

export async function getCampaign(
  api: ApiPromise,
  campaignId: string
): Promise<Campaign | null> {
  const result = await (api.rpc as any).awarizon.getCampaign(campaignId)
  const json = result.toJSON()
  if (!json) return null
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
  const json = result.toJSON()
  if (!json) return null
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
  const json = result.toJSON()
  if (!json) return null
  return json as InboxRecord
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
  }
}

export async function getTokenStats(api: ApiPromise): Promise<TokenStats> {
  const result = await (api.rpc as any).awarizon.getTokenStats()
  return result.toJSON() as TokenStats
}
