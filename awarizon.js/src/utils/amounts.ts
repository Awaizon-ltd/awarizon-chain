export {
  parseAmount,
  formatAmount,
  isValidAmount,
  RIZ,
  PLANCK,
  MICRO_RIZ,
} from '@awarizon/core'

export function rizToNumber(riz: string): number {
  const clean = riz.replace(/\s*RIZ\s*/gi, '').replace(/,/g, '').trim()
  const n = parseFloat(clean)
  if (isNaN(n)) throw new Error(`Cannot parse RIZ amount: "${riz}"`)
  return n
}

export function planckToRiz(planck: bigint): number {
  return Number(planck) / 1_000_000_000_000
}
