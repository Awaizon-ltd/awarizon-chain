import { Link, useLocation } from 'react-router-dom'

const NAV = [
  { path: '/swap', label: 'Swap', icon: 'swap' },
  { path: '/pools', label: 'Pools', icon: 'pools' },
  { path: '/tokens', label: 'Tokens', icon: 'tokens' },
] as const

function NavIcon({ name }: { name: (typeof NAV)[number]['icon'] }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (name === 'swap') {
    return (
      <svg {...common}>
        <path d="m17 3 4 4-4 4" />
        <path d="M3 7h18" />
        <path d="m7 21-4-4 4-4" />
        <path d="M21 17H3" />
      </svg>
    )
  }
  if (name === 'pools') {
    return (
      <svg {...common}>
        <circle cx="9" cy="9" r="6" />
        <circle cx="15" cy="15" r="6" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

// Takes over from Header's centered nav on mobile — see the
// `hidden md:flex` on Header.tsx's <nav>.
export default function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50
        border-t border-dex-border bg-dex-bg/95 backdrop-blur-xl
        flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV.map(item => {
        const active = pathname === item.path || pathname.startsWith(`${item.path}/`)
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-semibold transition-all
              ${active ? 'text-purple-400' : 'text-[#9999BB]'}`}
          >
            <NavIcon name={item.icon} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
