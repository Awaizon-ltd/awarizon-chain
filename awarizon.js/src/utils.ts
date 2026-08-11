import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import { AwarizonError, parseChainError } from './errors'

// RIZ has 12 decimals — pallets/awarizon-types/src/constants.rs
// 1 RIZ = 1_000_000_000_000 planck
const RIZ = 1_000_000_000_000n

export type AmountInput = string | number | bigint

// Deliberately a minimal duck-typed interface rather than importing
// @polkadot/types' `Signer` — when awarizon.js is linked via `file:`
// (no workspace hoisting), consumers resolve their own nested copy of
// @polkadot/types, and its branded/generic internals make it
// structurally incompatible with the consumer's own copy of the same
// type even at identical versions. This shape is all @polkadot/api's
// signAndSend actually needs, and matches what @polkadot/extension-dapp
// hands back as `injector.signer`.
export interface InjectedSigner {
  signPayload?: (payload: any) => Promise<{ id: number; signature: `0x${string}` }>
  signRaw?: (raw: any) => Promise<{ id: number; signature: `0x${string}` }>
  update?: (id: number, status: any) => void
}

// A local KeyringPair (mnemonic wallet) or a browser-extension account —
// same shape used everywhere a module needs to sign an extrinsic.
export type SigningSource =
  | KeyringPair
  | { address: string; signer: InjectedSigner }

export function isKeyringPair(
  source: SigningSource
): source is KeyringPair {
  return typeof (source as KeyringPair).sign === 'function'
}

export interface TxResult {
  // The extrinsic's own hash — uniquely identifies this transaction.
  hash: string
  // The hash of the block it was included in. Substrate's ExtrinsicStatus
  // carries this as `status.asInBlock` — easy to mistake for the tx hash
  // (it isn't), so it gets its own clearly-named field here instead.
  blockHash: string
  block: number
}

// Parse any amount input to planck bigint
// Accepts: 10, '10', '10 RIZ', '10.5 RIZ', 10n
export function parseAmount(input: AmountInput): bigint {
  if (typeof input === 'bigint') return input
  const str = String(input)
    .replace(/\s*RIZ\s*/gi, '')
    .trim()
  if (!str || isNaN(Number(str))) {
    throw new Error(`Invalid amount: "${input}"`)
  }
  const [whole, decimal = ''] = str.split('.')
  const pad = decimal.padEnd(12, '0').slice(0, 12)
  return BigInt(whole || '0') * RIZ + BigInt(pad)
}

// Format planck bigint to readable string
// 10_000_000_000_000n → '10.0000 RIZ'
export function formatAmount(
  planck: bigint,
  decimals = 4
): string {
  const whole = planck / RIZ
  const rem = planck % RIZ
  const dec = rem.toString()
    .padStart(12, '0')
    .slice(0, decimals)
  return `${whole.toLocaleString()}.${dec} RIZ`
}

// Resolve .riz name OR SS58 address
// Returns SS58 address always
export async function resolveAddress(
  input: string,
  api: ApiPromise
): Promise<string> {
  // Already an SS58 address
  if (/^[1-9A-HJ-NP-Za-km-z]{46,48}$/.test(input)) {
    return input
  }

  // Try .riz name resolution
  const name = input.replace(/\.riz$/, '').toLowerCase()
  try {
    const result = await (api.rpc as any)
      .awarizon.lookupName(name, null)
    const data = result.toJSON() as any
    if (data?.account) return data.account
  } catch {}

  throw new AwarizonError(
    `Cannot resolve "${input}". ` +
    'Use a valid SS58 address or registered .riz name.',
    'INVALID_ADDRESS'
  )
}

// Submit extrinsic and wait for inclusion. Accepts either a local
// KeyringPair (mnemonic wallet) or a browser-extension account —
// the latter signs via its injected `signer` callback instead of a
// raw keypair. `api` is used only to resolve the real block number
// rizscan needs to link to (see TxResult.block) — passing it is
// optional so this stays callable without one, but the link will be
// unbuildable without a resolved block if omitted.
export function submitAndWait(
  extrinsic: any,
  source: SigningSource,
  api?: ApiPromise,
): Promise<TxResult> {
  return new Promise((resolve, reject) => {
    // txHash is the extrinsic's own hash — @polkadot/api computes and
    // attaches it to every callback invocation (ISubmittableResult),
    // so no need to read it off the extrinsic separately or change
    // anything about how/when signing happens.
    const callback = async ({ status, dispatchError, txHash }: any) => {
      if (dispatchError) {
        // extrinsic.registry resolves module errors (e.g. dex.SlippageExceeded)
        // to a human readable message instead of a raw "Module(...)" dump.
        reject(AwarizonError.fromChainError(dispatchError, extrinsic.registry))
        return
      }
      if (status.isInBlock) {
        const blockHash = status.asInBlock
        // rizscan routes transactions by block number + hash
        // (/tx/:blockNumber?hash=...), not by a bare tx hash — this was
        // previously hardcoded to 0, silently producing dead explorer
        // links for every extrinsic sent through the SDK.
        let block = 0
        try {
          if (api) {
            const header = await api.rpc.chain.getHeader(blockHash)
            block = header.number.toNumber()
          }
        } catch {}
        resolve({
          hash: txHash.toHex(),
          blockHash: blockHash.toHex(),
          block,
        })
      }
    }

    const onSignError = (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e)
      if (/cancelled|rejected/i.test(msg)) {
        reject(AwarizonError.userRejected())
        return
      }
      reject(new AwarizonError(parseChainError(e), 'SIGN_ERROR', undefined, e))
    }

    try {
      const send = isKeyringPair(source)
        ? extrinsic.signAndSend(source, callback)
        : extrinsic.signAndSend(
            source.address, { signer: source.signer }, callback
          )
      send.catch(onSignError)
    } catch (e: unknown) {
      onSignError(e)
    }
  })
}

// Truncate address for display
export function truncateAddress(
  address: string,
  start = 8,
  end = 4
): string {
  if (address.length <= start + end) return address
  return `${address.slice(0, start)}...${address.slice(-end)}`
}

// Check if string is a .riz name
export function isRizName(value: string): boolean {
  return value.endsWith('.riz') ||
    /^[a-z0-9][a-z0-9-]{1,30}$/.test(value)
}

// Check if string is SS58 address
export function isAddress(value: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{46,48}$/.test(value)
}
