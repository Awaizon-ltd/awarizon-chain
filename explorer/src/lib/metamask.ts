import { AWARIZON_CHAIN } from './chainMeta'

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
 * Prompts MetaMask (or any EIP-1193 wallet) to add Awarizon as a network —
 * replaces the old Polkadot{.js}-extension `metadata.provide` flow, which
 * can't work at all now that accounts are H160/ECDSA rather than
 * sr25519/ed25519. Mirrors sysfi-explorer/src/lib/metamask.ts's
 * already-working `addSysFiNetwork`.
 */
export async function addAwarizonNetwork(): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!window.ethereum) {
    return { ok: false, reason: 'no-wallet' }
  }
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: AWARIZON_CHAIN.chainIdHex,
          chainName: AWARIZON_CHAIN.chainName,
          nativeCurrency: {
            name: AWARIZON_CHAIN.tokenSymbol,
            symbol: AWARIZON_CHAIN.tokenSymbol,
            decimals: AWARIZON_CHAIN.tokenDecimals,
          },
          rpcUrls: [AWARIZON_CHAIN.rpcHttpUrl],
          blockExplorerUrls: [AWARIZON_CHAIN.explorerUrl],
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
