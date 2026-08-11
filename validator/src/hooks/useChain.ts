'use client'

import { useEffect, useState } from 'react'
import type { Provider } from 'awarizon.js'
import { useWallet } from './useWallet'

// Read-only chain access, independent of whether a wallet is connected.
// Every page that just needs to *read* validator data (leaderboard,
// landing preview, dashboard before a wallet connects) should use this
// instead of reaching into useWallet() directly.
export function useChain(): { provider: Provider | null; ready: boolean } {
  const stateProvider = useWallet(s => s.provider)
  const ensureProvider = useWallet(s => s.ensureProvider)
  const [provider, setProvider] = useState<Provider | null>(stateProvider)

  useEffect(() => {
    if (stateProvider) {
      setProvider(stateProvider)
      return
    }
    let cancelled = false
    ensureProvider()
      .then(p => { if (!cancelled) setProvider(p) })
      .catch(console.error)
    return () => { cancelled = true }
  }, [stateProvider, ensureProvider])

  return { provider, ready: provider !== null }
}
