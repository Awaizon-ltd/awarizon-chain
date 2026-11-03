'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { blake2AsHex } from '@polkadot/util-crypto'
import {
  ArrowLeft, Search, Send, Users, CheckCircle2,
  AlertTriangle, Wallet, Zap,
} from 'lucide-react'
import { useWalletStore } from '../store/walletStore'
import Button from '../components/ui/Button'
import StatCard from '../components/ui/StatCard'
import { fetchManifests, type AppManifestData } from '../lib/manifestApi'
import { CATEGORY_CODE, INDEXER_ENDPOINT } from '../constants'
import type { CampaignTargeting } from 'awarizon.js'

interface MatchWallet {
  address: string
  walletAgeDays: number
  activityCount: number
  categoryHistory: number[]
  regionCode: number
}

interface TargetingSummary {
  totalIndexed: number
  matched: number
  alreadyDelivered: number
  remaining: number
  matchRate: number
}

interface DeliverProgress {
  total: number
  done: number
  succeeded: number
  failed: { address: string; error: string }[]
}

function targetingParams(targeting: CampaignTargeting, campaignId: string) {
  const params = new URLSearchParams({ campaign_id: campaignId })
  if (targeting.walletAgeMin != null) params.set('min_age', String(targeting.walletAgeMin))
  if (targeting.activityMin != null) params.set('min_activity', String(targeting.activityMin))
  if (targeting.categoryHistory.length) {
    const codes = targeting.categoryHistory
      .map(name => CATEGORY_CODE[name])
      .filter((c): c is number => c != null)
    if (codes.length) params.set('categories', codes.join(','))
  }
  if (targeting.regionCodes.length) {
    params.set('regions', targeting.regionCodes.join(','))
  }
  return params
}

