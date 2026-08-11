'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Search, AppWindow, ExternalLink, ArrowLeft,
  Megaphone, Inbox, TrendingUp, Hourglass,
} from 'lucide-react'
import { useWalletStore } from '../store/walletStore'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import StatCard from '../components/ui/StatCard'
import { fetchManifests, type AppManifestData } from '../lib/manifestApi'
import { INDEXER_ENDPOINT } from '../constants'

function statusVariant(status: string) {
  if (status === 'Active') return 'success'
  if (status === 'Expired') return 'warning'
  if (status === 'Terminated') return 'error'
  return 'default'
}

export default function AppDetail() {
  const params = useParams<{ manifestHash: string }>()
  const manifestHash = params?.manifestHash
  const { provider, address } = useWalletStore()
  const router = useRouter()

  const [app, setApp] = useState<any>(null)
  const [manifest, setManifest] = useState<AppManifestData | null>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [campaignsLoading, setCampaignsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!provider || !manifestHash) return
      setLoading(true)
      try {
        const a = await provider.apps.get(manifestHash)
        setApp(a)
        if (a) {
          const byUri = await fetchManifests([a.metadataUri])
          setManifest(byUri[a.metadataUri] ?? null)
        }
      } catch (err) {
        console.error('App detail error:', err)
      }
      setLoading(false)
    }
    load()
  }, [provider, manifestHash])

  // Separate effect — this app's campaigns aren't looked up by
  // manifestHash on-chain (no such index exists), so the only way to
  // find them is the same route Campaigns.tsx uses: pull every campaign
  // event for the developer from the indexer, then filter down to the
  // ones pointing at this manifest.
  useEffect(() => {
    async function loadCampaigns() {
      if (!app?.developer) return
      setCampaignsLoading(true)
      try {
        const res = await fetch(
          `${INDEXER_ENDPOINT}/campaign-events` +
          `?developer=${app.developer}&limit=50`
        ).then(r => r.json()).catch(() => null)

        const created = (res?.events ?? []).filter(
          (e: any) => (e.eventType ?? e.event_type) === 'created'
        )

        const details = await Promise.all(
          created.map(async (e: any) => {
            const campaignId = e.campaignId ?? e.campaign_id
            try {
              const campaign = await provider!.campaigns.get(campaignId)
              if (!campaign) return null
              const stats = await provider!.campaigns
                .stats(campaignId).catch(() => null)
              return { ...campaign, stats }
            } catch {
              return null
            }
          })
        )

        setCampaigns(
          details.filter(
            (c): c is NonNullable<typeof c> =>
              Boolean(c) && c!.manifestHash === manifestHash
          )
        )
      } catch (err) {
        console.error('App campaigns load error:', err)
      }
      setCampaignsLoading(false)
    }
    loadCampaigns()
  }, [provider, app, manifestHash])

  if (loading) {
    return (
      <div className="glass rounded-xl p-12 text-center text-[#888]">
        Loading app...
      </div>
    )
  }

  if (!app) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <Search className="w-12 h-12 mx-auto mb-4 text-[#444]" />
        <h2 className="font-bold text-lg mb-2">App not found</h2>
        <Button onClick={() => router.push('/apps')}>
          Back to My Apps
        </Button>
      </div>
    )
  }

  const totalDeliveries = campaigns.reduce(
    (sum, c) => sum + (c.currentDeliveries ?? 0), 0
  )
  const totalMaxDeliveries = campaigns.reduce(
    (sum, c) => sum + (c.maxDeliveries ?? 0), 0
  )
  const activeCampaigns = campaigns.filter(c => c.status === 'Active').length

  return (
    <div className="space-y-6">

      <Link
        href="/apps"
        className="inline-flex items-center gap-1.5 text-sm
          text-[#888] hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Apps
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center
        justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-16 h-16 rounded-2xl overflow-hidden
            bg-dev-surface2 flex-shrink-0 flex items-center
            justify-center">
            {manifest?.media?.icon ? (
              <img src={manifest.media.icon} alt=""
                className="w-full h-full object-cover" />
            ) : (
              <AppWindow className="w-7 h-7 text-[#555]" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black truncate">
                {manifest?.name ?? 'Untitled App'}
              </h1>
              <Badge label={app.category} variant="yellow" />
            </div>
            <p className="font-mono text-xs text-[#555] truncate">
              {app.manifestHash}
            </p>
          </div>
        </div>

        <div className="flex gap-3 flex-shrink-0">
          {manifest?.app?.url && (
            <a href={manifest.app.url} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">
                Visit <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </a>
          )}
          <Link href={`/campaigns/create?manifestHash=${app.manifestHash}`}>
            <Button>+ New Campaign</Button>
          </Link>
        </div>
      </div>

      {manifest?.description && (
        <div className="glass rounded-xl p-5">
          <p className="text-sm text-[#ccc]">{manifest.description}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Campaigns"
          value={campaigns.length}
          icon={Megaphone}
        />
        <StatCard
          label="Active Campaigns"
          value={activeCampaigns}
          icon={TrendingUp}
          accent
        />
        <StatCard
          label="Total Deliveries"
          value={`${totalDeliveries.toLocaleString()} / ${totalMaxDeliveries.toLocaleString()}`}
          icon={Inbox}
        />
        <StatCard
          label="Registered"
          value={`block ${app.registeredAt?.toLocaleString()}`}
          icon={Hourglass}
        />
      </div>

      <div className="glass rounded-xl p-5 space-y-3">
        <h2 className="font-bold mb-2">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[#555] text-xs mb-1">Developer</p>
            <p className="font-mono text-[#ccc] break-all">{app.developer}</p>
          </div>
          <div>
            <p className="text-[#555] text-xs mb-1">Metadata URI</p>
            <p className="font-mono text-[#ccc] break-all">{app.metadataUri}</p>
          </div>
          {manifest?.metadata?.version && (
            <div>
              <p className="text-[#555] text-xs mb-1">Version</p>
              <p className="text-[#ccc]">{manifest.metadata.version}</p>
            </div>
          )}
          {manifest?.metadata?.tags && manifest.metadata.tags.length > 0 && (
            <div>
              <p className="text-[#555] text-xs mb-1">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {manifest.metadata.tags.map(tag => (
                  <Badge key={tag} label={tag} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-bold mb-3">Campaigns for this app</h2>

        {campaignsLoading ? (
          <div className="glass rounded-xl p-8 text-center text-[#888] text-sm">
            Loading campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-[#888] text-sm mb-4">
              No campaigns for this app yet
            </p>
            <Link href={`/campaigns/create?manifestHash=${app.manifestHash}`}>
              <Button size="sm">Create Campaign</Button>
            </Link>
          </div>
        ) : (
          <div className="glass rounded-xl overflow-hidden">
            {campaigns.map((c, i) => (
              <Link
                key={i}
                href={`/campaigns/${c.campaignId}`}
                className="flex items-center justify-between gap-4
                  px-5 py-4 border-b border-dev-border last:border-0
                  hover:bg-dev-surface transition-all"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm text-yellow-400 truncate">
                    {c.campaignId?.slice(0, 20)}...
                  </p>
                  <p className="text-xs text-[#555] mt-1">
                    {c.currentDeliveries?.toLocaleString() ?? 0} /{' '}
                    {c.maxDeliveries?.toLocaleString() ?? 0} deliveries
                  </p>
                </div>
                <Badge
                  label={c.status ?? 'Active'}
                  variant={statusVariant(c.status ?? 'Active')}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
