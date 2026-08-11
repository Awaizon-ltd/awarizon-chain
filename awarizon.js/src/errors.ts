export type ErrorCode =
  | 'NOT_CONNECTED'
  | 'NOT_SIGNED'
  | 'WRONG_PASSWORD'
  | 'INVALID_MNEMONIC'
  | 'INVALID_AMOUNT'
  | 'INVALID_ADDRESS'
  | 'NAME_NOT_FOUND'
  | 'NAME_TAKEN'
  | 'NAME_INVALID'
  | 'INSUFFICIENT_BALANCE'
  | 'TRANSACTION_FAILED'
  | 'NOT_REGISTERED'
  | 'CONTRACT_NOT_FOUND'
  | 'NOT_SUPPORTED'
  | 'MODULE_ERROR'
  | 'BAD_ORIGIN'
  | 'CANNOT_LOOKUP'
  | 'TOKEN_ERROR'
  | 'ARITHMETIC_ERROR'
  | 'SIGN_ERROR'
  | 'USER_REJECTED'
  | 'TIMEOUT'
  | 'SWAP_ERROR'
  | 'SLIPPAGE_EXCEEDED'
  | 'UNKNOWN'

// ── Chain error registry ─────────────────────────
// Maps "pallet.ErrorName" (DispatchError module error, decoded via the
// chain's metadata) to a human readable message. Keys are verified against
// each pallet's `enum Error<T>` — see pallets/*/src/lib.rs — rather than
// guessed, since a stale key here silently falls back to
// formatUnknownError() instead of matching.
export const CHAIN_ERRORS: Record<string, string> = {

  // ── awarizon-state ───────────────────────────

  'awarizonState.DeveloperNotFound':
    'Developer profile not found. Please register as a developer first.',
  'awarizonState.DeveloperAlreadyRegistered':
    'You are already registered as a developer.',
  'awarizonState.DeveloperNotVerified':
    'Your developer account is not yet verified. Stake the minimum ' +
    'required RIZ to activate your account.',
  'awarizonState.DeveloperSuspended':
    'Your developer account has been suspended. Contact support for assistance.',
  'awarizonState.ManifestNotFound':
    'App manifest not found. The app may have been removed.',
  'awarizonState.ManifestAlreadyRegistered':
    'This app manifest has already been registered.',
  'awarizonState.ManifestLimitReached':
    'You have reached the maximum number of app manifests allowed.',
  'awarizonState.CampaignNotFound':
    'Campaign not found. It may have expired or the ID is incorrect.',
  'awarizonState.CampaignNotActive':
    'This campaign is no longer active. It may have been terminated or expired.',
  'awarizonState.CampaignExpired':
    'This campaign has expired and is no longer accepting deliveries.',
  'awarizonState.CampaignDeliveryLimitReached':
    'This campaign has reached its maximum number of deliveries.',
  'awarizonState.InboxRecordNotFound':
    'Inbox record not found. This app may have been dismissed or does not exist.',
  'awarizonState.InboxAlreadyDelivered':
    'This app has already been delivered to your inbox.',
  'awarizonState.InboxFull':
    'Your inbox is full. Dismiss some apps before receiving new ones.',
  'awarizonState.EngagementCooldownActive':
    'Please wait before submitting another engagement. A cooldown period is active.',
  'awarizonState.EngagementDailyLimitReached':
    'You have reached your daily engagement limit. Try again tomorrow.',
  'awarizonState.EngagementInvalid':
    'Cannot submit engagement. Make sure you have received this app and ' +
    'have not already claimed the reward.',
  'awarizonState.InsufficientStake':
    'Insufficient stake for this action.',
  'awarizonState.InsufficientBalance':
    'Insufficient RIZ balance to complete this transaction.',
  'awarizonState.TargetingDimensionLimitExceeded':
    'Too many targeting dimensions. Reduce your targeting criteria.',
  'awarizonState.InvalidManifestHash':
    'Invalid manifest hash.',
  'awarizonState.InvalidCampaignId':
    'Invalid campaign ID format.',
  'awarizonState.Unauthorized':
    'You are not authorized to perform this action.',
  'awarizonState.EpochNotReady':
    'The current epoch has not ended yet. Wait for the epoch to complete.',
  'awarizonState.NotExpiredYet':
    'This campaign has not expired yet.',
  'awarizonState.ResetNotReady':
    'Daily reset is not ready yet.',

  // ── awarizon-consensus ────────────────────────

  'awarizonConsensus.ValidatorAlreadyRegistered':
    'You are already registered as a validator.',
  'awarizonConsensus.ValidatorNotFound':
    'Validator not found.',
  'awarizonConsensus.InsufficientStake':
    'Insufficient stake. You need to stake more RIZ to perform this action.',
  'awarizonConsensus.RegionCapExceeded':
    'The validator cap for your region has been reached.',
  'awarizonConsensus.CountryCapExceeded':
    'The validator cap for your country has been reached.',
  'awarizonConsensus.DelegationNotFound':
    'Delegation not found.',
  'awarizonConsensus.CannotDelegateToSelf':
    'Validators cannot delegate to themselves.',
  'awarizonConsensus.ValidatorNotActive':
    'This validator is not currently active.',
  'awarizonConsensus.AlreadyDelegated':
    'You have already delegated to this validator.',
  'awarizonConsensus.MaxValidatorsReached':
    'The maximum number of validators has been reached.',
  'awarizonConsensus.InsufficientBalance':
    'Insufficient RIZ balance for staking.',
  'awarizonConsensus.CommissionTooHigh':
    'Commission rate exceeds the maximum allowed (20%).',
  'awarizonConsensus.NoPendingReward':
    'No pending rewards to claim.',
  'awarizonConsensus.InsufficientInsuranceFund':
    'The insurance fund has insufficient balance to cover this compensation.',
  'awarizonConsensus.SlashExceedsStake':
    'The slash amount exceeds this validator\'s remaining stake.',
  'awarizonConsensus.NotDelegating':
    'You are not currently delegating to this validator.',
  'awarizonConsensus.NoSlashOccurred':
    'No slash event found to compensate.',
  'awarizonConsensus.InsufficientEvidence':
    'Insufficient evidence provided for this action.',
  'awarizonConsensus.YieldReserveEmpty':
    'The yield reserve is empty. Rewards cannot be paid out right now.',

  // ── awarizon-dex ───────────────────────────────

  'awarizonDex.PoolAlreadyExists':
    'A liquidity pool already exists for this token pair.',
  'awarizonDex.PoolNotFound':
    'Liquidity pool not found for this token pair.',
  'awarizonDex.InsufficientLiquidity':
    'Insufficient liquidity in this pool. Try a smaller amount.',
  'awarizonDex.InsufficientInputAmount':
    'Input amount is too low for this swap.',
  'awarizonDex.InsufficientOutputAmount':
    'Output amount is below your minimum. Increase slippage tolerance or ' +
    'try a smaller amount.',
  'awarizonDex.SlippageExceeded':
    'Price moved too much. Increase your slippage tolerance and try again.',
  'awarizonDex.InvalidPath':
    'Invalid swap path. No route found between these tokens.',
  'awarizonDex.TooManyHops':
    'Swap route requires too many hops. Try a more direct route.',
  'awarizonDex.NoRouteFound':
    'No swap route found between these tokens. Try swapping via RIZ as an intermediate.',
  'awarizonDex.AmountTooLow':
    'Amount is too low. Please enter a larger amount.',
  'awarizonDex.Overflow':
    'Amount overflow. The numbers involved are too large.',
  'awarizonDex.IdenticalAssets':
    'Cannot create a pool with two identical assets.',
  'awarizonDex.InsufficientLPTokens':
    'Insufficient LP tokens to remove this much liquidity.',
  'awarizonDex.EmptyPool':
    'This pool has no liquidity yet. Be the first to add liquidity.',
  'awarizonDex.BelowMinimumLiquidity':
    'Amount is below the minimum liquidity required for this pool.',
  'awarizonDex.DeadlineExceeded':
    'Transaction deadline exceeded. Please try again.',
  'awarizonDex.Reentrancy':
    'Reentrancy detected. Please try again.',

  // ── awarizon-identity ──────────────────────────

  'awarizonIdentity.NameAlreadyTaken':
    'This .riz name is already taken. Please choose a different name.',
  'awarizonIdentity.NameTooShort':
    'Name is too short. Must be at least 3 characters.',
  'awarizonIdentity.NameTooLong':
    'Name is too long. Must be 32 characters or less.',
  'awarizonIdentity.NameInvalidCharacters':
    'Name contains invalid characters. Only lowercase letters, numbers, ' +
    'and hyphens are allowed.',
  'awarizonIdentity.NameInvalidFormat':
    'Invalid name format. Names cannot start or end with a hyphen.',
  'awarizonIdentity.IdentityAlreadyRegistered':
    'You already have a .riz name registered.',
  'awarizonIdentity.IdentityNotFound':
    'Identity not found. This .riz name does not exist.',
  'awarizonIdentity.NotNameOwner':
    'You do not own this .riz name.',
  'awarizonIdentity.TransferTargetHasName':
    'The target address already has a .riz name registered.',

  // ── awarizon-links ─────────────────────────────

  'awarizonLinks.AddressAlreadyLinked':
    'This address is already linked to your identity.',
  'awarizonLinks.AddressClaimedByOther':
    'This address is already linked to a different identity.',
  'awarizonLinks.InvalidSignature':
    'Invalid signature. Please make sure you are signing with the correct wallet.',
  'awarizonLinks.UnsupportedChain':
    'This chain is not supported for address linking.',
  'awarizonLinks.LinkNotFound':
    'Linked address not found.',
  'awarizonLinks.MaxLinksReached':
    'You have reached the maximum number of linked addresses.',
  'awarizonLinks.InvalidAddressLength':
    'Invalid address length for this chain.',

  // ── pallet-assets ──────────────────────────────

  'assets.BalanceLow':
    'Insufficient token balance.',
  'assets.NoAccount':
    'No asset account found for this address.',
  'assets.NoPermission':
    'You do not have permission to perform this action on this asset.',
  'assets.Unknown':
    'Asset not found.',
  'assets.Frozen':
    'This asset is frozen and transfers are not allowed.',
  'assets.InUse':
    'Asset is currently in use and cannot be destroyed.',
  'assets.BadWitness':
    'Invalid witness data provided.',
  'assets.MinBalanceZero':
    'Minimum balance cannot be zero.',
  'assets.Unapproved':
    'This transfer has not been approved.',
  'assets.WouldDie':
    'This transfer would cause the sender account to be removed. ' +
    'Keep a minimum balance.',
  'assets.AlreadyExists':
    'An asset with this ID already exists.',
  'assets.NotFrozen':
    'This asset is not frozen.',
  'assets.BadAssetId':
    'Invalid asset ID.',

  // ── pallet-nfts ────────────────────────────────

  'nfts.NoPermission':
    'You do not have permission to perform this action on this NFT.',
  'nfts.UnknownCollection':
    'NFT collection not found.',
  'nfts.AlreadyExists':
    'This NFT item already exists.',
  'nfts.ApprovalExpired':
    'NFT transfer approval has expired.',
  'nfts.WrongOwner':
    'You are not the owner of this NFT.',
  'nfts.BadWitness':
    'Invalid witness data provided.',
  'nfts.CollectionIdInUse':
    'This collection ID is already in use.',
  'nfts.ItemsNonTransferable':
    'Items in this collection cannot be transferred.',
  'nfts.NotDelegate':
    'You are not an approved delegate for this NFT.',
  'nfts.WrongDelegate':
    'Wrong delegate address provided.',
  'nfts.Unapproved':
    'This transfer has not been approved.',
  'nfts.Unaccepted':
    'Collection ownership transfer has not been accepted.',
  'nfts.ItemLocked':
    'This NFT item is locked and cannot be transferred.',
  'nfts.LockedItemMetadata':
    'This NFT item metadata is locked and cannot be changed.',
  'nfts.LockedCollectionMetadata':
    'This collection metadata is locked and cannot be changed.',
  'nfts.LockedCollectionAttributes':
    'Collection attributes are locked.',
  'nfts.MaxSupplyReached':
    'This collection has reached its maximum supply.',
  'nfts.MaxSupplyLocked':
    'Maximum supply is locked and cannot be changed.',
  'nfts.MaxSupplyTooSmall':
    'The provided max supply is less than the number of items already minted.',
  'nfts.UnknownItem':
    'NFT item not found.',
  'nfts.NoConfig':
    'No configuration found for this collection.',
  'nfts.NotForSale':
    'This NFT is not listed for sale.',
  'nfts.BidTooLow':
    'Your bid is below the asking price.',
  'nfts.ReachedApprovalLimit':
    'Maximum number of approvals reached.',
  'nfts.InconsistentItemConfig':
    'Inconsistent item configuration.',
  'nfts.MintNotStarted':
    'Minting has not started yet for this collection.',
  'nfts.MintEnded':
    'Minting has already ended for this collection.',
  'nfts.CollectionNotEmpty':
    'This collection still has items and cannot be deleted.',
  'nfts.WitnessRequired':
    'Witness data is required for this call.',

  // ── balances ───────────────────────────────────

  'balances.VestingBalance':
    'Cannot transfer vesting balance.',
  'balances.LiquidityRestrictions':
    'Account has liquidity restrictions that prevent this transfer.',
  'balances.InsufficientBalance':
    'Insufficient RIZ balance.',
  'balances.ExistentialDeposit':
    'Transfer would leave balance below existential deposit. ' +
    'Keep at least 0.001 RIZ in your account.',
  'balances.Expendability':
    'This transfer would remove your account. Keep a minimum balance.',
  'balances.ExistingVestingSchedule':
    'A vesting schedule already exists for this account.',
  'balances.DeadAccount':
    'Cannot transfer to a dead account.',
  'balances.TooManyReserves':
    'Too many reserved amounts on account.',
  'balances.TooManyHolds':
    'Too many holds on account.',
  'balances.TooManyFreezes':
    'Too many frozen amounts on account.',

  // ── system (generic fallbacks) ─────────────────

  'system.CallFiltered':
    'This action is not allowed.',
  'system.InvalidSpecName':
    'Invalid runtime specification.',
  'system.SpecVersionNeedsToIncrease':
    'Runtime spec version needs to increase.',
  'system.NonZeroRefCount':
    'Account still has non-zero references.',
}

