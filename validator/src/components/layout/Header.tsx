import Link from 'next/link'
import { EXPLORER_URL } from '../../lib/constants'

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0
      z-50 bg-[#0d0a1f]/80 backdrop-blur-xl
      border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-6
        h-16 flex items-center justify-between">
        <Link href="/"
          className="flex items-center gap-2">
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
          <Link href="/leaderboard"
            className="hover:text-white
            transition-colors">
            Validators
          </Link>
          <Link href="/managed"
            className="hover:text-white
            transition-colors">
            Managed
          </Link>
          <Link href="/self-hosted"
            className="hover:text-white
            transition-colors">
            Self-Hosted
          </Link>
          <Link href="/dashboard"
            className="hover:text-white
            transition-colors">
            Dashboard
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <a href={EXPLORER_URL} target="_blank" rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center
            border border-yellow-400/30 text-yellow-400
            py-2 px-5 rounded-full hover:border-yellow-400/60
            text-sm font-medium transition-colors">
            Explorer
          </a>
          <Link href="/activate">
            <button className="bg-yellow-400
              text-black font-bold py-2 px-5
              rounded-lg hover:bg-yellow-300
              text-sm transition-colors">
              Activate
            </button>
          </Link>
        </div>
      </div>
    </header>
  )
}
