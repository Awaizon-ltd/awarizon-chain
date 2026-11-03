import { decodeAddress } from '@polkadot/util-crypto'

export function isValidSubstrateAddress(
  address: string
): boolean {
  if (!address || address.length < 40) return false
  try {
    decodeAddress(address)
    return true
  } catch {
    return false
  }
}

export function isRizName(name: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.riz$/.test(
    name.toLowerCase()
  )
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/\s+/g, '')
}
