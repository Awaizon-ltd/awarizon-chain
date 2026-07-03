import { RIZ } from './constants'

// Convert planck to RIZ display string e.g. 1_000_000_000_000n → "1.0000"
export function formatRiz(planck: bigint, decimals = 4): string {
  const whole = planck / RIZ
  const remainder = planck % RIZ
  const decStr = remainder.toString().padStart(12, '0').slice(0, decimals)
  return `${whole}.${decStr}`
}

// Convert RIZ amount string to planck bigint e.g. "1.5" → 1_500_000_000_000n
export function parseRiz(riz: string): bigint {
  const [whole, decimal = ''] = riz.split('.')
  const paddedDecimal = decimal.padEnd(12, '0').slice(0, 12)
  return BigInt(whole) * RIZ + BigInt(paddedDecimal)
}

// Convert hex string to Uint8Array
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace('0x', '')
  return new Uint8Array(
    clean.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) ?? []
  )
}

// Convert Uint8Array to hex string with 0x prefix
export function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Generate a campaign ID from manifest hash + current timestamp
export function generateCampaignId(manifestHash: string): string {
  const timestamp = Date.now().toString(16).padStart(16, '0')
  const hashPart = manifestHash.replace('0x', '').slice(0, 48)
  return '0x' + hashPart + timestamp
}

// Basic SS58 address length check
export function isValidAddress(address: string): boolean {
  return address.length >= 46 && address.length <= 48
}

// Format a block count to a human-readable time estimate (3s block time)
export function blocksToTime(blocks: number): string {
  const seconds = blocks * 3
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

// Parse a u128-as-string from RPC into bigint
export function parsePlanckString(value: string): bigint {
  return BigInt(value)
}