// Parse a chain error into a human readable message. Works with a
// DispatchError from @polkadot/api's signAndSend callback, a plain Error,
// or a raw string from the RPC layer.
export function parseChainError(error: any, registry?: any): string {
  try {
    if (error?.isModule) {
      const decoded = registry ? safeFindMetaError(error.asModule, registry) : null

      if (decoded) {
        const key = `${decoded.section}.${decoded.name}`
        const message = CHAIN_ERRORS[key]
        if (message) return message

        return formatUnknownError(
          decoded.section,
          decoded.name,
          decoded.docs?.join(' ') ?? ''
        )
      }
      return 'Transaction failed. Please try again.'
    }

    if (error?.isBadOrigin) {
      return 'You are not authorized to perform this action.'
    }

    if (error?.isCannotLookup) {
      return 'Required data not found on chain.'
    }

    if (error?.isToken) {
      const token = error.asToken
      if (token?.isFundsUnavailable) return 'Insufficient balance.'
      if (token?.isWouldDie) {
        return 'Transfer would remove your account. Keep a minimum balance.'
      }
      if (token?.isFrozen) return 'Your account is frozen.'
      return `Token error: ${token?.type ?? 'unknown'}`
    }

    if (error?.isArithmetic) {
      return 'Arithmetic error in transaction. The amounts involved may be ' +
        'too large or too small.'
    }

    if (error?.isTransactional) {
      return 'Transaction failed. Please try again.'
    }

    if (error?.isOther) {
      return 'An unknown error occurred. Please try again.'
    }

    if (typeof error === 'string') {
      return parseStringError(error)
    }

    if (error?.message) {
      return parseStringError(error.message)
    }

    return 'Transaction failed. Please try again.'
  } catch {
    return 'An unexpected error occurred.'
  }
}

