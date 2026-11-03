import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'

// awarizon.js's AssetsModule wraps pallet_assets create/mint/transfer/burn
// but has no way to list assets or set name/symbol/decimals — pallet_assets
// keeps those on `assets.entries()` storage and a separate `setMetadata`
// extrinsic that the SDK never wraps. These talk to the same public
// ApiPromise (Signer.getApi()) the SDK modules use internally, so nothing
// here requires touching SDK source.

export interface InjectedSignerLike {
  signPayload?: (payload: any) => Promise<{ id: number; signature: `0x${string}` }>
  signRaw?: (raw: any) => Promise<{ id: number; signature: `0x${string}` }>
  update?: (id: number, status: any) => void
}

export interface SigningContext {
  address: string
  pair: KeyringPair | null
  injectedSigner: InjectedSignerLike | null
}

export function formatUnits(raw: bigint | string, decimals: number): string {
  const value = typeof raw === 'string' ? BigInt(raw) : raw
  const base = 10n ** BigInt(decimals)
  const whole = value / base
  const rem = value % base
  const dec = rem.toString().padStart(decimals, '0')
  return decimals > 0 ? `${whole}.${dec}` : `${whole}`
}

// pallet_assets.create() rejects an id that's already taken, and
// there's no on-chain auto-increment for it — a developer has no way
// to know what's free without enumerating existing assets. Picks
// (highest existing id) + 1, or 1 if none exist yet.
export async function getNextAssetId(api: ApiPromise): Promise<number> {
  const entries = await (api.query as any).assets.asset.entries()
  const ids = entries.map(([key]: [any, any]) => key.args[0].toNumber())
  return ids.length ? Math.max(...ids) + 1 : 1
}

export function setAssetMetadata(
  api: ApiPromise,
  assetId: number,
  name: string,
  symbol: string,
  decimals: number,
  ctx: SigningContext,
): Promise<{ hash: string; blockHash: string }> {
  const extrinsic = (api.tx as any).assets.setMetadata(assetId, name, symbol, decimals)
  return signAndSend(extrinsic, ctx)
}

// Mirrors awarizon.js's internal submitAndWait (not part of its public
// API), so extrinsics the SDK doesn't wrap can still be signed the same
// way — via a local keypair or the browser extension's injected signer.
function signAndSend(
  extrinsic: any,
  ctx: SigningContext,
): Promise<{ hash: string; blockHash: string }> {
  return new Promise((resolve, reject) => {
    const callback = ({ status, dispatchError, txHash }: any) => {
      if (dispatchError) {
        reject(new Error(dispatchError.toString()))
        return
      }
      if (status.isInBlock) {
        resolve({ hash: txHash.toHex(), blockHash: status.asInBlock.toHex() })
      }
    }

    if (ctx.pair) {
      extrinsic.signAndSend(ctx.pair, callback).catch(reject)
    } else if (ctx.injectedSigner) {
      extrinsic
        .signAndSend(ctx.address, { signer: ctx.injectedSigner }, callback)
        .catch(reject)
    } else {
      reject(new Error('No signing source available'))
    }
  })
}
