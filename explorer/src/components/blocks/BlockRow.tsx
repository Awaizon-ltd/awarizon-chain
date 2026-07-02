import { Hash } from '../ui/Hash'

interface BlockRowProps {
  number: number
  hash: string
  timestamp: number
}

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  return `${Math.floor(secs / 3600)}h ago`
}

export function BlockRow({ number, hash, timestamp }: BlockRowProps) {
  return (
    <div className="border-b border-awz-border last:border-0 hover:bg-awz-surface/50 transition-colors px-4 py-3">
      {/* Desktop: single row */}
      <div className="hidden sm:grid grid-cols-[auto_1fr_auto] gap-4 items-center">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-awz-gold/60 flex-shrink-0" />
          <span className="font-mono text-awz-text text-sm tabular-nums font-medium">
            #{number.toLocaleString()}
          </span>
        </div>
        <Hash value={hash} />
        <span className="text-awz-muted text-xs tabular-nums text-right whitespace-nowrap">
          {timeAgo(timestamp)}
        </span>
      </div>

      {/* Mobile: stacked */}
      <div className="sm:hidden flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-awz-gold/60 flex-shrink-0" />
            <span className="font-mono text-awz-text text-sm font-medium tabular-nums">
              #{number.toLocaleString()}
            </span>
          </div>
          <span className="text-awz-muted text-xs tabular-nums">{timeAgo(timestamp)}</span>
        </div>
        <div className="pl-4">
          <Hash value={hash} />
        </div>
      </div>
    </div>
  )
}
