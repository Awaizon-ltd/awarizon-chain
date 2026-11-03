import BlockiesImport from 'react-blockies'

// This project's Vite build (rolldown-vite) double-wraps react-blockies'
// CJS `{ __esModule: true, default: Identicon }` export instead of
// unwrapping it, so the "default import" above is the wrapper object,
// not the component — unwrap it defensively here rather than depend on
// bundler interop behavior.
const Blockies = (BlockiesImport as any).default ?? BlockiesImport

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
