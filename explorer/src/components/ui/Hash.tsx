interface HashProps {
  value: string
  truncate?: boolean
  className?: string
}

export function Hash({ value, truncate = true, className = '' }: HashProps) {
  const display = truncate ? `${value.slice(0, 8)}…${value.slice(-6)}` : value

  return (
    <span
      className={`font-mono text-awz-green text-sm cursor-pointer hover:text-awz-green-dim transition-colors ${className}`}
      onClick={() => navigator.clipboard.writeText(value)}
      title="Click to copy"
    >
      {display}
    </span>
  )
}
