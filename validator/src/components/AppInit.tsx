'use client'

import { useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'

// Runs app-wide bootstrapping once, client-side only.
export default function AppInit({ children }: { children: React.ReactNode }) {
  const ensureProvider = useWallet(s => s.ensureProvider)

  // Persistent read-only provider — connected once, never torn down by
  // wallet connect/disconnect.
  useEffect(() => {
    ensureProvider().catch(console.error)
  }, [ensureProvider])

  // Silently reattach to a previously-connected wallet after a page
  // refresh, instead of leaving the user staring at "Connect Wallet"
  // when the extension already authorized this site.
  useEffect(() => {
    useWallet.getState().tryAutoReconnect()
  }, [])

  return <>{children}</>
}
