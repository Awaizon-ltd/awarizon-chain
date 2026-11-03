import { useCallback, useEffect, useRef, useState } from 'react'
import type { Block, TransactionReceipt, TransactionResponse } from 'ethers'
import { provider } from '../lib/chain'

export type AsyncState<T> =
	| { status: 'loading' }
	| { status: 'error'; message: string }
	| { status: 'ready'; data: T }
	| { status: 'not-found' }

const POLL_MS = 4_000 // matches SysFi's ~6s block time closely enough for a "live" feel without hammering RPC

/** Latest N blocks (full transaction objects included), refreshed on a poll. */
export function useLatestBlocks(count: number) {
	const [state, setState] = useState<AsyncState<Block[]>>({ status: 'loading' })
	const mounted = useRef(true)

	useEffect(() => {
		mounted.current = true
		let timer: ReturnType<typeof setTimeout>

		async function tick() {
			try {
				const latest = await provider.getBlockNumber()
				const numbers = Array.from({ length: Math.min(count, latest + 1) }, (_, i) => latest - i)
				const blocks = await Promise.all(numbers.map((n) => provider.getBlock(n, true)))
				if (!mounted.current) return
				setState({ status: 'ready', data: blocks.filter((b): b is Block => b !== null) })
			} catch (err) {
				if (!mounted.current) return
				setState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to load blocks' })
			} finally {
				if (mounted.current) timer = setTimeout(tick, POLL_MS)
			}
		}
		tick()

		return () => {
			mounted.current = false
			clearTimeout(timer)
		}
	}, [count])

	return state
}

/** One block by number or hash, with full transaction objects. */
export function useBlock(idOrHash: string | number) {
	const [state, setState] = useState<AsyncState<Block>>({ status: 'loading' })

	useEffect(() => {
		let cancelled = false
		setState({ status: 'loading' })
		;(async () => {
			try {
				const arg = typeof idOrHash === 'number' ? idOrHash : /^\d+$/.test(idOrHash) ? Number(idOrHash) : idOrHash
				const block = await provider.getBlock(arg, true)
				if (cancelled) return
				setState(block ? { status: 'ready', data: block } : { status: 'not-found' })
			} catch (err) {
				if (cancelled) return
				setState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to load block' })
			}
		})()
		return () => {
			cancelled = true
		}
	}, [idOrHash])

	return state
}

export interface TransactionDetail {
	tx: TransactionResponse
	receipt: TransactionReceipt | null
	timestamp: number | null
}

/** A transaction plus its receipt (may still be pending -> receipt null) and its block's timestamp. */
export function useTransaction(hash: string) {
	const [state, setState] = useState<AsyncState<TransactionDetail>>({ status: 'loading' })

	useEffect(() => {
		let cancelled = false
		setState({ status: 'loading' })
		;(async () => {
			try {
				const tx = await provider.getTransaction(hash)
				if (!tx) {
					if (!cancelled) setState({ status: 'not-found' })
					return
				}
				const [receipt, block] = await Promise.all([
					provider.getTransactionReceipt(hash),
					tx.blockNumber ? provider.getBlock(tx.blockNumber) : Promise.resolve(null),
				])
				if (cancelled) return
				setState({ status: 'ready', data: { tx, receipt, timestamp: block?.timestamp ?? null } })
			} catch (err) {
				if (cancelled) return
				setState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to load transaction' })
			}
		})()
		return () => {
			cancelled = true
		}
	}, [hash])

	return state
}

export interface AddressDetail {
	address: string
	balance: bigint
	nonce: number
	isContract: boolean
}

export function useAddress(address: string) {
	const [state, setState] = useState<AsyncState<AddressDetail>>({ status: 'loading' })

	useEffect(() => {
		let cancelled = false
		setState({ status: 'loading' })
		;(async () => {
			try {
				const [balance, nonce, code] = await Promise.all([
					provider.getBalance(address),
					provider.getTransactionCount(address),
					provider.getCode(address),
				])
				if (cancelled) return
				setState({ status: 'ready', data: { address, balance, nonce, isContract: code !== '0x' } })
			} catch (err) {
				if (cancelled) return
				setState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to load address' })
			}
		})()
		return () => {
			cancelled = true
		}
	}, [address])

	return state
}

export interface NetworkStats {
	blockNumber: number
	gasPrice: bigint | null
	avgBlockTimeSec: number | null
}

/** Header stat strip — latest block height, current gas price, observed block time. */
export function useNetworkStats() {
	const [state, setState] = useState<AsyncState<NetworkStats>>({ status: 'loading' })

	const refresh = useCallback(async () => {
		try {
			const [blockNumber, feeData] = await Promise.all([provider.getBlockNumber(), provider.getFeeData()])
			let avgBlockTimeSec: number | null = null
			if (blockNumber > 1) {
				const [latest, prior] = await Promise.all([provider.getBlock(blockNumber), provider.getBlock(blockNumber - 10)])
				if (latest && prior) {
					avgBlockTimeSec = (latest.timestamp - prior.timestamp) / (latest.number - prior.number)
				}
			}
			setState({ status: 'ready', data: { blockNumber, gasPrice: feeData.gasPrice, avgBlockTimeSec } })
		} catch (err) {
			setState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to load network stats' })
		}
	}, [])

	useEffect(() => {
		refresh()
		const timer = setInterval(refresh, POLL_MS)
		return () => clearInterval(timer)
	}, [refresh])

	return state
}
