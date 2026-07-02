// Transaction result — returned by all write operations
export interface TxResult {
  hash: string
  blockNumber: number
  success: boolean
}

// Wallet balance
export interface Balance {
  free: string        // "1000.0000 RIZ"
  staked: string      // "100.0000 RIZ"
  reserved: string    // "50.0000 RIZ"
  total: string       // "1150.0000 RIZ"
  freePlanck: bigint  // raw planck for calculations
}

// Generated wallet
export interface GeneratedWallet {
  mnemonic: string    // 12 words space-separated
  address: string     // SS58 encoded
  publicKey: string   // hex 0x...
}

// Imported/loaded wallet
export interface WalletAccount {
  address: string
  publicKey: string
  name?: string
}

// Inbox record
export interface InboxItem {
  recordId: string
  campaignId: string
  developer: string
  manifestHash: string
  category: string
  status: 'Pending' | 'Delivered' | 'Dismissed' | 'Engaged'
  deliveredAt: number
  engagedAt: number | null
  rewardClaimed: boolean
  rewardEligible: boolean
}

// Claim result
export interface ClaimResult extends TxResult {
  reward: string   // "1.0000 RIZ"
}

// Developer profile/status
export interface DeveloperStatus {
  registered: boolean
  verified: boolean
  stake: string            // "10000.0000 RIZ"
  totalCampaigns: number
  totalDeliveries: number
  violationCount: number
}

// App manifest
export interface AppManifest {
  manifestHash: string
  developer: string
  category: string
  registeredAt: number
  metadataUri: string
}

// Campaign
export interface Campaign {
  campaignId: string
  developer: string
  manifestHash: string
  status: 'Pending' | 'Active' | 'Expired' | 'Terminated'
  createdAt: number
  expiresAt: number
  maxDeliveries: number
  currentDeliveries: number
  targetingDescription: string
}

// pallet-assets token
export interface Asset {
  id: number
  name: string
  symbol: string
  decimals: number
  supply: string
  owner: string
}

// Asset balance
export interface AssetBalance {
  assetId: number
  symbol: string
  balance: string
  balanceRaw: bigint
}

// NFT item
export interface NFTItem {
  collection: number
  item: number
  owner: string
  metadata: Record<string, unknown>
}

// Validator info
export interface ValidatorInfo {
  address: string
  selfStake: string
  delegatedStake: string
  totalStake: string
  performanceScore: number  // 0–100
  uptime: number            // 0–100
  slashCount: number
  isActive: boolean
}

// Network stats
export interface NetworkStats {
  totalWallets: number
  totalDeliveries: number
  activeCampaigns: number
  totalStaked: string
  currentEpoch: number
  inboxReserve: string
  totalExtrinsics: number
  circulatingSupply: string
  nonCirculatingSupply: string
}

// Human-friendly targeting criteria
export interface TargetingOptions {
  categories?: string[]
  minBalance?: string   // "10 RIZ"
  maxBalance?: string   // "1000 RIZ"
  minWalletAge?: number // days
  maxWalletAge?: number // days
  minActivity?: number  // tx count last 30 days
  maxActivity?: number
  regions?: number[]    // region codes, empty = all
}
