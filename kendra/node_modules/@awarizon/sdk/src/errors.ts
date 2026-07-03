// Typed error classes matching on-chain error variants.
// Error names derived from:
//   pallets/awarizon-state/src/lib.rs — Error<T> enum
//   pallets/awarizon-consensus/src/lib.rs — Error<T> enum

export class AwarizonError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'AwarizonError'
  }
}

// ----------------------------------------------------------------
// awarizon-state errors
// ----------------------------------------------------------------

export class DeveloperNotFoundError extends AwarizonError {
  constructor() { super('Developer not found', 'DeveloperNotFound') }
}
export class DeveloperAlreadyRegisteredError extends AwarizonError {
  constructor() { super('Developer already registered', 'DeveloperAlreadyRegistered') }
}
export class DeveloperNotVerifiedError extends AwarizonError {
  constructor() { super('Developer not verified', 'DeveloperNotVerified') }
}
export class DeveloperSuspendedError extends AwarizonError {
  constructor() { super('Developer is suspended', 'DeveloperSuspended') }
}
export class ManifestNotFoundError extends AwarizonError {
  constructor() { super('Manifest not found', 'ManifestNotFound') }
}
export class ManifestAlreadyRegisteredError extends AwarizonError {
  constructor() { super('Manifest already registered', 'ManifestAlreadyRegistered') }
}
export class ManifestLimitReachedError extends AwarizonError {
  constructor() { super('Manifest limit reached', 'ManifestLimitReached') }
}
export class CampaignNotFoundError extends AwarizonError {
  constructor() { super('Campaign not found', 'CampaignNotFound') }
}
export class CampaignNotActiveError extends AwarizonError {
  constructor() { super('Campaign is not active', 'CampaignNotActive') }
}
export class CampaignExpiredError extends AwarizonError {
  constructor() { super('Campaign has expired', 'CampaignExpired') }
}
export class CampaignDeliveryLimitReachedError extends AwarizonError {
  constructor() { super('Campaign delivery limit reached', 'CampaignDeliveryLimitReached') }
}
export class InboxRecordNotFoundError extends AwarizonError {
  constructor() { super('Inbox record not found', 'InboxRecordNotFound') }
}
export class InboxAlreadyDeliveredError extends AwarizonError {
  constructor() { super('Already delivered to this inbox', 'InboxAlreadyDelivered') }
}
export class InboxFullError extends AwarizonError {
  constructor() { super('Inbox is full (1000 records)', 'InboxFull') }
}
export class EngagementCooldownActiveError extends AwarizonError {
  constructor() { super('Engagement cooldown is active (24h)', 'EngagementCooldownActive') }
}
export class EngagementDailyLimitReachedError extends AwarizonError {
  constructor() { super('Daily engagement limit reached (10/day)', 'EngagementDailyLimitReached') }
}
export class EngagementInvalidError extends AwarizonError {
  constructor() { super('Engagement does not meet minimum requirements', 'EngagementInvalid') }
}
export class InsufficientStakeError extends AwarizonError {
  constructor() { super('Insufficient stake', 'InsufficientStake') }
}
export class InsufficientBalanceError extends AwarizonError {
  constructor() { super('Insufficient balance', 'InsufficientBalance') }
}
export class TargetingDimensionLimitExceededError extends AwarizonError {
  constructor() { super('Targeting dimension limit exceeded (max 6)', 'TargetingDimensionLimitExceeded') }
}
export class InvalidManifestHashError extends AwarizonError {
  constructor() { super('Invalid manifest hash', 'InvalidManifestHash') }
}
export class InvalidCampaignIdError extends AwarizonError {
  constructor() { super('Invalid campaign ID', 'InvalidCampaignId') }
}
export class UnauthorizedError extends AwarizonError {
  constructor() { super('Unauthorized', 'Unauthorized') }
}
export class EpochNotReadyError extends AwarizonError {
  constructor() { super('Epoch is not ready to advance', 'EpochNotReady') }
}
export class NotExpiredYetError extends AwarizonError {
  constructor() { super('Campaign has not expired yet', 'NotExpiredYet') }
}
export class ResetNotReadyError extends AwarizonError {
  constructor() { super('Daily reset is not ready yet', 'ResetNotReady') }
}

// ----------------------------------------------------------------
// awarizon-consensus errors
// ----------------------------------------------------------------

