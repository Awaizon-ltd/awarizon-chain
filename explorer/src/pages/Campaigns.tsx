import { useActiveCampaignCount } from '../api/queries'
import { StatCard } from '../components/ui/StatCard'

export function Campaigns() {
  const { data: count } = useActiveCampaignCount()

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
        />
      </div>

      <p className="text-awz-muted text-xs font-mono">
        Use the search bar above to look up a campaign by its ID.
      </p>
    </div>
  )
}
