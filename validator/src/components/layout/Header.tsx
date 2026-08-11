import Link from 'next/link'

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0
      z-50 bg-[#0a0a0f]/80 backdrop-blur-xl
      border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-6
        h-16 flex items-center justify-between">
        <Link href="/"
          className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-400
            rounded-lg flex items-center
            justify-center font-black text-black
            text-sm">
            A
          </div>
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
            Leaderboard
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

        <Link href="/activate">
          <button className="bg-yellow-400
            text-black font-bold py-2 px-5
            rounded-lg hover:bg-yellow-300
            text-sm transition-colors">
            Activate
          </button>
        </Link>
      </div>
    </header>
  )
}
