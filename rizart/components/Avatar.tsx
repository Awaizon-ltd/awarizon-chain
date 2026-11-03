'use client'
import Blockies from 'react-blockies'

interface AvatarProps {
  address: string
  size?: number
  className?: string
}

export default function Avatar({ address, size = 28, className = '' }: AvatarProps) {
  return (
    <div
      className={`rounded-full overflow-hidden flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <Blockies
        seed={address}
        scale={Math.max(1, Math.round(size / 8))}
        className="w-full h-full"
      />
    </div>
  )
}