function safeFindMetaError(asModule: any, registry: any): { section: string; name: string; docs?: string[] } | null {
  try {
    return registry.findMetaError(asModule)
  } catch {
    return null
  }
}

function parseStringError(msg: string): string {
  const lower = msg.toLowerCase()

  if (lower.includes('insufficient balance') || lower.includes('funds unavailable')) {
    return 'Insufficient RIZ balance.'
  }
  if (lower.includes('priority too low') || lower.includes('transaction pool')) {
    return 'Transaction pool is full. Please try again in a moment.'
  }
  if (lower.includes('nonce') || lower.includes('stale')) {
    return 'Transaction is stale. Please refresh and try again.'
  }
  if (lower.includes('bad signature') || lower.includes('invalid signature')) {
    return 'Invalid signature. Please try again.'
  }
  if (lower.includes('would die') || lower.includes('existential')) {
    return 'Transfer would leave your balance too low. Keep at least 0.001 RIZ.'
  }
  if (lower.includes('timeout') || lower.includes('disconnected')) {
    return 'Connection lost. Please check your internet connection and try again.'
  }
  if (lower.includes('cancelled') || lower.includes('rejected')) {
    return 'Transaction was cancelled.'
  }

  return msg.length > 100 ? msg.slice(0, 100) + '...' : msg
}

