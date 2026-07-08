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
  | 'UNKNOWN'

export class AwarizonError extends Error {
  readonly code: ErrorCode

  constructor(message: string, code: ErrorCode) {
    super(message)
    this.name = 'AwarizonError'
    this.code = code
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

  static fromChain(err: unknown): AwarizonError {
    const msg = err instanceof Error
      ? err.message
      : String(err)

    if (msg.includes('InsufficientBalance') ||
        msg.includes('insufficient')) {
      return new AwarizonError(
        'Insufficient RIZ balance for this transaction.',
        'INSUFFICIENT_BALANCE'
      )
    }
    if (msg.includes('NameAlreadyTaken')) {
      return new AwarizonError(
        'This .riz name is already taken. ' +
        'Try a different name.',
        'NAME_TAKEN'
      )
    }
    if (msg.includes('DeveloperNotFound') ||
        msg.includes('NotRegistered')) {
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
}
