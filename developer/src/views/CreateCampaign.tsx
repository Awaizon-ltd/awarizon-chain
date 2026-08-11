'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { PartyPopper, Plus, X } from 'lucide-react'
import { useWalletStore } from '../store/walletStore'
import Button from '../components/ui/Button'
import RegisterAppForm from '../components/apps/RegisterAppForm'
import VerifiedNotice from '../components/VerifiedNotice'
import { fetchManifests } from '../lib/manifestApi'
import {
  APP_CATEGORIES, REGIONS
} from '../constants'

export default function CreateCampaign() {
  const { signer, provider, address } = useWalletStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  // Set when arriving from an app's detail page ("+ New Campaign") —
  // preselects that app instead of leaving the picker on "Select an app".
  const prefillManifestHash = searchParams.get('manifestHash') ?? ''

  const [apps, setApps] = useState<any[]>([])
  const [appsLoading, setAppsLoading] = useState(true)
  const [showRegister, setShowRegister] = useState(false)

  const refreshApps = async () => {
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
    // Reset synchronously on address change — otherwise a previously
    // selected manifest hash (or another account's app list) can
    // linger and get submitted under the newly connected account.
    setApps([])
    setAppsLoading(true)
    setForm(prev => ({ ...prev, manifestHash: prefillManifestHash }))

    async function load() {
      await refreshApps()
      setAppsLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, address])

  const [form, setForm] = useState({
    manifestHash: prefillManifestHash,
    durationDays: 30,
    maxDeliveries: 1000,
    regionCodes: [] as number[],
    categoryHistory: [] as string[],
    rizBalanceMin: '',
    walletAgeMin: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    null
  )
  const [result, setResult] =
    useState<{ campaignId: string } | null>(null)

  const update = (key: string, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const toggleRegion = (code: number) => {
    setForm(prev => ({
      ...prev,
      regionCodes: prev.regionCodes.includes(code)
        ? prev.regionCodes.filter(r => r !== code)
        : [...prev.regionCodes, code],
    }))
  }

  const toggleCategory = (cat: string) => {
    setForm(prev => ({
      ...prev,
      categoryHistory:
        prev.categoryHistory.includes(cat)
          ? prev.categoryHistory.filter(c => c !== cat)
          : [...prev.categoryHistory, cat],
    }))
  }

  const handleCreate = async () => {
    if (!signer || !form.manifestHash) return
    setLoading(true)
    setError(null)
    try {
      const res = await signer.campaigns.create({
        manifestHash: form.manifestHash,
        durationDays: form.durationDays,
        maxDeliveries: form.maxDeliveries,
        targeting: {
          regionCodes: form.regionCodes.length
            ? form.regionCodes : undefined,
          categoryHistory:
            form.categoryHistory.length
              ? form.categoryHistory as any
              : undefined,
          rizBalanceMin: form.rizBalanceMin
            ? form.rizBalanceMin : undefined,
          walletAgeMin: form.walletAgeMin
            ? Number(form.walletAgeMin) : undefined,
        },
      })
      setResult({ campaignId: res.campaignId })
    } catch (err: any) {
      setError(err.message ?? 'Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="glass rounded-2xl p-8
          text-center">
          <PartyPopper className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
          <h2 className="text-xl font-black mb-2">
            Campaign Created!
          </h2>
          <p className="text-[#888] text-sm mb-4">
            Your campaign is now live on Awarizon
          </p>
          <div className="bg-dev-surface2 rounded-xl
            p-3 mb-6">
            <p className="text-xs text-[#888] mb-1">
              Campaign ID
            </p>
            <p className="font-mono text-yellow-400
              text-sm break-all">
              {result.campaignId}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => router.push('/campaigns')}
            >
              View Campaigns
            </Button>
            <Button
              fullWidth
              onClick={() => {
                setResult(null)
                setForm({
                  manifestHash: '',
                  durationDays: 30,
                  maxDeliveries: 1000,
                  regionCodes: [],
                  categoryHistory: [],
                  rizBalanceMin: '',
                  walletAgeMin: '',
                })
              }}
            >
              Create Another
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      <div>
        <h1 className="text-2xl font-black">
          Create Campaign
        </h1>
        <p className="text-[#888] text-sm mt-1">
          Distribute your app to Awarizon users
          and pay them RIZ for engaging
        </p>
      </div>

      <div className="glass rounded-xl p-5">
        <div className="flex items-center
          justify-between mb-4">
          <h2 className="font-bold">
            App Manifest
          </h2>
          {!showRegister && (
            <button
              onClick={() => setShowRegister(true)}
              className="flex items-center gap-1
                text-xs font-semibold text-yellow-400
                hover:text-yellow-300"
            >
              <Plus className="w-3.5 h-3.5" />
              Register New App
            </button>
          )}
        </div>

        {showRegister ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#888]">
                Register an app to get its manifest hash
              </p>
              <button
                onClick={() => setShowRegister(false)}
                className="text-[#888] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <VerifiedNotice />
            <RegisterAppForm
              onRegistered={async hash => {
                setShowRegister(false)
                await refreshApps()
                update('manifestHash', hash)
              }}
            />
          </div>
        ) : appsLoading ? (
          <p className="text-sm text-[#888]">
            Loading your apps...
          </p>
        ) : apps.length === 0 ? (
          <p className="text-sm text-[#888]">
            You haven't registered an app yet.{' '}
            <button
              onClick={() => setShowRegister(true)}
              className="text-yellow-400 hover:text-yellow-300
                font-semibold"
            >
              Register one
            </button>
            {' '}to get a manifest hash for this campaign, or manage
            them from <Link href="/apps" className="text-yellow-400
              hover:text-yellow-300 font-semibold">My Apps</Link>.
          </p>
        ) : (
          <div>
            <label className="text-sm text-[#888]
              block mb-2">
              App *
            </label>
            <select
              value={form.manifestHash}
              onChange={e =>
                update('manifestHash', e.target.value)
              }
              className="w-full bg-dev-surface2
                border border-dev-border rounded-xl
                px-4 py-3 text-sm text-white
                focus:outline-none
                focus:border-yellow-400/50"
            >
              <option value="">Select an app</option>
              {apps.map(app => (
                <option key={app.manifestHash} value={app.manifestHash}>
                  {app.manifest?.name ?? app.category} ({app.category})
                </option>
              ))}
            </select>
            <p className="text-xs text-[#555] mt-2">
              Manage your registered apps on{' '}
              <Link href="/apps" className="text-yellow-400
                hover:text-yellow-300">My Apps</Link>.
            </p>
          </div>
        )}
      </div>

      <div className="glass rounded-xl p-5">
        <h2 className="font-bold mb-4">
          Campaign Settings
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#888]
              block mb-2">
              Duration (days)
            </label>
            <input
              type="number"
              value={form.durationDays}
              onChange={e =>
                update('durationDays',
                  Number(e.target.value))
              }
              min={1} max={365}
              className="w-full bg-dev-surface2
                border border-dev-border rounded-xl
                px-4 py-3 text-sm text-white
                focus:outline-none
                focus:border-yellow-400/50"
            />
          </div>
          <div>
            <label className="text-sm text-[#888]
              block mb-2">
              Max Deliveries
            </label>
            <input
              type="number"
              value={form.maxDeliveries}
              onChange={e =>
                update('maxDeliveries',
                  Number(e.target.value))
              }
              min={1}
              className="w-full bg-dev-surface2
                border border-dev-border rounded-xl
                px-4 py-3 text-sm text-white
                focus:outline-none
                focus:border-yellow-400/50"
            />
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-5">
        <h2 className="font-bold mb-4">
          Targeting (Optional)
        </h2>

        <div className="mb-5">
          <label className="text-sm text-[#888]
            block mb-3">
            Target Regions
            <span className="text-[#555] ml-1">
              (leave empty = all regions)
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map(r => (
              <button
                key={r.code}
                onClick={() => toggleRegion(r.code)}
                className={`
                  text-xs px-3 py-1.5 rounded-lg
                  border transition-all font-semibold
                  ${form.regionCodes.includes(r.code)
                    ? 'bg-yellow-400/10 border-yellow-400/50 text-yellow-400'
                    : 'border-dev-border text-[#888] hover:text-white'
                  }
                `}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="text-sm text-[#888]
            block mb-3">
            Target Users Who Engage With
          </label>
          <div className="flex flex-wrap gap-2">
            {APP_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`
                  text-xs px-3 py-1.5 rounded-lg
                  border transition-all font-semibold
                  ${form.categoryHistory.includes(cat)
                    ? 'bg-yellow-400/10 border-yellow-400/50 text-yellow-400'
                    : 'border-dev-border text-[#888] hover:text-white'
                  }
                `}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#888]
              block mb-2">
              Min RIZ Balance
            </label>
            <input
              type="number"
              value={form.rizBalanceMin}
              onChange={e =>
                update('rizBalanceMin', e.target.value)
              }
              placeholder="e.g. 10"
              className="w-full bg-dev-surface2
                border border-dev-border rounded-xl
                px-4 py-3 text-sm text-white
                placeholder-[#444]
                focus:outline-none
                focus:border-yellow-400/50"
            />
          </div>
          <div>
            <label className="text-sm text-[#888]
              block mb-2">
              Min Wallet Age (days)
            </label>
            <input
              type="number"
              value={form.walletAgeMin}
              onChange={e =>
                update('walletAgeMin', e.target.value)
              }
              placeholder="e.g. 30"
              className="w-full bg-dev-surface2
                border border-dev-border rounded-xl
                px-4 py-3 text-sm text-white
                placeholder-[#444]
                focus:outline-none
                focus:border-yellow-400/50"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border
          border-red-500/30 rounded-xl p-4
          text-red-400 text-sm">
          {error}
        </div>
      )}

      <VerifiedNotice />

      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          fullWidth
          loading={loading}
          disabled={!form.manifestHash || loading}
          onClick={handleCreate}
        >
          {loading
            ? 'Creating Campaign...'
            : 'Create Campaign'
          }
        </Button>
      </div>
    </div>
  )
}
