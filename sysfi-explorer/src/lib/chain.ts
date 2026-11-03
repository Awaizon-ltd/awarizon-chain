import { JsonRpcProvider } from 'ethers'

// Read once from env — never re-exported or rendered as text anywhere in the
// UI (see components/MetaMaskButton.tsx, the one place that needs the raw
// URL to hand to wallet_addEthereumChain).
const RPC_URL = import.meta.env.VITE_RPC_URL as string
const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? 76081)
const CHAIN_ID_HEX = (import.meta.env.VITE_CHAIN_ID_HEX as string) ?? `0x${CHAIN_ID.toString(16)}`

export const chainConfig = {
	chainId: CHAIN_ID,
	chainIdHex: CHAIN_ID_HEX,
	name: (import.meta.env.VITE_CHAIN_NAME as string) ?? 'SysFi Testnet',
	currencySymbol: (import.meta.env.VITE_CURRENCY_SYMBOL as string) ?? 'SYN',
	currencyDecimals: Number(import.meta.env.VITE_CURRENCY_DECIMALS ?? 18),
	rpcUrl: RPC_URL,
}

if (!RPC_URL) {
	// Fails loudly at build/dev time rather than silently hitting nothing.
	throw new Error('VITE_RPC_URL is not set — see .env.example')
}

export const provider = new JsonRpcProvider(RPC_URL, {
	chainId: CHAIN_ID,
	name: chainConfig.name,
})
