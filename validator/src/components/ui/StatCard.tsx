import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  unit?: string
  accent?: boolean
  icon?: LucideIcon
}

export default function StatCard({
  label, value, sub, unit, accent, icon: Icon,
}: StatCardProps) {
  return (
    <div className={`
      bg-[#111118] rounded-xl p-5 border
      ${accent ? 'border-yellow-400/30' : 'border-gray-800'}
    `}>
      <div className="flex items-start justify-between mb-1">
        <p className="text-sm text-gray-400">{label}</p>
        {Icon && (
          <Icon className={`w-4 h-4 ${accent ? 'text-yellow-400' : 'text-gray-500'}`} />
        )}
      </div>
      <p className={`text-2xl font-black ${accent ? 'text-yellow-400' : 'text-white'}`}>
        {value}
        {unit && (
          <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
        )}
      </p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}
