export const RPC = 'wss://rpc.awarizon.com'
export const INDEXER = 'https://index.awarizon.com'
export const CHAIN = 'Awarizon'
export const PLANCK = 1_000_000_000_000n
export const CLOUDINARY_CLOUD = 'dgt6b36fq'
export const CLOUDINARY_PRESET = 'awarizon'

export function fmt(planck: bigint | string): string {
  const n = typeof planck === 'string' ? BigInt(planck) : planck
  const whole = n / PLANCK
  const frac = (n % PLANCK).toString().padStart(12, '0').slice(0, 4).replace(/0+$/, '')
  return frac ? `${whole.toLocaleString()}.${frac} RIZ` : `${whole.toLocaleString()} RIZ`
}

export function parsePlanck(riz: string): bigint {
  const parts = riz.replace(/,/g, '').split('.')
  const whole = BigInt(parts[0] || '0')
  const frac = (parts[1] ?? '').slice(0, 12).padEnd(12, '0')
  return whole * PLANCK + BigInt(frac)
}

export function truncate(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}
