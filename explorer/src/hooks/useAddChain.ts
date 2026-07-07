import { useCallback, useState } from 'react'
import { AWARIZON_CHAIN } from '../lib/chainMeta'

type Status = 'idle' | 'adding' | 'success' | 'error'

export function useAddChain() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const addChain = useCallback(async () => {
    setStatus('adding')
    setError(null)

    try {
      const { web3Enable } = await import('@polkadot/extension-dapp')
      const extensions = await web3Enable('RIZSCAN')

      if (extensions.length === 0) {
        throw new Error('No Substrate wallet detected. Install Talisman, SubWallet, or Polkadot{.js} to continue.')
      }

      const withMetadata = extensions.find((ext) => !!ext.metadata)
      if (!withMetadata?.metadata) {
        throw new Error('Your wallet extension does not support adding custom networks. Try Talisman or SubWallet instead.')
      }

      await withMetadata.metadata.provide({
        chain: AWARIZON_CHAIN.chainName,
        genesisHash: AWARIZON_CHAIN.genesisHash,
        icon: 'substrate',
        ss58Format: AWARIZON_CHAIN.ss58Format,
        chainType: 'substrate',
        color: AWARIZON_CHAIN.color,
        specVersion: AWARIZON_CHAIN.specVersion,
        tokenDecimals: AWARIZON_CHAIN.tokenDecimals,
        tokenSymbol: AWARIZON_CHAIN.tokenSymbol,
        types: {},
      })

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
