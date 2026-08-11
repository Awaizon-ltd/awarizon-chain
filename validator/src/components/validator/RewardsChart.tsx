'use client'

import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import type { EpochRewardRecord } from 'awarizon.js'

// Network-wide reward-pool history — the chain records epoch reward
// totals (fees + yield emission split to staking/inbox/burn), not a
// per-validator earnings series, so this is deliberately labeled as
// the network staking pool rather than "your rewards". A validator's
// own current claimable amount is validators.getValidatorPendingReward()
// (shown separately on the earnings page as a stat, not a chart).
export default function RewardsChart({ history }: { history: EpochRewardRecord[] }) {
  const data = history
    .slice()
    .sort((a, b) => a.epoch - b.epoch)
    .map(r => ({ epoch: r.epoch, toStaking: r.toStaking }))

  if (!data.length) {
    return (
      <div className="h-56 flex items-center justify-center text-gray-500 text-sm">
        No epoch reward history yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rewardsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFD700" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#FFD700" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1F1F1F" vertical={false} />
        <XAxis
          dataKey="epoch"
          tick={{ fill: '#666', fontSize: 12 }}
          axisLine={{ stroke: '#1F1F1F' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#666', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          contentStyle={{
            background: '#111118', border: '1px solid #1F1F1F',
            borderRadius: 8, fontSize: 12,
          }}
          labelFormatter={(epoch) => `Epoch ${epoch}`}
          formatter={(value: number) => [value.toLocaleString(), 'To staking pool']}
        />
        <Area
          type="monotone"
          dataKey="toStaking"
          stroke="#FFD700"
          strokeWidth={2}
          fill="url(#rewardsFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
