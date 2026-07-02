import { RIZ } from '@awarizon/sdk'

// Parse human-readable amount to planck bigint.
// Accepts: "10 RIZ", "10", "0.5 RIZ", "1000000 RIZ"
export function parseAmount(input: string): bigint {
  const clean = input.replace(/\s*RIZ\s*/gi, '').trim()

  if (!clean || isNaN(Number(clean))) {
    throw new Error(
      `Invalid amount: "${input}". Use format "10 RIZ" or "10"`
    )
  }

  const [whole, decimal = ''] = clean.split('.')
  const paddedDecimal = decimal.padEnd(12, '0').slice(0, 12)
  return (
    BigInt(whole || '0') * RIZ +
    BigInt(paddedDecimal)
  )
}

// Format planck bigint to human-readable RIZ string.
// Returns: "10.0000 RIZ"
export function formatAmount(planck: bigint, decimals = 4): string {
  const whole = planck / RIZ
  const remainder = planck % RIZ
  const decStr = remainder.toString().padStart(12, '0').slice(0, decimals)
  return `${whole.toLocaleString()}.${decStr} RIZ`
}

// Validate that a string is a valid RIZ amount.
export function isValidAmount(input: string): boolean {
  try {
    parseAmount(input)
    return true
  } catch {
    return false
  }
}
