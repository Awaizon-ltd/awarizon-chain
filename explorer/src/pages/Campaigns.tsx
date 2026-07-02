import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveCampaignCount } from '../api/queries'
import { StatCard } from '../components/ui/StatCard'

export function Campaigns() {
  const { data: count } = useActiveCampaignCount()
  const [campaignId, setCampaignId] = useState('')
  const navigate = useNavigate()

  function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    const id = campaignId.trim()
    if (id) navigate(`/campaigns/${id}`)
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-awz-muted text-xs font-mono tracking-widest uppercase">
          CAMPAIGN_REGISTRY
        </span>
        <div className="flex-1 h-px bg-awz-border" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="ACTIVE CAMPAIGNS"
          value={count !== undefined ? count.toLocaleString() : '—'}
          live
        />
      </div>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-awz-muted text-xs font-mono tracking-widest uppercase">
            LOOKUP BY ID
          </span>
          <div className="flex-1 h-px bg-awz-border" />
        </div>

        <form onSubmit={handleLookup} className="flex gap-3 max-w-lg">
          <input
            type="text"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            placeholder="CAMPAIGN_ID"
            className="flex-1 bg-awz-surface border border-awz-border rounded-sm px-3 py-2 text-xs font-mono text-awz-text placeholder:text-awz-muted focus:outline-none focus:border-awz-green transition-colors"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-awz-surface border border-awz-green text-awz-green text-xs font-mono rounded-sm hover:bg-awz-green/10 transition-colors"
          >
            LOOKUP
          </button>
        </form>
      </div>
    </div>
  )
}
