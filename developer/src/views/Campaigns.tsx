'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Megaphone } from 'lucide-react'
import { useWalletStore } from '../store/walletStore'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { INDEXER_ENDPOINT } from '../constants'

function statusVariant(status: string) {
  if (status === 'Active') return 'success'
  if (status === 'Expired') return 'warning'
  if (status === 'Terminated') return 'error'
  return 'default'
}

export default function Campaigns() {
  const { provider, address } = useWalletStore()
  const [campaigns, setCampaigns] =
    useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!provider || !address) return
      setLoading(true)
      try {
        const res = await fetch(
          `${INDEXER_ENDPOINT}` +
          `/campaign-events?developer=${address}` +
          `&limit=50`
        ).then(r => r.json()).catch(() => null)

        if (!res?.events?.length) {
          setCampaigns([])
          setLoading(false)
          return
        }

        // The indexer returns camelCase (eventType, campaignId) — this
        // used to be snake_case, and the mismatch alone was enough to
        // silently filter every event out even with a working chain
        // RPC. Handle both so a future indexer change can't do the
        // same thing silently again.
        const created = res.events.filter(
          (e: any) => (e.eventType ?? e.event_type) === 'created'
        )

        const details = await Promise.all(
          created.map(async (e: any) => {
            const campaignId = e.campaignId ?? e.campaign_id

            try {
              const campaign = await provider.campaigns.get(campaignId)
              if (campaign) {
                const stats = await provider.campaigns
                  .stats(campaignId)
                  .catch(() => null)
                return { ...campaign, stats }
              }
            } catch (err) {
              console.warn('Chain RPC failed for campaign', campaignId, err)
            }

            // Fallback — chain call failed or returned nothing, but the
            // indexer confirms this campaign exists, so still show it
            // with whatever the indexer itself knows.
            return {
              campaignId,
              developer: e.developer,
              manifestHash: null,
              status: 'Active',
              createdAt: e.blockNumber,
              expiresAt: null,
              maxDeliveries: null,
              currentDeliveries: null,
              storageFeePaid: null,
              stats: null,
            }
          })
        )

        setCampaigns(details.filter(Boolean))
      } catch (err) {
        console.error('Campaign load error:', err)
      }
      setLoading(false)
    }
    load()
  }, [provider, address])

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row
        sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-black">
          Campaigns
        </h1>
        <Link href="/campaigns/create">
          <Button fullWidth className="sm:w-auto">+ New Campaign</Button>
        </Link>
      </div>

      {loading ? (
        <div className="glass rounded-xl p-12
          text-center text-[#888]">
          Loading campaigns...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="glass rounded-xl p-12
          text-center">
          <Megaphone className="w-12 h-12 mx-auto mb-4 text-[#444]" />
          <h2 className="font-bold text-lg mb-2">
            No campaigns yet
          </h2>
          <p className="text-[#888] text-sm mb-6">
            Create your first campaign to start
            distributing your app to Awarizon users
          </p>
          <Link href="/campaigns/create">
            <Button>Create Campaign</Button>
          </Link>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          {/* Column header — desktop only, the mobile card below labels
              each value inline instead */}
          <div className="hidden md:grid grid-cols-5 gap-4
            px-5 py-3 border-b border-dev-border
            text-xs text-[#888] font-semibold
            uppercase tracking-wider">
            <span className="col-span-2">Campaign</span>
            <span className="text-center">Deliveries</span>
            <span className="text-center">Progress</span>
            <span className="text-right">Status</span>
          </div>

          {campaigns.map((c, i) => (
            <Link
              key={i}
              href={`/campaigns/${c.campaignId}`}
              className="block px-5 py-4 border-b border-dev-border
                last:border-0 hover:bg-dev-surface transition-all"
            >
              {/* Mobile: stacked card */}
              <div className="md:hidden space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-sm text-yellow-400 truncate">
                    {c.campaignId?.slice(0, 16)}...
                  </p>
                  <Badge
                    label={c.status ?? 'Active'}
                    variant={statusVariant(c.status ?? 'Active')}
                  />
                </div>
                <p className="text-xs text-[#555]">
                  Expires: block{' '}
                  {c.expiresAt?.toLocaleString()}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-sm text-white">
                    {c.currentDeliveries?.toLocaleString()}
                    <span className="text-[#555] font-normal text-xs">
                      {' '}/ {c.maxDeliveries?.toLocaleString()}
                    </span>
                  </span>
                  <span className="text-[#555]">
                    {c.stats?.percentage ?? 0}% delivered
                  </span>
                </div>
                <div className="bg-dev-surface2 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-yellow-400 h-full rounded-full transition-all"
                    style={{ width: `${c.stats?.percentage ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Desktop: dense grid row */}
              <div className="hidden md:grid grid-cols-5 gap-4 items-center">
                <div className="col-span-2">
                  <p className="font-mono text-sm
                    text-yellow-400">
                    {c.campaignId?.slice(0, 20)}...
                  </p>
                  <p className="text-xs text-[#555] mt-1">
                    Expires: block{' '}
                    {c.expiresAt?.toLocaleString()}
                  </p>
                </div>

                <p className="text-center text-sm
                  font-bold">
                  {c.currentDeliveries?.toLocaleString()}
                  <span className="text-[#555]
                    font-normal text-xs"> /
                    {c.maxDeliveries?.toLocaleString()}
                  </span>
                </p>

                <div>
                  <div className="bg-dev-surface2
                    rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-full
                        rounded-full transition-all"
                      style={{
                        width: `${c.stats?.percentage ?? 0}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-[#555]
                    mt-1 text-center">
                    {c.stats?.percentage ?? 0}%
                  </p>
                </div>

                <div className="text-right">
                  <Badge
                    label={c.status ?? 'Active'}
                    variant={statusVariant(
                      c.status ?? 'Active'
                    )}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
