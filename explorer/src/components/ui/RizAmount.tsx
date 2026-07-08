import { formatRizAmount } from '../../lib/formatRiz'

interface RizAmountProps {
  planck: bigint
  decimals?: number
  className?: string
}

export function RizAmount({ planck, decimals = 2, className = '' }: RizAmountProps) {
  return (
    <span className={`font-mono ${className}`}>
      {formatRizAmount(planck, decimals)}
      <span className="text-awz-muted ml-1 text-xs">RIZ</span>
    </span>
  )
}
