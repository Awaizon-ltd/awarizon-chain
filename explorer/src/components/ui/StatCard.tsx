import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: ReactNode
  sub?: string
  live?: boolean
}

export function StatCard({ label, value, sub, live }: StatCardProps) {
  return (
    <div className="bg-awz-surface border border-awz-border rounded-lg p-4 sm:p-5 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-awz-muted text-[11px] sm:text-xs uppercase tracking-widest font-mono leading-none">
          {label}
        </span>
        {live && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-awz-gold animate-pulse" />
            <span className="text-awz-gold text-[10px] font-mono">LIVE</span>
          </span>
        )}
      </div>
      <div className="text-xl sm:text-2xl font-mono text-awz-text font-semibold leading-tight break-all">
        {value}
      </div>
      {sub && (
        <div className="text-awz-muted text-[11px] font-mono">{sub}</div>
      )}
    </div>
  )
}
