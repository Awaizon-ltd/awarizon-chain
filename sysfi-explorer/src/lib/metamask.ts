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

/**
 * The one place in the app that hands the real RPC URL to something outside
 * our own code — MetaMask needs it to actually add the network. Everywhere
 * else in the UI, this value is never printed as text.
 */
export async function addSysFiNetwork(): Promise<{ ok: true } | { ok: false; reason: string }> {
	if (!window.ethereum) {
		return { ok: false, reason: 'no-wallet' }
	}
	try {
		await window.ethereum.request({
			method: 'wallet_addEthereumChain',
			params: [
				{
					chainId: chainConfig.chainIdHex,
					chainName: chainConfig.name,
					nativeCurrency: {
						name: chainConfig.currencySymbol,
						symbol: chainConfig.currencySymbol,
						decimals: chainConfig.currencyDecimals,
					},
					rpcUrls: [chainConfig.rpcUrl],
					blockExplorerUrls: [window.location.origin],
				},
			],
		})
		return { ok: true }
	} catch (err) {
		const rejected =
			typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 4001
		return { ok: false, reason: rejected ? 'rejected' : 'error' }
	}
}
