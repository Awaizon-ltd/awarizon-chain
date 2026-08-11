'use client'

import { useEffect } from 'react'
import { Provider } from 'awarizon.js'
import { useWalletStore } from '../store/walletStore'
import { RPC_ENDPOINT } from '../constants'

// Runs the app-wide connection bootstrapping once, client-side only —
// there's no server-rendered data here, this whole app is a
// wallet-connected dApp, so everything below is 'use client'.
export default function AppInit({
  children,
}: {
  children: React.ReactNode
}) {
  const provider = useWalletStore(s => s.provider)

  // Persistent read-only provider — connected once and never torn down
  // by wallet connect/disconnect, so pages can browse read-only data
  // regardless of whether a signer is attached.
  useEffect(() => {
    if (!provider) {
      Provider.connect(RPC_ENDPOINT)
        .then(p => {
          useWalletStore.setState({ provider: p })
        })
        .catch(console.error)
    }
  }, [provider])

  // Silently reattach to a previously-connected browser extension
  // account after a page refresh, instead of leaving the user staring
  // at "Connect Wallet" when Talisman/SubWallet already authorized
  // this site. Runs once; no-ops if nothing was saved.
  useEffect(() => {
    useWalletStore.getState().tryAutoReconnect()
  }, [])

  return <>{children}</>
}
