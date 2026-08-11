import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
  icon?: LucideIcon
  tooltip?: string
}

export default function StatCard({
  label, value, sub, accent, icon: Icon, tooltip
}: StatCardProps) {
  return (
    <div className={`
      glass p-5 rounded-xl
      ${accent ? 'border-yellow-400/30 glow-yellow' : ''}
    `}>
      <div className="flex items-start
        justify-between mb-2">
        <p className="text-[#888] text-xs
          font-semibold uppercase tracking-wider
          flex items-center">
          {label}
          {tooltip && (
            <span
              title={tooltip}
              className="ml-1 text-[#555]
                hover:text-[#888] cursor-help
                text-xs normal-case tracking-normal"
            >
              ⓘ
            </span>
          )}
        </p>
        {Icon && (
          <Icon className={`w-5 h-5 ${
            accent ? 'text-yellow-400' : 'text-[#888]'
          }`} />
        )}
      </div>
      <p className={`text-2xl font-black ${
        accent ? 'text-yellow-400' : 'text-white'
      }`}>
        {value}
      </p>
      {sub && (
        <p className="text-[#555] text-xs mt-1">
          {sub}
        </p>
      )}
    </div>
  )
}
