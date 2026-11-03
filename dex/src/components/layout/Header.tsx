import { Link, useLocation } from 'react-router-dom'
import WalletButton from '../wallet/WalletButton'

const NAV = [
  { path: '/swap', label: 'Swap' },
  { path: '/pools', label: 'Pools' },
  { path: '/tokens', label: 'Tokens' },
]

export default function Header() {
  const { pathname } = useLocation()

  return (
    <header className="fixed top-0 left-0 right-0 z-50
      border-b border-dex-border
      bg-dex-bg/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4
        flex items-center justify-between h-16">

        {/* Logo */}
        <Link to="/swap"
          className="flex items-center gap-2">
          <img
            src="/awarizon-logo.png"
            alt="Rizswap"
            className="w-8 h-8 object-contain"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <span className="font-black text-lg
            hidden sm:block">
            Riz<span className="text-purple-400">swap</span>
          </span>
        </Link>

        {/* Nav — bottom nav takes over on mobile, see BottomNav.tsx */}
        <nav className="hidden md:flex items-center gap-1
          bg-dex-surface rounded-xl p-1">
          {NAV.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`
                px-4 py-2 rounded-lg text-sm
                font-semibold transition-all
                ${pathname === item.path
                  ? 'bg-purple-500 text-white'
                  : 'text-[#9999BB] hover:text-white'
                }
              `}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Wallet */}
        <WalletButton />
      </div>
    </header>
  )
}
