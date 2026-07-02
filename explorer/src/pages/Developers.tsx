import { useState } from 'react'
import { useDeveloperProfile, useDeveloperCampaigns, useDeveloperManifests } from '../api/queries'
import { StatCard } from '../components/ui/StatCard'
import { Hash } from '../components/ui/Hash'
import { RizAmount } from '../components/ui/RizAmount'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge } from '../components/ui/Badge'
import type { DeveloperProfile } from '@awarizon/sdk'

function DeveloperInfo({ address }: { address: string }) {
  const { data: profile, isLoading: pLoading, error: pError } = useDeveloperProfile(address)
  const { data: campaigns } = useDeveloperCampaigns(address)
  const { data: manifests } = useDeveloperManifests(address)

  if (pLoading) {
    return <div className="py-8 text-center text-awz-muted text-xs font-mono">LOADING...</div>
  }

  if (pError || !profile) {
    return <EmptyState message="DEVELOPER NOT FOUND" code="developer_not_registered" />
  }

  const p = profile as DeveloperProfile
  const campaignList = (campaigns as unknown[]) ?? []
  const manifestList = (manifests as unknown[]) ?? []

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-awz-muted text-xs font-mono tracking-widest uppercase">
          DEVELOPER_PROFILE
        </span>
        <div className="flex-1 h-px bg-awz-border" />
        <Badge
          label={p.status}
          variant={p.status === 'Verified' ? 'green' : p.status === 'Suspended' ? 'red' : 'muted'}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="STAKED RIZ"
          value={<RizAmount planck={BigInt(p.staked_riz as unknown as string)} decimals={2} />}
        />
        <StatCard label="TOTAL CAMPAIGNS" value={p.total_campaigns.toLocaleString()} />
        <StatCard label="TOTAL DELIVERIES" value={p.total_deliveries.toLocaleString()} />
        <StatCard label="VIOLATIONS" value={p.violation_count.toLocaleString()} />
        <StatCard label="MANIFESTS" value={manifestList.length.toLocaleString()} />
      </div>

      {campaignList.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-awz-muted text-xs font-mono tracking-widest uppercase">
              CAMPAIGNS
            </span>
            <div className="flex-1 h-px bg-awz-border" />
          </div>
          <div className="border border-awz-border rounded-sm overflow-hidden">
            {campaignList.map((cid, i) => (
              <div
                key={i}
                className="px-4 py-3 border-b border-awz-border last:border-0 font-mono text-xs text-awz-text"
              >
                <Hash value={String(cid)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {manifestList.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-awz-muted text-xs font-mono tracking-widest uppercase">
              MANIFESTS
            </span>
            <div className="flex-1 h-px bg-awz-border" />
          </div>
          <div className="border border-awz-border rounded-sm overflow-hidden">
            {manifestList.map((mhash, i) => (
              <div
                key={i}
                className="px-4 py-3 border-b border-awz-border last:border-0 font-mono text-xs text-awz-text"
              >
                <Hash value={String(mhash)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function Developers() {
  const [address, setAddress] = useState('')
  const [submitted, setSubmitted] = useState('')

  function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    const a = address.trim()
    if (a) setSubmitted(a)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-awz-muted text-xs font-mono tracking-widest uppercase">
          DEVELOPER_REGISTRY
        </span>
        <div className="flex-1 h-px bg-awz-border" />
      </div>

      <form onSubmit={handleLookup} className="flex gap-3 max-w-lg">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="SS58_ADDRESS"
          className="flex-1 bg-awz-surface border border-awz-border rounded-sm px-3 py-2 text-xs font-mono text-awz-text placeholder:text-awz-muted focus:outline-none focus:border-awz-green transition-colors"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-awz-surface border border-awz-green text-awz-green text-xs font-mono rounded-sm hover:bg-awz-green/10 transition-colors"
        >
          LOOKUP
        </button>
      </form>

      {submitted && <DeveloperInfo address={submitted} />}
    </div>
  )
}
