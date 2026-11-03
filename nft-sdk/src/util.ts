import { hexToString } from '@polkadot/util'

export const PLANCK = 1_000_000_000_000n

/** Decode a pallet-nfts `data: BoundedVec<u8, StringLimit>` field (hex after .toJSON()) to text. */
export function decodeData(hex: string | null | undefined): string | undefined {
  if (!hex) return undefined
  const decoded = hexToString(hex)
  return decoded.length ? decoded : undefined
}

/** Format a planck amount (RIZ has 12 decimals) as a human-readable RIZ string. */
export function formatRiz(planck: bigint): string {
  const whole = planck / PLANCK
  const frac = planck % PLANCK
  const fracStr = frac.toString().padStart(12, '0').slice(0, 4).replace(/0+$/, '')
  return fracStr ? `${whole}.${fracStr} RIZ` : `${whole} RIZ`
}

/**
 * Sign and send an extrinsic, finalized. Accepts either a raw
 * @polkadot/keyring `KeyringPair`, or a browser-extension injected
 * account (`{ address, signer }`, as returned by
 * `@polkadot/extension-dapp`'s `web3FromAddress().signer` paired with
 * the account address) — the two need different `signAndSend` call
 * shapes, so this picks the right one based on whether `signer` is
 * present.
 */
export function signAndSend(
  api: any,
  tx: any,
  pair: any,
): Promise<{ txHash: string; events: any[] }> {
  return new Promise((resolve, reject) => {
    const handler = ({ status, dispatchError, txHash, events }: any) => {
      if (dispatchError) {
        const err = dispatchError.isModule
          ? api.registry.findMetaError(dispatchError.asModule).name
          : dispatchError.toString()
        reject(new Error(err))
        return
      }
      if (status.isFinalized) resolve({ txHash: txHash.toHex(), events: events ?? [] })
    }

    const sent =
      pair && pair.signer
        ? tx.signAndSend(pair.address, { signer: pair.signer }, handler)
        : tx.signAndSend(pair, handler)

    Promise.resolve(sent).catch(reject)
  })
}
