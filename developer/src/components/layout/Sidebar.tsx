'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Megaphone, BarChart3, Coins,
  AppWindow, Search, ArrowLeftRight, ExternalLink,
} from 'lucide-react'
import { EXPLORER_URL } from '../../constants'

const NAV = [
  {
    path: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    path: '/apps',
    icon: AppWindow,
    label: 'My Apps',
  },
  {
    path: '/campaigns',
    icon: Megaphone,
    label: 'Campaigns',
  },
  {
    path: '/analytics',
    icon: BarChart3,
    label: 'Analytics',
  },
  {
    path: '/tokens',
    icon: Coins,
    label: 'Token Creator',
  },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname()

  return (
    <>
      {/* Backdrop — mobile only, tap outside the drawer to close */}
      {open && (
        <div
          className="fixed inset-0 top-16 z-40 bg-black/60 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed left-0 top-16 bottom-0 z-40
        w-56 border-r border-dev-border
        bg-dev-bg flex flex-col
        transition-transform duration-200 ease-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(item => {
            const isActive = pathname === item.path ||
              (pathname?.startsWith(item.path + '/') ?? false)

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`
                  flex items-center gap-3 px-3 py-2.5
                  rounded-xl text-sm font-semibold
                  transition-all
                  ${isActive
                    ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                    : 'text-[#888] hover:text-white hover:bg-dev-surface'
                  }
                `}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom links */}
        <div className="p-3 border-t border-dev-border
          space-y-1">
          <a
            href={EXPLORER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3
              py-2.5 rounded-xl text-sm text-[#888]
              hover:text-white hover:bg-dev-surface
              transition-all"
          >
            <Search className="w-4 h-4" /> Explorer
            <ExternalLink className="w-3 h-3 ml-auto" />
          </a>
          <a
            href="https://dex.awarizon.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3
              py-2.5 rounded-xl text-sm text-[#888]
              hover:text-white hover:bg-dev-surface
              transition-all"
          >
            <ArrowLeftRight className="w-4 h-4" /> DEX
            <ExternalLink className="w-3 h-3 ml-auto" />
          </a>
        </div>
      </aside>
    </>
  )
}
