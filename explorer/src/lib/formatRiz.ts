// 18 decimals (was 12) — matches the chain's AccountId32 -> H160 migration,
// which also moved native-currency decimals to 18 (MetaMask hardcodes 18
// for any EVM chain's native currency). This is a local duplicate of
// @awarizon/sdk's own RIZ constant/formatRiz — not resolved in this pass,
// just kept in sync so neither copy silently misdisplays amounts.
const RIZ = 1_000_000_000_000_000_000n

// Format a planck bigint as a RIZ amount with thousands separators and a
// fixed number of decimals, e.g. formatRizAmount(1_234_500_000_000_000_000_000n) → "1,234.50"
export function formatRizAmount(planck: bigint, decimals = 2): string {
  const whole = planck / RIZ
  if (decimals === 0) return whole.toLocaleString()
  const frac = (planck % RIZ).toString().padStart(18, '0').slice(0, decimals)
  return `${whole.toLocaleString()}.${frac}`
}

// Same, but accepts a decimal string (RPCs often return u128 balances as strings)
export function formatRizAmountStr(planckStr: string, decimals = 2): string {
  try { return formatRizAmount(BigInt(planckStr), decimals) } catch { return '———' }
}
