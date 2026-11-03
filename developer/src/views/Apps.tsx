'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppWindow, Plus, X, ExternalLink } from 'lucide-react'
import { useWalletStore } from '../store/walletStore'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import RegisterAppForm from '../components/apps/RegisterAppForm'
import VerifiedNotice from '../components/VerifiedNotice'
import { fetchManifests, type AppManifestData } from '../lib/manifestApi'

// AppManifest isn't exported from awarizon.js's package entrypoint
// (only defined internally in modules/apps.ts), so the on-chain half
// is typed loosely. `manifest` is fetched separately from
// metadataUri — nothing on-chain carries name/icon/description.
interface AppEntry {
  manifestHash: string
  category: string
  registeredAt: number
  metadataUri: string
  manifest: AppManifestData | null
}

export default function Apps() {
  const { provider, address } = useWalletStore()
  const [apps, setApps] = useState<AppEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showRegister, setShowRegister] = useState(false)

  const refresh = async () => {
    if (!provider || !address) return
    try {
      const list = await provider.apps.list(address)
      const manifestByUri = await fetchManifests(list.map((app: any) => app.metadataUri))
      setApps(list.map((app: any) => ({
        ...app,
        manifest: manifestByUri[app.metadataUri] ?? null,
      })))
    } catch {}
  }

  useEffect(() => {
    // Reset synchronously on address change so a previous account's
    // apps don't linger on screen while this fetch is in flight.
    setApps([])
    setLoading(true)

    async function load() {
      await refresh()
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, address])

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row
        sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">My Apps</h1>
          <p className="text-[#888] text-sm mt-1">
            Register an app to get the manifest hash your
            campaigns reference
          </p>
        </div>
        <Button
          onClick={() => setShowRegister(true)}
          fullWidth
          className="sm:w-auto"
        >
          <Plus className="w-4 h-4" /> Register App
        </Button>
      </div>

      {showRegister && (
        <div className="glass rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Register App</h2>
            <button
              onClick={() => setShowRegister(false)}
              className="text-[#888] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <VerifiedNotice />
          <RegisterAppForm
            onRegistered={() => {
              setShowRegister(false)
              refresh()
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="glass rounded-xl p-12
          text-center text-[#888]">
          Loading apps...
        </div>
      ) : apps.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <AppWindow className="w-10 h-10 mx-auto mb-3 text-[#444]" />
          <p className="text-[#888] text-sm mb-4">
            No apps registered yet
          </p>
          <Button size="sm" onClick={() => setShowRegister(true)}>
            Register Your First App
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2
          lg:grid-cols-3 gap-4">
          {apps.map(app => (
            <Link key={app.manifestHash}
              href={`/apps/${app.manifestHash}`}
              className="block glass rounded-xl p-5
                hover:bg-dev-surface transition-all">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden
                  bg-dev-surface2 flex-shrink-0 flex items-center
                  justify-center">
                  {app.manifest?.media?.icon ? (
                    <img src={app.manifest.media.icon} alt=""
                      className="w-full h-full object-cover" />
                  ) : (
                    <AppWindow className="w-5 h-5 text-[#555]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm truncate">
                    {app.manifest?.name ?? 'Untitled App'}
                  </p>
                  <Badge label={app.category} variant="yellow" />
                </div>
              </div>

              <p className="text-[#888] text-xs mb-3 line-clamp-2">
                {app.manifest?.shortDescription
                  ?? app.manifest?.description
                  ?? 'No description available.'}
              </p>

              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-[#555] truncate">
                  {app.manifestHash.slice(0, 14)}...
                </p>
                {app.manifest?.app?.url && (
                  <button
                    onClick={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      window.open(app.manifest!.app.url, '_blank', 'noopener,noreferrer')
                    }}
                    className="flex items-center gap-1 text-xs
                      text-yellow-400 hover:text-yellow-300
                      flex-shrink-0"
                  >
                    Visit <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
