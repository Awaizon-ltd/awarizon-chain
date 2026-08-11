interface PerformanceBarProps {
  label: string
  bps: number // 0-10000
  color?: string
}

// Renders one uptime/finality/blocks-produced metric as a percentage
// bar. bps (basis points, 0-10000) is the unit every performance field
// on ValidatorInfo/ValidatorPerformance uses.
export default function PerformanceBar({
  label, bps, color = 'bg-yellow-400',
}: PerformanceBarProps) {
  const pct = (bps / 100).toFixed(1)
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full`}
          style={{ width: `${Math.min(100, Number(pct))}%` }}
        />
      </div>
    </div>
  )
}
