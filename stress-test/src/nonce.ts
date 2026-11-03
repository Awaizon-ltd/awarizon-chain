import type { ApiPromise } from '@polkadot/api'

// Hands out sequential nonces per address under concurrent submission.
//
// A naive "read nonce, increment locally" map races when two jobs for the
// same sender are in flight at once (common here since wallet count is
// often far smaller than tx count): both read the chain nonce before
// either has recorded a reservation, and both submit with the same value.
// Chaining promises instead means the get/set on `chains` happens
// synchronously on every call, before any `await` yields control, so each
// caller is handed a distinct, ordered nonce even when invoked back to back
// from a Promise.all-style fan-out.
export class NonceTracker {
  private chains = new Map<string, Promise<number>>()

  constructor(private api: ApiPromise) {}

  next(address: string): Promise<number> {
    const prev = this.chains.get(address)
      ?? this.api.query.system.account(address)
          .then((acc: any) => acc.nonce.toNumber())

    this.chains.set(address, prev.then(n => n + 1))
    return prev
  }
}
