import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: ReactNode
  sub?: string
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-awz-surface border border-awz-border rounded-lg p-4 sm:p-5 flex flex-col gap-1.5 shadow-lg">
      <span className="text-awz-muted text-[11px] sm:text-xs uppercase tracking-widest font-mono leading-none">
        {label}
      </span>
      <div className="text-xl sm:text-2xl font-mono text-awz-text font-semibold leading-tight break-all">
        {value}
      </div>
      {sub && (
        <div className="text-awz-muted text-[11px] font-mono">{sub}</div>
      )}
    </div>
  )
}
