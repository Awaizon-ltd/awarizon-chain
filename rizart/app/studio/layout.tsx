'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useWallet } from '@/lib/walletStore'
import Button from '@/components/Button'
import Avatar from '@/components/Avatar'
import ConnectModal from '@/components/wallet/ConnectModal'
import { truncate } from '@/lib/constants'

const NAV = [
  { href: '/studio', label: 'Dashboard' },
  { href: '/studio/collections/new', label: 'New Collection' },
]

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { connected, address, name } = useWallet()
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

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🎨</div>
          <h1 className="text-2xl font-black mb-2">Creator Studio</h1>
          <p className="text-[#888] mb-8">
            Connect your wallet to launch NFTs and manage your collections on Awarizon.
          </p>
          <Button size="lg" onClick={() => setShowConnectModal(true)}>
            Connect Wallet
          </Button>
          <Link href="/" className="block mt-6 text-sm text-[#888] hover:text-white transition-colors">
            ← Back to Marketplace
          </Link>
        </div>
        <ConnectModal open={showConnectModal} onClose={() => setShowConnectModal(false)} />
      </div>
    )
  }

  const sidebarContent = (
    <>
      <div className="h-16 flex items-center justify-between gap-2 px-6 border-b border-rz-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center">
            <span className="text-black font-black text-sm">R</span>
          </div>
          <span className="font-black text-sm">
            Riz<span className="text-yellow-400">Art</span> Studio
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-[#888] hover:text-white"
        >
          ×
        </button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1">
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              block px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${
                pathname === item.href
                  ? 'bg-yellow-400 text-black'
                  : 'text-[#888] hover:text-white hover:bg-rz-s2'
              }
            `}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-rz-border space-y-3 flex-shrink-0">
        <div className="flex items-center gap-2 px-2">
          <Avatar address={address!} size={28} />
          <span className="text-xs font-mono truncate">{name || truncate(address!)}</span>
        </div>
        <Link href="/" className="block text-xs text-[#888] hover:text-white transition-colors px-2">
          ← Back to Marketplace
        </Link>
      </div>
    </>
  )

  return (
    <div className="min-h-screen md:flex">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 h-16 flex items-center justify-between px-4 bg-rz-bg/90 backdrop-blur-xl border-b border-rz-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center">
            <span className="text-black font-black text-sm">R</span>
          </div>
          <span className="font-black text-sm">Studio</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-rz-surface border border-rz-border"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 border-r border-rz-border bg-rz-surface flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile slide-in drawer */}
      <div
        onClick={() => setMobileOpen(false)}
        className={`
          fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm transition-opacity duration-300 md:hidden
          ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
      />
      <aside
        className={`
          fixed top-0 left-0 z-[70] h-dvh w-[min(18rem,85vw)] bg-rz-surface border-r border-rz-border
          flex flex-col overflow-hidden transition-transform duration-300 ease-out md:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
