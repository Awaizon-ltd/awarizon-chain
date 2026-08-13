'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { EXPLORER_URL } from '../../lib/constants'

const NAV_LINKS = [
  { href: '/get-started', label: 'Get Started' },
  { href: '/leaderboard', label: 'Validators' },
  { href: '/managed', label: 'Managed' },
  { href: '/self-hosted', label: 'Self-Hosted' },
  { href: '/dashboard', label: 'Dashboard' },
]

export function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0
      z-50 bg-[#0a0a0f]/80 backdrop-blur-xl
      border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-6
        h-16 flex items-center justify-between">
        <Link href="/"
          className="flex items-center gap-2"
          onClick={() => setOpen(false)}>
          <img src="/logo.png" alt="Awarizon"
            className="w-8 h-8 flex-shrink-0" />
          <span className="font-bold">
            Awarizon
            <span className="text-yellow-400">
              {' '}Validators
            </span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center
          gap-6 text-sm text-gray-400">
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href}
              className="hover:text-white
              transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Explorer + Activate — desktop only. On mobile these live
              inside the hamburger menu instead, so the fixed bar stays
              uncluttered at narrow widths. */}
          <a href={EXPLORER_URL} target="_blank" rel="noopener noreferrer"
            className="hidden md:inline-flex items-center
            border border-yellow-400/30 text-yellow-400
            py-2 px-5 rounded-full hover:border-yellow-400/60
            text-sm font-medium transition-colors">
            Explorer
          </a>
          <Link href="/activate" className="hidden md:block">
            <button className="bg-yellow-400
              text-black font-bold py-2 px-5
              rounded-lg hover:bg-yellow-300
              text-sm transition-colors">
              Activate
            </button>
          </Link>

          <button
            onClick={() => setOpen(o => !o)}
            className="md:hidden w-9 h-9 flex items-center
              justify-center border border-gray-800 rounded-lg
              text-gray-300 hover:text-white hover:border-gray-600
              transition-colors"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div className="md:hidden border-t border-gray-800
          bg-[#0a0a0f]/95 backdrop-blur-xl px-6 py-4">
          <nav className="flex flex-col">
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href}
                onClick={() => setOpen(false)}
                className="py-2.5 text-sm text-gray-300
                hover:text-white transition-colors">
                {link.label}
              </Link>
            ))}
            <a href={EXPLORER_URL} target="_blank" rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="py-2.5 text-sm text-gray-300
              hover:text-white transition-colors">
              Explorer ↗
            </a>
          </nav>
          <Link href="/activate" onClick={() => setOpen(false)}>
            <button className="w-full mt-3 bg-yellow-400
              text-black font-bold py-2.5 rounded-lg
              hover:bg-yellow-300 text-sm transition-colors">
              Activate
            </button>
          </Link>
        </div>
      )}
    </header>
  )
}
