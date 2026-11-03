// Format a planck-string balance for an arbitrary-decimals pallet-assets
// token. Unlike RIZ (formatRiz.ts), decimals vary per asset, so this can't
// reuse that module's hardcoded 12-decimal constant.
export function formatTokenAmount(planckStr: string, decimals: number): string {
  try {
    const n = BigInt(planckStr)
    if (decimals === 0) return n.toLocaleString()
    const d = 10n ** BigInt(decimals)
    const whole = n / d
    const frac = (n % d).toString().padStart(decimals, '0').slice(0, 4).replace(/0+$/, '')
    return frac ? `${whole.toLocaleString()}.${frac}` : whole.toLocaleString()
  } catch {
    return '0'
  }
}
