import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'

/* Shared card shell used across every detail/list page — consolidates what
   used to be a near-identical Card/CardHeader/DataRow/Divider/StatMini
   defined locally in Overview.tsx, TransactionDetail.tsx, Account.tsx,
   CampaignDetail.tsx and BlockDetail.tsx. */

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-awz-surface border border-awz-border rounded-xl overflow-hidden shadow-lg ${className}`}>
      {children}
    </div>
  )
}

export function PanelHeader({ icon, title, badge }: { icon: ReactNode; title: ReactNode; badge?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-awz-border bg-awz-surface/60">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-awz-gold flex-shrink-0">{icon}</span>
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-awz-muted font-semibold truncate">{title}</span>
      </div>
      {badge}
    </div>
  )
}

export function Divider() {
  return <div className="border-t border-awz-border/50" />
}

export function DataRow({ label, hint, children, mono = true }: {
  label: string; hint?: string; children: ReactNode; mono?: boolean
}) {
  return (
    <div className="px-5 py-3.5 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-awz-muted/70">{label}</span>
        {hint && (
          <span className="group relative">
            <Info size={11} className="text-awz-muted/30 cursor-help" />
            <span className="absolute bottom-5 left-0 w-52 bg-awz-bg border border-awz-border rounded-lg px-3 py-2 text-xs text-awz-text font-sans leading-snug opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
              {hint}
            </span>
          </span>
        )}
      </div>
      <div className={`text-awz-text text-sm leading-relaxed break-all ${mono ? 'font-mono' : 'font-sans'}`}>
        {children}
      </div>
    </div>
  )
}

/* 2-col grid of DataRows inside a Panel, divided by a hairline */
export function DataGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const colsCls = cols === 4 ? 'sm:grid-cols-4' : cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
  return (
    <div className={`grid grid-cols-1 ${colsCls} divide-y divide-awz-border sm:divide-y-0 sm:divide-x sm:divide-awz-border`}>
      {children}
    </div>
  )
}

/* Section label with a trailing hairline — the "LABEL ─────── badge" header
   repeated at the top of every list page (Blocks, Validators, Tokens, NFTs,
   Campaigns, and Overview's Recent Activity / Network groups). */
export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono uppercase tracking-[0.18em] text-awz-muted whitespace-nowrap">{children}</span>
      <div className="flex-1 h-px bg-awz-border" />
      {action}
    </div>
  )
}

export function StatMini({ label, value, sub, link, icon }: {
  label: string; value: ReactNode; sub?: string; link?: string; icon?: ReactNode
}) {
  const valueCls = 'font-mono font-bold text-lg leading-tight'
  return (
    <div className="bg-awz-surface border border-awz-border rounded-xl p-4 flex flex-col gap-1.5 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-awz-muted/70">{label}</span>
        {icon && <span className="text-awz-gold/50 flex-shrink-0">{icon}</span>}
      </div>
      {link
        ? <Link to={link} className={`${valueCls} text-awz-gold hover:underline`}>{value}</Link>
        : <span className={`${valueCls} text-awz-text`}>{value}</span>
      }
      {sub && <span className="text-[10px] text-awz-muted/50 font-mono">{sub}</span>}
    </div>
  )
}
