'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useWallet } from '@/lib/walletStore'
import { truncate } from '@/lib/constants'
import Avatar from '@/components/Avatar'
import ConnectModal from '@/components/wallet/ConnectModal'

const NAV = [
  { href: '/explore', label: 'Explore', icon: 'grid' },
  { href: '/collections', label: 'Collections', icon: 'layers' },
  { href: '/rankings', label: 'Rankings', icon: 'chart' },
  { href: '/activity', label: 'Activity', icon: 'pulse' },
] as const

function NavIcon({ name }: { name: (typeof NAV)[number]['icon'] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (name === 'grid') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    )
  }
  if (name === 'layers') {
    return (
      <svg {...common}>
        <path d="M12 2 2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    )
  }
  if (name === 'chart') {
    return (
      <svg {...common}>
        <path d="M3 3v18h18" />
        <rect x="7" y="12" width="3" height="6" />
        <rect x="12" y="8" width="3" height="10" />
        <rect x="17" y="4" width="3" height="14" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}

export default function Header() {
  const pathname = usePathname()
  const { connected, address, name, walletName, disconnect } = useWallet()
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showConnectModal, setShowConnectModal] = useState(false)

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- close the drawer on route change */
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const copy = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <header className="sticky top-0 z-50 bg-rz-bg/90 backdrop-blur-xl border-b border-rz-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-3 sm:gap-4 md:gap-6">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center">
            <span className="text-black font-black text-sm">R</span>
          </div>
          <span className="font-black text-lg">
            Riz<span className="text-yellow-400">Art</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                px-4 py-2 rounded-xl text-sm font-semibold transition-all
                ${
                  pathname === item.href
                    ? 'text-yellow-400 bg-yellow-400/10'
                    : 'text-[#888] hover:text-white'
                }
              `}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1 md:hidden" />

        <Link
          href="/search"
          className="hidden md:flex items-center gap-2 bg-rz-surface border border-rz-border rounded-xl px-4 py-2 text-sm text-[#888] hover:text-white hover:border-[#2A2A2A] transition-all w-48"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          Search NFTs...
        </Link>

        <Link
          href="/search"
          aria-label="Search"
          className="md:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-rz-surface border border-rz-border text-[#888] hover:text-white transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </Link>

        <Link
          href="/studio"
          className="hidden md:block bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm px-4 py-2 rounded-xl transition-all shadow-yellow flex-shrink-0"
        >
          Studio
        </Link>

        <div className="relative flex-shrink-0">
          {connected && address ? (
            <>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 bg-rz-surface border border-rz-border hover:border-yellow-400/30 rounded-xl px-2 sm:px-3 py-2 transition-all"
              >
                <Avatar address={address} size={24} />
                <span className="text-sm font-mono hidden sm:block">{name || truncate(address)}</span>
                {walletName === 'awarizon' && (
                  <span className="text-[10px] font-mono text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded-md">
                    Awarizon
                  </span>
                )}
                <span className="text-[#888] text-xs">▾</span>
              </button>

              {showMenu && (
                <div className="absolute right-0 top-12 glass-panel rounded-xl p-2 w-52 z-50 shadow-card">
                  <Link
                    href={`/profile/${address}`}
                    onClick={() => setShowMenu(false)}
                    className="block px-3 py-2.5 text-sm hover:bg-rz-s2 rounded-lg transition-all"
                  >
                    My Profile
                  </Link>
                  <Link
                    href="/studio"
                    onClick={() => setShowMenu(false)}
                    className="block px-3 py-2.5 text-sm hover:bg-rz-s2 rounded-lg transition-all"
                  >
                    Creator Studio
                  </Link>
                  <hr className="border-rz-border my-1" />
                  <button
                    onClick={copy}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-rz-s2 rounded-lg transition-all text-[#888]"
                  >
                    {copied ? '✓ Copied!' : 'Copy Address'}
                  </button>
                  <button
                    onClick={() => {
                      disconnect()
                      setShowMenu(false)
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-rz-s2 rounded-lg transition-all"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => setShowConnectModal(true)}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm px-3 sm:px-4 py-2 rounded-xl transition-all shadow-yellow whitespace-nowrap"
            >
              <span className="sm:hidden">Connect</span>
              <span className="hidden sm:inline">Connect Wallet</span>
            </button>
          )}
        </div>

        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="md:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-rz-surface border border-rz-border"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile slide-in drawer */}
      <div
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
        className={`
          fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm transition-opacity duration-300 md:hidden
          ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
      />
      <aside
        className={`
          fixed top-0 right-0 z-[70] h-dvh w-[min(20rem,85vw)] bg-rz-surface border-l border-rz-border
          flex flex-col overflow-hidden transition-transform duration-300 ease-out md:hidden
          ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-rz-border flex-shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-yellow-400 flex items-center justify-center flex-shrink-0">
              <span className="text-black font-black text-xs">R</span>
            </div>
            <span className="font-black">
              Riz<span className="text-yellow-400">Art</span>
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg text-[#888] hover:text-white hover:bg-rz-s2 transition-all text-xl"
          >
            ×
          </button>
        </div>

        <div className="flex justify-center py-4 px-4 border-b border-rz-border flex-shrink-0">
          <Link
            href="/search"
            className="w-1/2 min-w-[9rem] flex items-center justify-center gap-1.5 bg-rz-s2 border border-rz-border rounded-full px-3 py-2 text-xs text-[#888] hover:text-white hover:border-yellow-400/40 transition-all"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span className="truncate">Search</span>
          </Link>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all
                ${
                  pathname === item.href
                    ? 'text-yellow-400 bg-yellow-400/10'
                    : 'text-[#888] hover:text-white hover:bg-rz-s2'
                }
              `}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </Link>
          ))}
          <Link
            href="/studio"
            className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-bold text-black bg-yellow-400 mt-3"
          >
            Creator Studio
          </Link>
        </nav>

        <div className="p-3 border-t border-rz-border flex-shrink-0">
          {connected && address ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-2 py-2 mb-1">
                <Avatar address={address} size={28} />
                <span className="text-xs font-mono truncate">{name || truncate(address)}</span>
                {walletName === 'awarizon' && (
                  <span className="text-[10px] font-mono text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded-md flex-shrink-0">
                    Awarizon
                  </span>
                )}
              </div>
              <Link
                href={`/profile/${address}`}
                className="block px-3 py-2.5 text-sm rounded-lg hover:bg-rz-s2 transition-all"
              >
                My Profile
              </Link>
              <button
                onClick={copy}
                className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-rz-s2 transition-all text-[#888]"
              >
                {copied ? '✓ Copied!' : 'Copy Address'}
              </button>
              <button
                onClick={disconnect}
                className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-rz-s2 transition-all text-red-400"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConnectModal(true)}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm px-4 py-3 rounded-xl transition-all shadow-yellow"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </aside>

      <ConnectModal open={showConnectModal} onClose={() => setShowConnectModal(false)} />
    </header>
  )
}
