import { chainConfig } from './chain'

declare global {
	interface Window {
		ethereum?: {
			request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
		}
	}
}

export function hasInjectedWallet(): boolean {
	return typeof window !== 'undefined' && Boolean(window.ethereum)
}

/** Requests account access, then makes sure the wallet is actually on SysFi (adds it if needed) — one click covers both. */
export async function connectWallet(): Promise<{ ok: true; address: string } | { ok: false; reason: string }> {
	if (!window.ethereum) return { ok: false, reason: 'no-wallet' }

	try {
		const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[]
		const address = accounts[0]
		if (!address) return { ok: false, reason: 'no-account' }

		try {
			await window.ethereum.request({
				method: 'wallet_addEthereumChain',
				params: [
					{
						chainId: chainConfig.chainIdHex,
						chainName: chainConfig.name,
						nativeCurrency: { name: chainConfig.currencySymbol, symbol: chainConfig.currencySymbol, decimals: 18 },
						rpcUrls: [chainConfig.rpcUrl],
						blockExplorerUrls: chainConfig.explorerUrl ? [chainConfig.explorerUrl] : [],
					},
				],
			})
		} catch {
			// Non-fatal — they still have an address to claim with even if the network add/switch was declined.
		}

		return { ok: true, address }
	} catch (err) {
		const rejected =
			typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 4001
		return { ok: false, reason: rejected ? 'rejected' : 'error' }
	}
}
