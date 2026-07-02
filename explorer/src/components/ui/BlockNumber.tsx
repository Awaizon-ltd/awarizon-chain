interface BlockNumberProps {
  value: number
  className?: string
}

export function BlockNumber({ value, className = '' }: BlockNumberProps) {
  return (
    <span className={`font-mono text-awz-text tabular-nums ${className}`}>
      #{value.toLocaleString()}
    </span>
  )
}
