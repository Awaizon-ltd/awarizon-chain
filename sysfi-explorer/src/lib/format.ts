import { formatEther, formatUnits } from 'ethers'

/** Truncates a 0x-address to `0x1234…abcd`. Never mutates the underlying value — always keep the full string for copy. */
export function formatAddress(address: string | null | undefined, chars = 4): string {
	if (!address) return '--'
	if (address.length <= chars * 2 + 2) return address
	return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`
}

/** Same idea for tx/block hashes, slightly wider by default. */
export function formatHash(hash: string | null | undefined, chars = 6): string {
	if (!hash) return '--'
	if (hash.length <= chars * 2 + 2) return hash
	return `${hash.slice(0, chars + 2)}…${hash.slice(-chars)}`
}

/**
 * Native-token amount for display. No USD price feed exists yet for SYN, so
 * this doesn't do the full dynamic-decimals-by-price pipeline — just: never
 * scientific notation, never a stray trailing ".0000", never negative zero.
 */
export function formatTokenAmount(wei: bigint | string | null | undefined, decimals = 18): string {
	if (wei === null || wei === undefined) return '--'
	let asString: string
	try {
		asString = formatUnits(wei, decimals)
	} catch {
		return '--'
	}
	const [whole, frac = ''] = asString.split('.')
	const trimmedFrac = frac.slice(0, 6).replace(/0+$/, '')
	const wholeWithCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
	const result = trimmedFrac ? `${wholeWithCommas}.${trimmedFrac}` : wholeWithCommas
	// Catch the signed-zero edge case explicitly.
	return result === '-0' ? '0' : result
}

/** SYN specifically (18 decimals) — thin wrapper so call sites read clearly. */
export function formatSyn(wei: bigint | string | null | undefined): string {
	return formatTokenAmount(wei, 18)
}

/** Wei -> Gwei for gas price display. */
export function formatGwei(wei: bigint | string | null | undefined): string {
	if (wei === null || wei === undefined) return '--'
	try {
		const gwei = Number(formatUnits(wei, 9))
		if (!Number.isFinite(gwei)) return '--'
		if (gwei === 0) return '0'
		if (gwei < 0.01) return '<0.01'
		return gwei.toFixed(gwei < 10 ? 4 : 2).replace(/\.?0+$/, '')
	} catch {
		return '--'
	}
}

/** Plain integer counts (block numbers, tx counts, gas used) with thousands separators. Never scientific notation, never NaN. */
export function formatNumber(n: number | bigint | null | undefined): string {
	if (n === null || n === undefined) return '--'
	const num = typeof n === 'bigint' ? n : Number.isFinite(n) ? n : null
	if (num === null) return '--'
	return num.toLocaleString('en-US')
}

/** Relative time ("12s ago", "5m ago") for a unix-seconds timestamp. */
export function formatRelativeTime(unixSeconds: number | null | undefined): string {
	if (!unixSeconds) return '--'
	const diffMs = Date.now() - unixSeconds * 1000
	const diffSec = Math.max(0, Math.floor(diffMs / 1000))
	if (diffSec < 5) return 'just now'
	if (diffSec < 60) return `${diffSec}s ago`
	const diffMin = Math.floor(diffSec / 60)
	if (diffMin < 60) return `${diffMin}m ago`
	const diffHour = Math.floor(diffMin / 60)
	if (diffHour < 24) return `${diffHour}h ago`
	const diffDay = Math.floor(diffHour / 24)
	return `${diffDay}d ago`
}

/** Absolute timestamp for tooltips/detail pages. */
export function formatAbsoluteTime(unixSeconds: number | null | undefined): string {
	if (!unixSeconds) return '--'
	return new Date(unixSeconds * 1000).toLocaleString('en-US', {
		dateStyle: 'medium',
		timeStyle: 'medium',
	})
}

export function formatEtherFull(wei: bigint | string | null | undefined): string {
	if (wei === null || wei === undefined) return '--'
	try {
		return formatEther(wei)
	} catch {
		return '--'
	}
}

/** Loose classifier used by the search bar to route input without a network round trip first. */
export type SearchKind = 'block-number' | 'hash-or-address' | 'invalid'
export function classifySearchInput(raw: string): { kind: SearchKind; value: string } {
	const value = raw.trim()
	if (!value) return { kind: 'invalid', value }
	if (/^\d+$/.test(value)) return { kind: 'block-number', value }
	if (/^0x[0-9a-fA-F]{40}$/.test(value)) return { kind: 'hash-or-address', value }
	if (/^0x[0-9a-fA-F]{64}$/.test(value)) return { kind: 'hash-or-address', value }
	return { kind: 'invalid', value }
}