function formatUnknownError(section: string, name: string, docs: string): string {
  if (docs) return docs

  const readableName = name
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase()
  return `Error: ${readableName} (${section}.${name})`
}

function errorCodeFor(error: any): ErrorCode {
  if (error?.isModule) return 'MODULE_ERROR'
  if (error?.isBadOrigin) return 'BAD_ORIGIN'
  if (error?.isCannotLookup) return 'CANNOT_LOOKUP'
  if (error?.isToken) return 'TOKEN_ERROR'
  if (error?.isArithmetic) return 'ARITHMETIC_ERROR'
  return 'UNKNOWN'
}

function palletFor(error: any, registry?: any): string | undefined {
  if (error?.isModule && registry) {
    const decoded = safeFindMetaError(error.asModule, registry)
    return decoded?.section
  }
  return undefined
}

export class AwarizonError extends Error {
  readonly code: ErrorCode
  readonly pallet?: string
  readonly raw?: unknown

  constructor(message: string, code: ErrorCode, pallet?: string, raw?: unknown) {
    super(message)
    this.name = 'AwarizonError'
    this.code = code
    this.pallet = pallet
    this.raw = raw
  }

  static notConnected() {
    return new AwarizonError(
      'Not connected to Awarizon. ' +
      'Call Provider.connect() or wallet.connect() first.',
      'NOT_CONNECTED'
    )
  }

