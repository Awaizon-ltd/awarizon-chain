// Client-safe chain config and a read-only provider — no key material here.
// (Server-side sending lives in lib/serverChain.ts, which is `server-only`.)
import { JsonRpcProvider } from 'ethers'

export const chainConfig = {
	chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 76081),
	chainIdHex: process.env.NEXT_PUBLIC_CHAIN_ID_HEX ?? '0x12931',
	name: process.env.NEXT_PUBLIC_CHAIN_NAME ?? 'SysFi Testnet',
	currencySymbol: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL ?? 'SYN',
	rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? '',
	explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL ?? '',
	claimAmount: process.env.NEXT_PUBLIC_CLAIM_AMOUNT ?? '2',
}

let _provider: JsonRpcProvider | null = null
/** Lazy so this never runs at module-eval time during a server build with no RPC URL configured yet. */
export function getPublicProvider(): JsonRpcProvider {
	if (!_provider) {
		_provider = new JsonRpcProvider(chainConfig.rpcUrl, { chainId: chainConfig.chainId, name: chainConfig.name })
	}
	return _provider
}
