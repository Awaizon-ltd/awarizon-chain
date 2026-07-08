const RIZ = 1_000_000_000_000n

// Format a planck bigint as a RIZ amount with thousands separators and a
// fixed number of decimals, e.g. formatRizAmount(1_234_500_000_000_000n) → "1,234.50"
export function formatRizAmount(planck: bigint, decimals = 2): string {
  const whole = planck / RIZ
  if (decimals === 0) return whole.toLocaleString()
  const frac = (planck % RIZ).toString().padStart(12, '0').slice(0, decimals)
  return `${whole.toLocaleString()}.${frac}`
}

// Same, but accepts a decimal string (RPCs often return u128 balances as strings)
export function formatRizAmountStr(planckStr: string, decimals = 2): string {
  try { return formatRizAmount(BigInt(planckStr), decimals) } catch { return '———' }
}
