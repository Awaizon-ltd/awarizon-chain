import { Megaphone, Search } from 'lucide-react'
import { useActiveCampaignCount } from '../api/queries'
import { StatCard } from '../components/ui/StatCard'
import { Panel, SectionLabel } from '../components/ui/Panel'

export function Campaigns() {
  const { data: count } = useActiveCampaignCount()

  return (
    <div className="flex flex-col gap-5">
      <SectionLabel>Campaign Registry</SectionLabel>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="Active Campaigns"
          value={count !== undefined ? count.toLocaleString() : '—'}
        />
      </div>

      <Panel className="px-6 py-10 flex flex-col items-center text-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-awz-gold/10 border border-awz-gold/20 flex items-center justify-center">
          <Megaphone size={20} className="text-awz-gold" />
        </div>
        <p className="text-awz-text text-sm font-sans">
          Campaigns aren't listed in a browsable index on-chain yet.
        </p>
        <p className="text-awz-muted text-xs font-sans max-w-sm flex items-center justify-center gap-1.5">
          <Search size={12} className="flex-shrink-0" /> Use the search bar above to look up a specific campaign by its ID.
        </p>
      </Panel>
    </div>
  )
}
