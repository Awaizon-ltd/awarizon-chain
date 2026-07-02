type BadgeVariant = 'green' | 'yellow' | 'red' | 'muted'

interface BadgeProps {
  label: string
  variant?: BadgeVariant
}

const variants: Record<BadgeVariant, string> = {
  green: 'bg-awz-green/10 text-awz-green border-awz-green/20',
  yellow: 'bg-awz-yellow/10 text-awz-yellow border-awz-yellow/20',
  red: 'bg-awz-red/10 text-awz-red border-awz-red/20',
  muted: 'bg-awz-border text-awz-muted border-awz-border',
}

export function Badge({ label, variant = 'muted' }: BadgeProps) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-sm border font-mono uppercase tracking-wider ${variants[variant]}`}
    >
      {label}
    </span>
  )
}
