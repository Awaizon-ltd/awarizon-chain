import type { ApiPromise } from '@polkadot/api'
import type { KeyringPair } from '@polkadot/keyring/types'
import { AwarizonError } from './errors'

// RIZ has 12 decimals — pallets/awarizon-types/src/constants.rs
// 1 RIZ = 1_000_000_000_000 planck
const RIZ = 1_000_000_000_000n

export type AmountInput = string | number | bigint

export interface TxResult {
  hash: string
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

// Submit extrinsic and wait for inclusion
export function submitAndWait(
  extrinsic: any,
  pair: KeyringPair
): Promise<TxResult> {
  return new Promise((resolve, reject) => {
    extrinsic
      .signAndSend(
        pair,
        ({ status, dispatchError }: any) => {
          if (dispatchError) {
            reject(AwarizonError.fromChain(
              dispatchError.toString()
            ))
            return
          }
          if (status.isInBlock) {
            resolve({
              hash: status.asInBlock.toHex(),
              block: 0,
            })
          }
        }
      )
      .catch((e: unknown) => {
        reject(AwarizonError.fromChain(e))
      })
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
