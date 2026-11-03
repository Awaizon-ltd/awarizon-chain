import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'
import { resolveSearch } from '../../hooks/useSearch'
import { AddChainButton } from '../AddChainButton'

const NAV = [
  { label: 'Overview', path: '/' },
  { label: 'Tokens', path: '/tokens' },
  { label: 'NFTs', path: '/nfts' },
  { label: 'Blocks', path: '/blocks' },
  { label: 'Validators', path: '/validators' },
  { label: 'Campaigns', path: '/campaigns' },
]

/* ── Inline SVG icons ───────────────────────────────────────────── */
function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

/* ── Search field — shared between the inline desktop bar and the ── */
/* ── mobile drop-down row so the behavior/logic lives in one place ── */
function SearchField({ autoFocus = false, compact = false }: { autoFocus?: boolean; compact?: boolean }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q || searching) return

    setSearching(true)
    setSearchError(null)
    const result = await resolveSearch(q).catch(() => null)
    setSearching(false)

    if (!result) {
      setSearchError(`No match for "${q}"`)
      return
    }

    switch (result.type) {
      case 'block':
        navigate(`/block/${result.value}`)
        break
      case 'hash':
        navigate(`/blocks?hash=${encodeURIComponent(result.value)}`)
        break
      case 'address':
      case 'name':
        navigate(`/account?address=${encodeURIComponent(result.value)}`)
        break
    }
    setQuery('')
    inputRef.current?.blur()
  }

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="relative group">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-awz-muted group-focus-within:text-awz-gold transition-colors duration-200">
          <SearchIcon size={compact ? 15 : 16} />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSearchError(null) }}
          placeholder={compact ? 'Search address, block, tx hash, .riz name…' : 'Search address, block #, tx hash, or .riz name…'}
          className={[
            'w-full rounded-lg pl-9 pr-4',
            compact ? 'py-2.5 text-sm' : 'py-2 text-sm',
            'bg-awz-bg border border-awz-border',
            'focus:border-awz-gold/60',
            'text-awz-text placeholder:text-awz-muted/60',
            'outline-none transition-colors duration-150',
            'font-mono',
          ].join(' ')}
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-awz-gold text-xs font-mono animate-pulse">…</span>
        )}
      </div>
      {searchError && (
        <p className="mt-1.5 text-xs font-mono text-awz-red">{searchError}</p>
      )}
    </form>
  )
}

/* ── Header ─────────────────────────────────────────────────────── */
export function Header() {
  const location = useLocation()
  const { theme, toggle } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  useEffect(() => { setMobileOpen(false); setMobileSearchOpen(false) }, [location.pathname])

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <header className="sticky top-0 z-50 w-full bg-awz-bg/95 backdrop-blur-md border-b border-awz-border">
      {/* thin gold accent line — the one holdover from the old banner's gold identity */}
      <div className="h-0.5 w-full bg-gradient-to-r from-awz-gold/0 via-awz-gold/70 to-awz-gold/0" />

      <div className="w-full px-4 sm:px-6">
        <div className="flex items-center gap-3 lg:gap-5 h-16">

          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="bg-awz-surface ring-1 ring-awz-gold/30 rounded-lg p-1 group-hover:ring-awz-gold/60 transition-all">
              <img src="/logo.png" alt="Awarizon" className="h-6 w-6 sm:h-7 sm:w-7 object-contain" />
            </div>
            <span className="text-awz-gold font-bold text-sm sm:text-lg tracking-[0.15em] font-mono whitespace-nowrap">
              RIZSCAN
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden xl:flex items-center gap-0.5 flex-shrink-0">
            {NAV.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1.5 rounded-lg text-sm font-mono tracking-wide transition-all whitespace-nowrap ${
                  isActive(item.path)
                    ? 'bg-awz-gold/15 text-awz-gold font-semibold'
                    : 'text-awz-muted hover:text-awz-text hover:bg-awz-surface'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Search — fills remaining space on sm+, hidden on xs (toggled below) */}
          <div className="hidden sm:block flex-1 max-w-sm ml-auto">
            <SearchField compact />
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto sm:ml-0">
            <div className="hidden md:block">
              <AddChainButton variant="card" showCopyRpc={false} />
            </div>

            <button
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg text-awz-muted hover:text-awz-gold hover:bg-awz-surface transition-all"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>

            {/* mobile-only search trigger */}
            <button
              onClick={() => setMobileSearchOpen((o) => !o)}
              aria-label="Toggle search"
              className="sm:hidden p-2 rounded-lg text-awz-muted hover:text-awz-gold transition-all"
            >
              <SearchIcon size={18} />
            </button>

            {/* hamburger — covers nav below xl, and wallet/search below their breakpoints too */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
              className="xl:hidden p-2 rounded-lg text-awz-muted hover:text-awz-text transition-all"
            >
              {mobileOpen ? <XIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {/* mobile search row */}
        {mobileSearchOpen && (
          <div className="sm:hidden pb-3 -mt-1">
            <SearchField autoFocus compact />
          </div>
        )}
      </div>

      {/* Drop-down panel — nav links (below xl) + wallet button (below md) */}
      <div
        className={`xl:hidden absolute left-0 right-0 top-full bg-awz-bg border-b border-awz-border shadow-2xl transition-all duration-200 ease-out ${
          mobileOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <nav className="w-full px-4 py-3 flex flex-col gap-0.5">
          {NAV.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-4 py-3 rounded-lg text-sm font-mono transition-all ${
                isActive(item.path)
                  ? 'bg-awz-gold/10 text-awz-gold font-semibold'
                  : 'text-awz-text hover:bg-awz-surface hover:text-awz-gold'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="md:hidden px-4 pb-4">
          <AddChainButton variant="card" />
        </div>
      </div>
    </header>
  )
}
