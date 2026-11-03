export function isValidAddress(value: string): boolean {
	return /^0x[0-9a-fA-F]{40}$/.test(value.trim())
}

export function formatAddress(address: string, chars = 6): string {
	if (address.length <= chars * 2 + 2) return address
	return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`
}

export function formatHash(hash: string, chars = 8): string {
	if (hash.length <= chars * 2 + 2) return hash
	return `${hash.slice(0, chars + 2)}…${hash.slice(-chars)}`
}
