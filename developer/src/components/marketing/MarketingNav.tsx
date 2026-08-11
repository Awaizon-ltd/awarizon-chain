import Link from 'next/link'
import Button from '../ui/Button'

export default function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-dev-border
      bg-dev-bg/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16
        flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2
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
          <span className="font-bold text-sm truncate">
            Awarizon
            <span className="text-yellow-400"> Developer</span>
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-6 ml-4">
          <Link href="/docs"
            className="text-sm text-[#888] hover:text-white transition-colors">
            Docs
          </Link>
          <Link href="/grant"
            className="text-sm text-[#888] hover:text-white transition-colors">
            Grants
          </Link>
        </nav>

        <div className="flex-1" />

        <Link href="/docs" className="hidden sm:block">
          <Button variant="secondary" size="sm">Read Docs</Button>
        </Link>
        <Link href="/dashboard">
          <Button size="sm">Launch App</Button>
        </Link>
      </div>
    </header>
  )
}
