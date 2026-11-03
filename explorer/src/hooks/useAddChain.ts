import { useCallback, useState } from 'react'
import { AWARIZON_CHAIN } from '../lib/chainMeta'
import { addAwarizonNetwork, hasInjectedWallet } from '../lib/metamask'

type Status = 'idle' | 'adding' | 'success' | 'error'

export function useAddChain() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  // Was a `@polkadot/extension-dapp` web3Enable + metadata.provide flow
  // (Polkadot{.js}/Talisman/SubWallet) — that can't work at all anymore,
  // since accounts are H160/ECDSA now, not sr25519/ed25519. Replaced with
  // MetaMask's standard wallet_addEthereumChain, same as sysfi-explorer.
  const addChain = useCallback(async () => {
    setStatus('adding')
    setError(null)

    try {
      if (!hasInjectedWallet()) {
        throw new Error('No EVM wallet detected. Install MetaMask to continue.')
      }

      const result = await addAwarizonNetwork()
      if (!result.ok) {
        throw new Error(
          result.reason === 'rejected' ? 'Request rejected in wallet.' : 'Failed to add network.'
        )
      }

      setStatus('success')
      setTimeout(() => setStatus('idle'), 4000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add chain'
      setError(message)
      setStatus('error')
      setTimeout(() => {
        setStatus('idle')
        setError(null)
      }, 5000)
    }
  }, [])

  const copyRpc = useCallback(async () => {
    await navigator.clipboard.writeText(AWARIZON_CHAIN.rpcUrl)
  }, [])

  return {
    addChain,
    copyRpc,
    status,
    error,
    isPending: status === 'adding',
    isSuccess: status === 'success',
    isError: status === 'error',
    chainInfo: AWARIZON_CHAIN,
  }
}