export default function DeliverCampaign() {
  const params = useParams<{ campaignId: string }>()
  const campaignId = params?.campaignId
  const { provider, signer, address } = useWalletStore()

  const [campaign, setCampaign] = useState<any>(null)
  const [targeting, setTargeting] = useState<CampaignTargeting | null>(null)
  const [manifest, setManifest] = useState<AppManifestData | null>(null)
  const [devBalance, setDevBalance] = useState<string | null>(null)
  const [summary, setSummary] = useState<TargetingSummary | null>(null)
  const [wallets, setWallets] = useState<MatchWallet[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [matchLoading, setMatchLoading] = useState(true)
  const [progress, setProgress] = useState<DeliverProgress | null>(null)
  const [isTriggering, setIsTriggering] = useState(false)
  const [deliveryTriggered, setDeliveryTriggered] = useState(false)

  const loadCampaign = useCallback(async () => {
    if (!provider || !campaignId) return
    setLoading(true)
    try {
      const [c, t] = await Promise.all([
        provider.campaigns.get(campaignId),
        provider.campaigns.targeting(campaignId),
      ])
      setCampaign(c)
      setTargeting(t)
      if (c) {
        const [app, balance] = await Promise.all([
          provider.apps.get(c.manifestHash),
          provider.wallet.balance(c.developer),
        ])
        if (app) {
          const byUri = await fetchManifests([app.metadataUri])
          setManifest(byUri[app.metadataUri] ?? null)
        }
        setDevBalance(balance.free)
      }
    } catch (err) {
      console.error('Deliver page load error:', err)
    }
    setLoading(false)
  }, [provider, campaignId])

  useEffect(() => { loadCampaign() }, [loadCampaign])

  const loadMatching = useCallback(async () => {
    if (!campaignId || !targeting) return
    setMatchLoading(true)
    try {
      const qp = targetingParams(targeting, campaignId)
      const [summaryRes, matchRes] = await Promise.all([
        fetch(`${INDEXER_ENDPOINT}/targeting/summary?${qp}`).then(r => r.json()),
        fetch(`${INDEXER_ENDPOINT}/targeting/match?${qp}&limit=500`).then(r => r.json()),
      ])
      setSummary(summaryRes)
      const list: MatchWallet[] = matchRes?.wallets ?? []
      setWallets(list)
      setSelected(new Set(list.map(w => w.address)))
    } catch (err) {
      console.error('Matching wallets load error:', err)
    }
    setMatchLoading(false)
  }, [campaignId, targeting])

  useEffect(() => { loadMatching() }, [loadMatching])

  const toggleSelected = (addr: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(addr)) next.delete(addr)
      else next.add(addr)
      return next
    })
  }

  const deliverToWallets = async (targets: string[]) => {
    if (!signer || !campaignId || !targets.length) return
    setProgress({ total: targets.length, done: 0, succeeded: 0, failed: [] })
    for (const wallet of targets) {
      try {
        const recordId = blake2AsHex(
          `${campaignId}:${wallet}:${Date.now()}:${Math.random()}`, 256
        )
        await signer.campaigns.deliver({ campaignId, wallet, recordId })
        setProgress(p => p && { ...p, done: p.done + 1, succeeded: p.succeeded + 1 })
      } catch (err: any) {
        setProgress(p => p && {
          ...p, done: p.done + 1,
          failed: [...p.failed, { address: wallet, error: err.message ?? 'Failed' }],
        })
      }
    }
    await Promise.all([loadCampaign(), loadMatching()])
  }

  const handleTriggerDelivery = async () => {
    if (!signer || !campaignId) return
    setIsTriggering(true)
    try {
      await signer.campaigns.triggerDelivery(campaignId)
      setDeliveryTriggered(true)
      await loadCampaign()
    } catch (err: any) {
      console.error('Trigger delivery failed:', err)
    }
    setIsTriggering(false)
  }

  const hasUnmatchableCriteria = Boolean(
    targeting?.rizBalanceMin || targeting?.rizBalanceMax || targeting?.customLogicHash
  )

  if (loading) {
    return (
      <div className="glass rounded-xl p-12 text-center text-[#888]">
        Loading campaign...
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <Search className="w-12 h-12 mx-auto mb-4 text-[#444]" />
        <h2 className="font-bold text-lg mb-2">Campaign not found</h2>
        <Link href="/campaigns"><Button>Back to Campaigns</Button></Link>
      </div>
    )
  }

  const selectedList = wallets.filter(w => selected.has(w.address)).map(w => w.address)
  const allAddresses = wallets.map(w => w.address)
  const isDelivering = progress != null && progress.done < progress.total

  return (
    <div className="space-y-6">

      <Link
        href={`/campaigns/${campaignId}`}
        className="inline-flex items-center gap-1.5 text-sm text-[#888] hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Campaign
      </Link>

      <div>
        <h1 className="text-2xl font-black">
          Deliver — {manifest?.name ?? 'Untitled App'}
        </h1>
        <p className="font-mono text-xs text-[#555] mt-1 break-all">
          {campaignId}
        </p>
      </div>

      <div className="glass rounded-xl p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-yellow-400/10 flex items-center
          justify-center mx-auto">
          <Zap className="w-8 h-8 text-yellow-400" />
        </div>

        <h2 className="text-xl font-bold">One-Click Delivery</h2>

        <p className="text-[#888] text-sm max-w-md mx-auto">
          Sign once and the Awarizon chain automatically delivers your campaign
          to all {summary?.matched ?? 0} matching wallets over the following
          blocks. No further action needed. Prefer picking wallets by hand?
          Use the manual list below instead.
        </p>

        <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto text-center">
          <div>
            <p className="text-2xl font-black text-yellow-400">
              {summary?.matched ?? 0}
            </p>
            <p className="text-xs text-[#888]">Target wallets</p>
          </div>
          <div>
            <p className="text-2xl font-black">1</p>
            <p className="text-xs text-[#888]">Signature needed</p>
          </div>
          <div>
            <p className="text-2xl font-black">~30s</p>
            <p className="text-xs text-[#888]">Delivery time</p>
          </div>
        </div>

        {deliveryTriggered ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <p className="text-green-400 font-bold">Delivery triggered!</p>
            <p className="text-[#888] text-sm mt-1">
              The chain is delivering to all matching wallets automatically.
              Check back in a few minutes.
            </p>
          </div>
        ) : (
          <Button
            size="lg"
            disabled={!summary?.matched || isTriggering}
            loading={isTriggering}
            onClick={handleTriggerDelivery}
          >
            <Zap className="w-4 h-4" />
            Trigger Delivery to {summary?.matched ?? 0} Wallets
          </Button>
        )}
      </div>

      {hasUnmatchableCriteria && (
        <div className="bg-yellow-500/10 border border-yellow-500/30
          rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-200">
            This campaign also targets{' '}
            {(targeting?.rizBalanceMin || targeting?.rizBalanceMax) && 'a RIZ balance range'}
            {(targeting?.rizBalanceMin || targeting?.rizBalanceMax) && targeting?.customLogicHash && ' and '}
            {targeting?.customLogicHash && 'custom logic'}
            {' '}— neither is enforced by wallet matching yet. The counts below
            only reflect wallet age, activity, category and region.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Matching Wallets"
          value={matchLoading ? '…' : summary?.matched ?? 0}
          icon={Users}
          accent
        />
        <StatCard
          label="Already Delivered"
          value={matchLoading ? '…' : summary?.alreadyDelivered ?? 0}
          icon={CheckCircle2}
        />
        <StatCard
          label="Deliveries (on-chain)"
          value={`${campaign.currentDeliveries?.toLocaleString() ?? 0} / ${campaign.maxDeliveries?.toLocaleString() ?? 0}`}
          icon={Send}
        />
        <StatCard
          label="Your RIZ Balance"
          value={devBalance ?? '—'}
          icon={Wallet}
        />
      </div>

      <div className="glass rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center
          justify-between gap-4 mb-4">
          <div>
            <h2 className="font-bold">Matching wallets</h2>
            <p className="text-xs text-[#555] mt-1">
              {summary?.totalIndexed ?? 0} wallets indexed chain-wide ·{' '}
              {wallets.length} shown here{summary && summary.matched > wallets.length ? ` of ${summary.matched} matching` : ''}
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Button
              variant="secondary"
              size="sm"
              disabled={!selectedList.length || isDelivering}
              loading={isDelivering}
              onClick={() => deliverToWallets(selectedList)}
            >
              Deliver to Selected ({selectedList.length})
            </Button>
            <Button
              size="sm"
              disabled={!allAddresses.length || isDelivering}
              loading={isDelivering}
              onClick={() => deliverToWallets(allAddresses)}
            >
              Deliver to All Matching ({allAddresses.length})
            </Button>
          </div>
        </div>

        {progress && (
          <div className="bg-dev-surface2 rounded-xl p-4 mb-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#ccc]">
                {progress.done < progress.total
                  ? `Delivering... ${progress.done}/${progress.total}`
                  : `Done! ${progress.succeeded}/${progress.total} delivered`}
              </span>
              {progress.failed.length > 0 && (
                <span className="text-red-400 text-xs">
                  {progress.failed.length} failed
                </span>
              )}
            </div>
            <div className="bg-dev-surface rounded-full h-2 overflow-hidden">
              <div
                className="bg-yellow-400 h-full rounded-full transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {matchLoading ? (
          <div className="text-center text-[#888] text-sm py-8">
            Finding matching wallets...
          </div>
        ) : wallets.length === 0 ? (
          <div className="text-center text-[#888] text-sm py-8">
            No matching wallets found. Wallets only appear here once they've
            called <code className="text-[#aaa]">update_wallet_index</code> on-chain —
            this pool grows as more wallets opt in.
          </div>
        ) : (
          <div className="border border-dev-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-[auto,1fr,auto,auto] gap-4
              px-4 py-2 border-b border-dev-border text-xs text-[#888]
              font-semibold uppercase tracking-wider">
              <input
                type="checkbox"
                checked={selected.size === wallets.length}
                onChange={e => setSelected(
                  e.target.checked ? new Set(allAddresses) : new Set()
                )}
              />
              <span>Address</span>
              <span>Age (days)</span>
              <span>Activity</span>
            </div>
            {wallets.map(w => (
              <label
                key={w.address}
                className="grid grid-cols-[auto,1fr,auto,auto] gap-4
                  px-4 py-2.5 border-b border-dev-border last:border-0
                  items-center text-sm hover:bg-dev-surface cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(w.address)}
                  onChange={() => toggleSelected(w.address)}
                />
                <span className="font-mono text-xs text-[#ccc] truncate">
                  {w.address}
                </span>
                <span className="text-[#888] text-xs">{w.walletAgeDays}</span>
                <span className="text-[#888] text-xs">{w.activityCount}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {progress && progress.failed.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h2 className="font-bold text-sm mb-3 text-red-400">
            Failed deliveries
          </h2>
          <div className="space-y-1 text-xs">
            {progress.failed.map(f => (
              <p key={f.address} className="font-mono text-[#888]">
                {f.address.slice(0, 20)}... — {f.error}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
