import Link from 'next/link'
import { EXPLORER_URL, SPEC } from '../../lib/constants'

const columns = [
  {
    heading: 'Validators',
    links: [
      { label: 'Validators', href: '/leaderboard' },
      { label: 'Managed Node', href: '/managed' },
      { label: 'Self-Hosted Node', href: '/self-hosted' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
  {
    heading: 'Network',
    links: [
      { label: 'Block Explorer', href: EXPLORER_URL, external: true },
      { label: 'DEX', href: SPEC.dex, external: true },
      { label: 'Activate a slot', href: '/activate' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row
          justify-between gap-10">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <img src="/logo.png" alt="Awarizon"
                className="w-8 h-8 flex-shrink-0" />
              <span className="font-bold">
                Awarizon
                <span className="text-yellow-400"> Validators</span>
              </span>
            </Link>
            <p className="text-sm text-gray-500">
              Secure the Awarizon network and earn RIZ epoch rewards —
              run your own node or activate a managed slot.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10">
            {columns.map(col => (
              <div key={col.heading}>
                <p className="text-xs text-gray-500 uppercase
                  tracking-wider font-semibold mb-3">
                  {col.heading}
                </p>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link.label}>
                      {'external' in link && link.external ? (
                        <a href={link.href} target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-400 hover:text-white
                            transition-colors">
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href}
                          className="text-sm text-gray-400 hover:text-white
                            transition-colors">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6
          flex flex-col sm:flex-row justify-between gap-3
          text-xs text-gray-600">
          <span>© {new Date().getFullYear()} Awarizon. {SPEC.name}.</span>
          <span>RIZ has no monetary value on testnet.</span>
        </div>
      </div>
    </footer>
  )
}
