'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Search, Inbox, TrendingUp, Lock, Hourglass } from 'lucide-react'
import { useWalletStore } from '../store/walletStore'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import StatCard from '../components/ui/StatCard'
import { INDEXER_ENDPOINT } from '../constants'

function statusVariant(status: string) {
  if (status === 'Active') return 'success'
  if (status === 'Expired') return 'warning'
  if (status === 'Terminated') return 'error'
  return 'default'
}

export default function CampaignDetail() {
  const params = useParams<{ campaignId: string }>()
  const campaignId = params?.campaignId
  const { provider, signer, address } = useWalletStore()
  const router = useRouter()

  const [campaign, setCampaign] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [terminating, setTerminating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!provider || !campaignId) return
      setLoading(true)
      try {
        const [c, s] = await Promise.allSettled([
          provider.campaigns.get(campaignId),
          provider.campaigns.stats(campaignId),
        ])

        const campaignResult = c.status === 'fulfilled' ? c.value : null
        const statsResult = s.status === 'fulfilled' ? s.value : null

        if (c.status === 'rejected') {
          console.warn('Chain RPC failed for campaign', campaignId, c.reason)
        }
        if (s.status === 'rejected') {
          console.warn('Chain RPC failed for campaign stats', campaignId, s.reason)
        }

        if (campaignResult) {
          setCampaign(campaignResult)
          setStats(statsResult)
        } else if (address) {
          // Chain call failed or returned nothing — fall back to
          // whatever the indexer knows about this campaign so the page
          // still shows something instead of "Campaign not found".
          const res = await fetch(
            `${INDEXER_ENDPOINT}` +
            `/campaign-events?developer=${address}` +
            `&limit=50`
          ).then(r => r.json()).catch(() => null)

          const event = res?.events?.find(
            (e: any) => (e.campaignId ?? e.campaign_id) === campaignId
          )

          if (event) {
            setCampaign({
              campaignId,
              developer: event.developer,
              manifestHash: null,
              status: 'Active',
              createdAt: event.blockNumber,
              expiresAt: null,
              maxDeliveries: null,
              currentDeliveries: null,
              storageFeePaid: null,
            })
          }
        }
      } catch (err) {
        console.error('Campaign detail error:', err)
      }
      setLoading(false)
    }
    load()
  }, [provider, campaignId, address])

  const handleTerminate = async () => {
    if (!signer || !campaignId) return
    setTerminating(true)
    setError(null)
    try {
      await signer.campaigns.terminate(campaignId)
      router.push('/campaigns')
    } catch (err: any) {
      setError(err.message ?? 'Failed to terminate campaign')
    } finally {
      setTerminating(false)
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-xl p-12
        text-center text-[#888]">
        Loading campaign...
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="glass rounded-xl p-12
        text-center">
        <Search className="w-12 h-12 mx-auto mb-4 text-[#444]" />
        <h2 className="font-bold text-lg mb-2">
          Campaign not found
        </h2>
        <Button onClick={() => router.push('/campaigns')}>
          Back to Campaigns
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row
        sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black">
              Campaign
            </h1>
            <Badge
              label={campaign.status ?? 'Active'}
              variant={statusVariant(campaign.status ?? 'Active')}
            />
          </div>
          <p className="font-mono text-sm text-[#888]
            break-all">
            {campaign.campaignId}
          </p>
        </div>
        {campaign.status === 'Active' && (
          <div className="flex gap-3 flex-shrink-0">
            <Link href={`/campaigns/${campaign.campaignId}/deliver`}>
              <Button fullWidth className="sm:w-auto">
                Deliver
              </Button>
            </Link>
            <Button
              variant="danger"
              loading={terminating}
              onClick={handleTerminate}
              fullWidth
              className="sm:w-auto"
            >
              Terminate
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Deliveries"
          value={`${campaign.currentDeliveries?.toLocaleString() ?? 0} / ${campaign.maxDeliveries?.toLocaleString() ?? 0}`}
          icon={Inbox}
        />
        <StatCard
          label="Progress"
          value={`${stats?.percentage ?? 0}%`}
          icon={TrendingUp}
          accent
        />
        <StatCard
          label="Storage Fee Paid"
          value={campaign.storageFeePaid}
          icon={Lock}
        />
        <StatCard
          label="Expires"
          value={`block ${campaign.expiresAt?.toLocaleString()}`}
          icon={Hourglass}
        />
      </div>

      <div className="glass rounded-xl p-5 space-y-3">
        <h2 className="font-bold mb-2">Manifest</h2>
        <p className="font-mono text-sm text-[#888] break-all">
          {campaign.manifestHash}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border
          border-red-500/30 rounded-xl p-4
          text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
