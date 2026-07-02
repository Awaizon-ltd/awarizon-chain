import { formatRiz } from '@awarizon/sdk'

interface RizAmountProps {
  planck: bigint
  decimals?: number
  className?: string
}

export function RizAmount({ planck, decimals = 4, className = '' }: RizAmountProps) {
  return (
    <span className={`font-mono ${className}`}>
      {formatRiz(planck, decimals)}
      <span className="text-awz-muted ml-1 text-xs">RIZ</span>
    </span>
  )
}
