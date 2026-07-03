export type AwarizonErrorCode =
  | 'NOT_CONNECTED'
  | 'WALLET_REQUIRED'
  | 'INVALID_MNEMONIC'
  | 'INVALID_ADDRESS'
  | 'INVALID_AMOUNT'
  | 'NAME_NOT_FOUND'
  | 'NAME_UNAVAILABLE'
  | 'NOT_REGISTERED'
  | 'INSUFFICIENT_BALANCE'
  | 'TX_FAILED'
  | 'SIGN_FAILED'
  | 'NOT_SUPPORTED'
  | 'UNKNOWN'

export class AwarizonError extends Error {
  readonly code: AwarizonErrorCode

  constructor(code: AwarizonErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'AwarizonError'
    this.code = code
    if (cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`
    }
  }

  static wrap(err: unknown, code: AwarizonErrorCode = 'UNKNOWN'): AwarizonError {
    if (err instanceof AwarizonError) return err
    const message = err instanceof Error ? err.message : String(err)
    return new AwarizonError(code, message, err)
  }
}
