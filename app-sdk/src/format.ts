const PLANCK = 1_000_000_000_000n

// Format a raw planck amount as a readable RIZ string.
// Note: reward amounts returned by AwarizonApp are already formatted
// by awarizon.js — this helper is exposed for callers who have a raw
// planck value from elsewhere (e.g. a balance query).
export function formatRiz(planck: string): string {
  try {
    const n = BigInt(planck)
    const whole = n / PLANCK
    const frac = (n % PLANCK).toString()
      .padStart(12, '0')
      .slice(0, 4)
      .replace(/0+$/, '')
    return frac
      ? `${whole}.${frac} RIZ`
      : `${whole} RIZ`
  } catch {
    return '0 RIZ'
  }
}
