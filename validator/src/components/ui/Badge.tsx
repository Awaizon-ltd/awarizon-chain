interface BadgeProps {
  label: string
  variant?: 'default' | 'success' | 'warning' | 'error' | 'yellow'
}

export default function Badge({ label, variant = 'default' }: BadgeProps) {
  const variants = {
    default: 'bg-gray-800 text-gray-400',
    success: 'bg-green-500/10 text-green-400',
    warning: 'bg-yellow-500/10 text-yellow-400',
    error: 'bg-red-500/10 text-red-400',
    yellow: 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20',
  }
  return (
    <span className={`
      text-xs font-semibold px-2 py-0.5
      rounded-full ${variants[variant]}
    `}>
      {label}
    </span>
  )
}