export class ValidatorAlreadyRegisteredError extends AwarizonError {
  constructor() { super('Validator already registered', 'ValidatorAlreadyRegistered') }
}
export class ValidatorNotFoundError extends AwarizonError {
  constructor() { super('Validator not found', 'ValidatorNotFound') }
}
export class RegionCapExceededError extends AwarizonError {
  constructor() { super('Region validator cap exceeded (20%)', 'RegionCapExceeded') }
}
export class CountryCapExceededError extends AwarizonError {
  constructor() { super('Country validator cap exceeded (10%)', 'CountryCapExceeded') }
}
export class DelegationNotFoundError extends AwarizonError {
  constructor() { super('Delegation not found', 'DelegationNotFound') }
}
export class CannotDelegateToSelfError extends AwarizonError {
  constructor() { super('Cannot delegate stake to yourself', 'CannotDelegateToSelf') }
}
export class ValidatorNotActiveError extends AwarizonError {
  constructor() { super('Validator is not active', 'ValidatorNotActive') }
}
export class AlreadyDelegatedError extends AwarizonError {
  constructor() { super('Already delegated to this validator', 'AlreadyDelegated') }
}
export class MaxValidatorsReachedError extends AwarizonError {
  constructor() { super('Maximum validator count reached', 'MaxValidatorsReached') }
}

// ----------------------------------------------------------------
// Error mapping
// ----------------------------------------------------------------

const ERROR_MAP: Record<string, () => AwarizonError> = {
  DeveloperNotFound: () => new DeveloperNotFoundError(),
  DeveloperAlreadyRegistered: () => new DeveloperAlreadyRegisteredError(),
  DeveloperNotVerified: () => new DeveloperNotVerifiedError(),
  DeveloperSuspended: () => new DeveloperSuspendedError(),
  ManifestNotFound: () => new ManifestNotFoundError(),
  ManifestAlreadyRegistered: () => new ManifestAlreadyRegisteredError(),
  ManifestLimitReached: () => new ManifestLimitReachedError(),
  CampaignNotFound: () => new CampaignNotFoundError(),
  CampaignNotActive: () => new CampaignNotActiveError(),
  CampaignExpired: () => new CampaignExpiredError(),
  CampaignDeliveryLimitReached: () => new CampaignDeliveryLimitReachedError(),
  InboxRecordNotFound: () => new InboxRecordNotFoundError(),
  InboxAlreadyDelivered: () => new InboxAlreadyDeliveredError(),
  InboxFull: () => new InboxFullError(),
  EngagementCooldownActive: () => new EngagementCooldownActiveError(),
  EngagementDailyLimitReached: () => new EngagementDailyLimitReachedError(),
  EngagementInvalid: () => new EngagementInvalidError(),
  InsufficientStake: () => new InsufficientStakeError(),
  InsufficientBalance: () => new InsufficientBalanceError(),
  TargetingDimensionLimitExceeded: () => new TargetingDimensionLimitExceededError(),
  InvalidManifestHash: () => new InvalidManifestHashError(),
  InvalidCampaignId: () => new InvalidCampaignIdError(),
  Unauthorized: () => new UnauthorizedError(),
  EpochNotReady: () => new EpochNotReadyError(),
  NotExpiredYet: () => new NotExpiredYetError(),
  ResetNotReady: () => new ResetNotReadyError(),
  ValidatorAlreadyRegistered: () => new ValidatorAlreadyRegisteredError(),
  ValidatorNotFound: () => new ValidatorNotFoundError(),
  RegionCapExceeded: () => new RegionCapExceededError(),
  CountryCapExceeded: () => new CountryCapExceededError(),
  DelegationNotFound: () => new DelegationNotFoundError(),
  CannotDelegateToSelf: () => new CannotDelegateToSelfError(),
  ValidatorNotActive: () => new ValidatorNotActiveError(),
  AlreadyDelegated: () => new AlreadyDelegatedError(),
  MaxValidatorsReached: () => new MaxValidatorsReachedError(),
}

export function parseChainError(error: unknown): AwarizonError {
  const errorStr = String(error)
  for (const [key, factory] of Object.entries(ERROR_MAP)) {
    if (errorStr.includes(key)) return factory()
  }
  return new AwarizonError(errorStr, 'UnknownError', error)
}
