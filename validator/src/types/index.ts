// Re-exported from awarizon.js so the rest of the app has one place to
// import validator types from, and can extend them locally if a page
// ever needs a shape the SDK doesn't provide.
export type {
  ValidatorInfo,
  ValidatorPerformance,
  DelegationInfo,
  EpochRewardRecord,
} from 'awarizon.js'

export interface ManagedSlot {
  id: number
  activationCode: string
  customerWallet: string | null
  isActive: boolean
  nodeAddress: string
  yearlyFeeEth: number
  expiresAt: string | null
}

export interface ValidatorApplication {
  name: string
  email: string
  wallet: string
  country: string
  experience: string
  reason: string
}

export interface WalletState {
  address: string | null
  connected: boolean
  connecting: boolean
  error: string | null
}
