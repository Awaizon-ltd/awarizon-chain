import { useParams, Link } from 'react-router-dom'
import { useCampaign, useCampaignDeliveryStatus } from '../api/queries'
import { StatCard } from '../components/ui/StatCard'
import { Badge } from '../components/ui/Badge'
import { Hash } from '../components/ui/Hash'
import { RizAmount } from '../components/ui/RizAmount'
import { EmptyState } from '../components/ui/EmptyState'
import type { Campaign, CampaignDeliveryStatus } from '@awarizon/sdk'

export function CampaignDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const { data: campaign, isLoading, error } = useCampaign(id)
  const { data: delivery } = useCampaignDeliveryStatus(id)

  if (!id) return <EmptyState message="NO CAMPAIGN ID PROVIDED" />

  if (isLoading) {
    return (
      <div className="py-16 text-center text-awz-muted text-xs font-mono">
        LOADING CAMPAIGN {id}...
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="space-y-6">
        <Link to="/campaigns" className="text-awz-muted text-xs font-mono hover:text-awz-green">
          ← CAMPAIGNS
        </Link>
        <EmptyState message={`CAMPAIGN ${id} NOT FOUND`} code="campaign_not_found" />
      </div>
    )
  }

  const c = campaign as Campaign
  const d = delivery as CampaignDeliveryStatus | undefined
  const isActive = c.status === 'Active'

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/campaigns" className="text-awz-muted text-xs font-mono hover:text-awz-green">
          ← CAMPAIGNS
        </Link>
        <span className="text-awz-border">|</span>
        <span className="text-awz-muted text-xs font-mono">CAMPAIGN</span>
        <span className="text-awz-text text-xs font-mono">{id}</span>
        <Badge label={c.status} variant={isActive ? 'green' : 'muted'} />
      </div>

      <div className="flex items-center gap-3 mb-2">
        <span className="text-awz-muted text-xs font-mono tracking-widest uppercase">
          CAMPAIGN_DETAIL
        </span>
        <div className="flex-1 h-px bg-awz-border" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="MAX DELIVERIES"
          value={c.max_deliveries.toLocaleString()}
        />
        <StatCard
          label="CURRENT DELIVERIES"
          value={c.current_deliveries.toLocaleString()}
        />
        <StatCard
          label="STORAGE FEE"
          value={<RizAmount planck={BigInt(c.storage_fee_paid as unknown as string)} decimals={4} />}
        />
        {d && (
          <StatCard
            label="REMAINING"
            value={d.remaining.toLocaleString()}
          />
        )}
        {d && (
          <StatCard
            label="USED"
            value={`${d.percentage_used}%`}
          />
        )}
      </div>

      <div className="border border-awz-border rounded-sm overflow-hidden">
        <table className="w-full text-xs">
          <tbody>
            <tr className="border-b border-awz-border">
              <td className="px-4 py-3 text-awz-muted font-mono w-40">DEVELOPER</td>
              <td className="px-4 py-3 font-mono text-awz-text">
                <Hash value={c.developer} />
              </td>
            </tr>
            <tr className="border-b border-awz-border">
              <td className="px-4 py-3 text-awz-muted font-mono">MANIFEST</td>
              <td className="px-4 py-3 font-mono text-awz-text">
                <Hash value={c.manifest_hash} />
              </td>
            </tr>
            <tr className="border-b border-awz-border">
              <td className="px-4 py-3 text-awz-muted font-mono">CREATED AT</td>
              <td className="px-4 py-3 font-mono text-awz-text">#{c.created_at.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-awz-muted font-mono">EXPIRES AT</td>
              <td className="px-4 py-3 font-mono text-awz-text">#{c.expires_at.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
