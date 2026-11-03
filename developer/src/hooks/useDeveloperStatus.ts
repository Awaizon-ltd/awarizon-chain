import { useEffect, useState } from 'react'
import { useWalletStore } from '../store/walletStore'

// awarizon.js doesn't export DeveloperStatus from its package entrypoint
// (only defined internally in modules/developer.ts), so this is typed
// loosely rather than importing a type that isn't part of the public API.
export function useDeveloperStatus() {
  const { provider, address } = useWalletStore()
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Reset synchronously on address change — otherwise switching
    // accounts leaves the previous account's status on screen for the
    // duration of this fetch, which could show as "registered" for an
    // account that isn't.
    setStatus(null)
    setLoading(true)
    let cancelled = false

    async function load() {
      if (!provider || !address) {
        setLoading(false)
        return
      }
      try {
        const result = await provider.developer.status(address)
        if (!cancelled) setStatus(result)
      } catch {}
      if (!cancelled) setLoading(false)
    }
    load()

    return () => {
      cancelled = true
    }
  }, [provider, address])

  return { status, loading }
}
