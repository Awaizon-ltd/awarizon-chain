import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../../hooks/useTheme'

const NAV = [
  { label: 'Overview', path: '/' },
  { label: 'Blocks', path: '/blocks' },
  { label: 'Validators', path: '/validators' },
  { label: 'Campaigns', path: '/campaigns' },
  { label: 'Developers', path: '/developers' },
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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

/* ── Search routing ─────────────────────────────────────────────── */
function resolveSearchRoute(q: string): string {
  if (/^\d+$/.test(q)) return `/blocks?block=${q}`
  if (/^0x[0-9a-fA-F]{64}$/.test(q)) return `/blocks?hash=${encodeURIComponent(q)}`
  return `/account?address=${encodeURIComponent(q)}`
}

/* ── Header ─────────────────────────────────────────────────────── */
export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    navigate(resolveSearchRoute(q))
    setQuery('')
    inputRef.current?.blur()
  }

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* ── Banner background ──────────────────────────────────── */}
      <div
        className="relative w-full"
        style={{
          backgroundImage: 'url(/banner.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/72 dark:bg-black/80 transition-colors duration-300" />

        <div className="relative z-10 w-full px-4 sm:px-6">

          {/* ── Row 1: Brand + Nav ─────────────────────────────── */}
          <div className="flex items-center justify-between h-16 sm:h-[70px]">

            {/* Brand */}
            <Link to="/" className="flex items-center gap-3 flex-shrink-0 group">
              <div className="bg-black/60 ring-1 ring-awz-gold/40 rounded-xl p-1.5 group-hover:ring-awz-gold/70 transition-all">
                <img
                  src="/logo.png"
                  alt="Awarizon"
                  className="h-8 w-8 sm:h-9 sm:w-9 object-contain"
                />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-awz-gold font-bold text-base sm:text-xl tracking-[0.15em] font-mono">
                  RIZSCAN
                </span>
                <span className="text-white/45 text-[9px] sm:text-[10px] font-mono tracking-widest uppercase hidden xs:block">
                  Awarizon Network Explorer
                </span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-0.5 lg:gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-lg text-sm font-mono tracking-wide transition-all whitespace-nowrap ${
                    isActive(item.path)
                      ? 'bg-awz-gold/20 text-awz-gold font-semibold'
                      : 'text-white/65 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="w-px h-5 bg-white/20 mx-2" />
              <button
                onClick={toggle}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="p-2 rounded-lg text-white/55 hover:text-awz-gold hover:bg-white/10 transition-all"
              >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </button>
            </nav>

            {/* Mobile: theme toggle + hamburger */}
            <div className="flex md:hidden items-center gap-1.5">
              <button
                onClick={toggle}
                aria-label="Toggle theme"
                className="p-2 rounded-lg text-white/55 hover:text-awz-gold transition-all"
              >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </button>
              <button
                onClick={() => setMobileOpen((o) => !o)}
                aria-label="Toggle menu"
                className="p-2 rounded-lg text-white/65 hover:text-white transition-all"
              >
                {mobileOpen ? <XIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>

          {/* ── Row 2: Search ──────────────────────────────────── */}
          <div className="pb-5 sm:pb-7">
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-awz-gold transition-colors duration-200">
                  <SearchIcon size={20} />
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by address, block number, or hash…"
                  className={[
                    'w-full rounded-xl pl-12 pr-14 py-3.5 sm:py-4',
                    'bg-white/10 dark:bg-black/40 backdrop-blur-md',
                    'border border-white/20 dark:border-white/10',
                    'focus:border-awz-gold/70 focus:bg-white/15 dark:focus:bg-black/50',
                    'text-white text-sm sm:text-base placeholder:text-white/35',
                    'outline-none transition-all duration-200',
                    'font-mono',
                  ].join(' ')}
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-awz-gold hover:bg-awz-gold-dim text-black font-bold text-xs px-3 py-1.5 rounded-lg transition-colors duration-150 font-mono"
                >
                  GO
                </button>
              </div>
              <p className="text-center text-white/30 text-xs font-mono mt-2.5 hidden sm:block">
                address · block number · block hash
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* ── Mobile nav drawer ─────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden bg-awz-bg border-b border-awz-border shadow-2xl">
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
        </div>
      )}
    </header>
  )
}
