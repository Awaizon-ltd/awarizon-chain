'use client'

import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import WalletButton from '../wallet/WalletButton'

interface Props {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export default function Header({ sidebarOpen, onToggleSidebar }: Props) {
  return (
    <header className="fixed top-0 left-0 right-0
      h-16 z-50 border-b border-dev-border
      bg-dev-bg/80 backdrop-blur-xl
      flex items-center px-3 sm:px-6 gap-2 sm:gap-4">

      <button
        onClick={onToggleSidebar}
        aria-label="Toggle menu"
        className="md:hidden flex items-center justify-center
          w-9 h-9 rounded-lg text-[#888] hover:text-white
          hover:bg-dev-surface flex-shrink-0 transition-colors"
      >
        {sidebarOpen
          ? <X className="w-5 h-5" />
          : <Menu className="w-5 h-5" />}
      </button>

      <Link href="/dashboard"
        className="flex items-center gap-2
          flex-shrink-0 min-w-0">
        <div className="w-8 h-8 rounded-lg
          bg-black/60 ring-1 ring-yellow-400/40
          flex items-center justify-center p-1 flex-shrink-0">
          <img
            src="/logo.png"
            alt="Awarizon"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="truncate">
          <span className="font-black text-sm">
            Awarizon
          </span>
          <span className="text-yellow-400
            font-black text-sm"> Studio</span>
        </div>
        <span className="hidden sm:inline text-xs text-[#444]
          border border-[#333] rounded px-1.5
          py-0.5 ml-1 flex-shrink-0">
          Developer
        </span>
      </Link>

      <div className="flex-1" />
      <WalletButton />
    </header>
  )
}
