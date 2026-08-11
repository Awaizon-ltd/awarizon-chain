import type { ApiPromise } from '@polkadot/api'
import { BLOCK_TIME_SECONDS } from '@awarizon/sdk'

/**
 * Convert a `datetime-local` input value to an estimated block number,
 * based on the current block and the chain's fixed block time. This is
 * an estimate — actual block time can drift from wall-clock time.
 */
export async function datetimeToBlock(api: ApiPromise, datetimeLocal: string): Promise<number> {
  const target = new Date(datetimeLocal).getTime()
  const current = await (api.query as any).system.number()
  const currentBlock = Number(current.toString())
  const secondsFromNow = (target - Date.now()) / 1000
  const blockOffset = Math.round(secondsFromNow / BLOCK_TIME_SECONDS)
  return Math.max(0, currentBlock + blockOffset)
}

/**
 * Convert a block number to a `datetime-local` input value, based on the
 * current block and the chain's fixed block time. Same estimation caveat
 * as `datetimeToBlock`.
 */
export async function blockToDatetimeLocal(api: ApiPromise, block: number): Promise<string> {
  const current = await (api.query as any).system.number()
  const currentBlock = Number(current.toString())
  const secondsFromNow = (block - currentBlock) * BLOCK_TIME_SECONDS
  const date = new Date(Date.now() + secondsFromNow * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
