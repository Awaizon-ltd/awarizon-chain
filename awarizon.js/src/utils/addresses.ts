import { isAddress } from '@polkadot/util-crypto'

export function isValidSS58(address: string): boolean {
  try {
    return isAddress(address)
  } catch {
    return false
  }
}

export function isRizName(input: string): boolean {
  return input.endsWith('.riz') || /^[a-z0-9_-]{3,32}$/.test(input)
}

export function isEvmAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address)
}

export function normalizeRizName(name: string): string {
  return name.replace(/\.riz$/i, '').toLowerCase()
}
