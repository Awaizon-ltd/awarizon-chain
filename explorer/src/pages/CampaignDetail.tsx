import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Copy, CheckCheck, Megaphone, CircleX } from 'lucide-react'
import { useCampaign, useCampaignDeliveryStatus } from '../api/queries'
import { Panel, PanelHeader, DataRow, StatMini } from '../components/ui/Panel'
import { formatRizAmount } from '../lib/formatRiz'
import type { Campaign, CampaignDeliveryStatus, CampaignStatus } from '@awarizon/sdk'

/* ── copy button ─────────────────────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="flex-shrink-0 text-awz-muted/40 hover:text-awz-gold transition-colors" title="Copy">
      {copied ? <CheckCheck size={13} className="text-awz-gold" /> : <Copy size={13} />}
    </button>
  )
}

const STATUS_STYLE: Record<CampaignStatus, string> = {
  Pending:     'bg-awz-yellow/10 text-awz-yellow border-awz-yellow/20',
  Active:      'bg-green-500/10 text-green-400 border-green-500/20',
  Expired:     'bg-awz-border/60 text-awz-muted border-awz-border',
  Terminated:  'bg-awz-red/10 text-awz-red border-awz-red/20',
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider border ${STATUS_STYLE[status]}`}>
      {status}
    </span>
  )
}

/* ── page ────────────────────────────────────────────────────────── */
export function CampaignDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const { data: campaign, isLoading, error } = useCampaign(id)
  const { data: delivery } = useCampaignDeliveryStatus(id)

  if (!id) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Megaphone size={48} className="text-awz-muted/20" />
      <p className="text-awz-text font-mono text-sm">No campaign ID provided</p>
      <p className="text-awz-muted text-xs text-center max-w-sm">
        Use the search bar at the top to look up a campaign by its ID.
      </p>
    </div>
  )

  if (isLoading) return (
    <div className="flex flex-col gap-6">
      <Link to="/campaigns" className="inline-flex items-center gap-1.5 text-awz-muted text-xs font-mono hover:text-awz-gold transition-colors w-fit">
        <ArrowLeft size={14} /> Campaigns
      </Link>
      <div className="py-32 text-center">
        <Megaphone size={40} className="text-awz-gold/30 mx-auto mb-4 animate-pulse" />
        <p className="text-awz-muted text-sm font-mono animate-pulse">Loading campaign…</p>
      </div>
    </div>
  )

  if (error || !campaign) return (
    <div className="flex flex-col gap-6">
      <Link to="/campaigns" className="inline-flex items-center gap-1.5 text-awz-muted text-xs font-mono hover:text-awz-gold transition-colors w-fit">
        <ArrowLeft size={14} /> Campaigns
      </Link>
      <Panel className="p-16 text-center">
        <CircleX size={44} className="text-awz-muted/20 mx-auto mb-4" />
        <p className="text-awz-muted font-mono text-sm">Campaign {id} not found</p>
      </Panel>
    </div>
  )

  const c = campaign as Campaign
  const d = delivery as CampaignDeliveryStatus | undefined

  return (
    <div className="flex flex-col gap-5">

      {/* breadcrumb */}
      <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono text-awz-muted">
        <Link to="/campaigns" className="hover:text-awz-gold transition-colors flex items-center gap-1">
          <ArrowLeft size={12} /> Campaigns
        </Link>
        <span className="text-awz-border">›</span>
        <span className="text-awz-text">Campaign Detail</span>
      </div>

      {/* hero */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl border-2 bg-awz-gold/10 border-awz-gold/30 flex items-center justify-center flex-shrink-0">
          <Megaphone size={22} className="text-awz-gold" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-mono font-bold text-xl text-awz-text truncate">Campaign</h1>
            <StatusBadge status={c.status} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-xs text-awz-muted break-all">{c.campaign_id}</span>
            <CopyBtn text={c.campaign_id} />
          </div>
        </div>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatMini label="Max Deliveries" value={(c.max_deliveries ?? 0n).toLocaleString()} />
        <StatMini label="Current Deliveries" value={(c.current_deliveries ?? 0n).toLocaleString()} />
        <StatMini label="Remaining" value={d ? (d.remaining ?? 0n).toLocaleString() : '—'} />
        <StatMini label="Used" value={d ? `${d.percentage_used ?? 0}%` : '—'} />
        <StatMini label="Storage Fee" value={`${formatRizAmount(c.storage_fee_paid ?? 0n)} RIZ`} />
      </div>

      {/* details card */}
      <Panel>
        <PanelHeader icon={<Megaphone size={15} />} title="Campaign Details" />
        <DataRow label="Campaign ID" hint="Unique identifier for this campaign">
          <div className="flex items-start gap-2.5">
            <span className="text-awz-gold break-all">{c.campaign_id}</span>
            <CopyBtn text={c.campaign_id} />
          </div>
        </DataRow>
        <div className="border-t border-awz-border/50" />
        <DataRow label="Developer" hint="The wallet address that created this campaign">
          <div className="flex items-start gap-2.5">
            <Link to={`/account?address=${c.developer}`} className="text-awz-gold hover:underline break-all">
              {c.developer}
            </Link>
            <CopyBtn text={c.developer} />
          </div>
        </DataRow>
        <div className="border-t border-awz-border/50" />
        <DataRow label="Manifest Hash" hint="Hash of the ad manifest this campaign delivers">
          <div className="flex items-start gap-2.5">
            <span className="text-awz-muted break-all">{c.manifest_hash}</span>
            <CopyBtn text={c.manifest_hash} />
          </div>
        </DataRow>
        <div className="border-t border-awz-border/50" />
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <DataRow label="Created At">
            <Link to={`/block/${c.created_at}`} className="text-awz-gold hover:underline">
              #{(c.created_at ?? 0).toLocaleString()}
            </Link>
          </DataRow>
          <DataRow label="Expires At">
            <Link to={`/block/${c.expires_at}`} className="text-awz-gold hover:underline">
              #{(c.expires_at ?? 0).toLocaleString()}
            </Link>
          </DataRow>
        </div>
      </Panel>

    </div>
  )
}
