import Link from 'next/link'
import type { ValidatorInfo } from 'awarizon.js'
import StatusBadge from './StatusBadge'

function truncate(addr: string): string {
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
}

interface ValidatorCardProps {
  validator: ValidatorInfo
  rank?: number
}

export default function ValidatorCard({ validator: v, rank }: ValidatorCardProps) {
  const totalStake = parseFloat(v.selfStake.replace(/,/g, ''))
    + parseFloat(v.delegatedStake.replace(/,/g, ''))
  const uptimePct = (v.uptimeBps / 100).toFixed(1)

  return (
    <Link
      href={`/leaderboard#${v.address}`}
      className="flex items-center justify-between gap-4
        bg-[#111118] border border-gray-800 rounded-xl px-5 py-4
        hover:border-yellow-400/30 transition-colors"
    >
      <div className="flex items-center gap-4 min-w-0">
        {rank !== undefined && (
          <span className={`font-bold flex-shrink-0 ${
            rank === 0 ? 'text-yellow-400'
            : rank === 1 ? 'text-gray-300'
            : rank === 2 ? 'text-amber-600'
            : 'text-gray-500'
          }`}>
            #{rank + 1}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-mono text-sm text-gray-300 truncate">
            {truncate(v.address)}
          </p>
          <p className="text-xs text-gray-500">
            {totalStake.toLocaleString()} RIZ staked · {v.commission}% commission
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`font-mono text-sm ${
          v.uptimeBps > 9500 ? 'text-green-400'
          : v.uptimeBps > 8000 ? 'text-yellow-400'
          : 'text-red-400'
        }`}>
          {uptimePct}%
        </span>
        <StatusBadge isActive={v.isActive} />
      </div>
    </Link>
  )
}
