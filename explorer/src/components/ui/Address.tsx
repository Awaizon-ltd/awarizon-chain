import { Link } from 'react-router-dom'

interface AddressProps {
  value: string
  className?: string
}

export function Address({ value, className = '' }: AddressProps) {
  const display = `${value.slice(0, 8)}…${value.slice(-6)}`
  return (
    <Link
      to={`/account?address=${encodeURIComponent(value)}`}
      className={`font-mono text-awz-text text-sm hover:text-awz-green transition-colors ${className}`}
      title={value}
    >
      {display}
    </Link>
  )
}