  static notSigned() {
    return new AwarizonError(
      'This operation requires a connected wallet. ' +
      'Use wallet.connect(endpoint) to get a Signer.',
      'NOT_SIGNED'
    )
  }

  static invalidMnemonic() {
    return new AwarizonError(
      'Invalid mnemonic phrase. ' +
      'Check all words and try again.',
      'INVALID_MNEMONIC'
    )
  }

  static userRejected() {
    return new AwarizonError(
      'Transaction was cancelled.',
      'USER_REJECTED'
    )
  }

  static timeout() {
    return new AwarizonError(
      'Transaction timed out. Please try again.',
      'TIMEOUT'
    )
  }

  static insufficientBalance(needed?: string, have?: string) {
    const detail = needed && have ? ` Need ${needed} RIZ, have ${have} RIZ.` : ''
    return new AwarizonError(
      `Insufficient RIZ balance.${detail}`,
      'INSUFFICIENT_BALANCE',
      'balances',
    )
  }

  // Legacy heuristic — matches known error keywords against a
  // stringified error/message. Kept for call sites that only have a
  // message (not a decodable DispatchError), e.g. wallet.connect()
  // failures. Prefer fromChainError() when a registry is available.
  static fromChain(err: unknown): AwarizonError {
    const msg = err instanceof Error ? err.message : String(err)

    if (msg.includes('InsufficientBalance') || msg.includes('insufficient')) {
      return AwarizonError.insufficientBalance()
    }
    if (msg.includes('NameAlreadyTaken')) {
      return new AwarizonError(
        'This .riz name is already taken. ' +
        'Try a different name.',
        'NAME_TAKEN'
      )
    }
    if (msg.includes('DeveloperNotFound') || msg.includes('NotRegistered')) {
      return new AwarizonError(
        'Developer not registered. ' +
        'Call signer.developer.register() first.',
        'NOT_REGISTERED'
      )
    }
    return new AwarizonError(
      `Transaction failed: ${msg}`,
      'TRANSACTION_FAILED'
    )
  }

  // Decode a DispatchError (or any chain/RPC error) into an AwarizonError
  // with a human readable message. Pass `registry` (api.registry, or
  // extrinsic.registry) to resolve module errors to their pallet.ErrorName.
  static fromChainError(error: any, registry?: any): AwarizonError {
    const message = parseChainError(error, registry)
    const code = errorCodeFor(error)
    const pallet = palletFor(error, registry)
    return new AwarizonError(message, code, pallet, error)
  }
}
