import { Asset } from 'awarizon.js'
import { useAssetRegistry } from '../../store/assetRegistryStore'

interface BadgeProps {
  asset: Asset
  size?: 'sm' | 'md' | 'lg'
}

function getAssetColor(asset: Asset): string {
  if (asset.type === 'native') return '#8B5CF6'
  const colors = [
    '#10B981', '#F59E0B', '#EF4444',
    '#3B82F6', '#EC4899', '#14B8A6',
  ]
  return colors[asset.id % colors.length]
}

const SIZES = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
}

export default function Badge({
  asset,
  size = 'md',
}: BadgeProps) {
  const info = useAssetRegistry(s => s.get(asset))

  if (info.logoURI) {
    return (
      <img
        src={info.logoURI}
        alt={info.symbol}
        className={`${SIZES[size]} rounded-full object-cover flex-shrink-0`}
      />
    )
  }

  const color = getAssetColor(asset)
  const label = info.symbol.slice(0, 3)

  return (
    <div
      className={`
        ${SIZES[size]}
        rounded-full flex items-center
        justify-center font-bold text-white
        flex-shrink-0
      `}
      style={{ backgroundColor: color }}
    >
      {label}
    </div>
  )
}
