interface AddressProps {
  value: string
  className?: string
}

export function Address({ value, className = '' }: AddressProps) {
  const display = `${value.slice(0, 8)}…${value.slice(-6)}`
  return (
    <span
      className={`font-mono text-awz-text text-sm cursor-pointer hover:text-awz-green transition-colors ${className}`}
      onClick={() => navigator.clipboard.writeText(value)}
      title={value}
    >
      {display}
    </span>
  )
}
