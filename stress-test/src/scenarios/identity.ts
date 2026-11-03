import { ApiPromise } from '@polkadot/api'
import { blake2AsHex } from '@polkadot/util-crypto'
import type { TestWallet } from '../types'

// pallet-awarizon-identity (runtime/src/lib.rs pallet_index 15)
// register_identity(riz_name, display_name, bio, avatar_uri, website)
//   — free (no deposit), but can only be called once per account
//     (IdentityAlreadyRegistered on retry).
// update_identity(display_name, bio, avatar_uri, website)
//   — requires an existing identity record.
//
// .riz names must be 3-32 chars, lowercase a-z/0-9/hyphen, and can't start
// or end with a hyphen (pallets/awarizon-identity/src/lib.rs validate_riz_name).
// Names are derived deterministically from the wallet's own address so
// re-running this scenario against the same wallet set is idempotent.
function nameFor(address: string): string {
  return 'w' + blake2AsHex(address, 64).slice(2, 12)
}

export function buildIdentityTx(
  api: ApiPromise,
  from: TestWallet,
  _to: TestWallet,
  index: number
) {
  if (!from.rizName) {
    const name = nameFor(from.address)
    // Recorded optimistically so the "named" scenario (and a later save
    // of wallets.json) can pick it up even before this tx confirms.
    from.rizName = `${name}.riz`
    return (api.tx as any).awarizonIdentity.registerIdentity(
      name, null, null, null, null
    )
  }

  return (api.tx as any).awarizonIdentity.updateIdentity(
    `Stress ${index}`, null, null, null
  )
}
