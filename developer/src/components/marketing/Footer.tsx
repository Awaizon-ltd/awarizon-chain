import Link from 'next/link'
import { EXPLORER_URL } from '../../constants'

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'Ecosystem Grants', href: '/grant' },
      { label: 'Launch App', href: '/dashboard' },
    ],
  },
  {
    title: 'Ecosystem',
    links: [
      { label: 'Explorer', href: EXPLORER_URL, external: true },
      { label: 'DEX', href: 'https://dex.awarizon.com', external: true },
    ],
  },
  {
    title: 'Packages',
    links: [
      { label: 'awarizon.js', href: 'https://www.npmjs.com/package/awarizon.js', external: true },
      { label: '@awarizon/app', href: 'https://www.npmjs.com/package/@awarizon/app', external: true },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-dev-border mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg
                bg-black/60 ring-1 ring-yellow-400/40
                flex items-center justify-center p-1">
                <img src="/logo.png" alt="Awarizon"
                  className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-sm">Awarizon</span>
            </div>
            <p className="text-xs text-[#666] leading-relaxed max-w-[220px]">
              Build and distribute apps on the Awarizon blockchain.
            </p>
          </div>

          {columns.map(col => (
            <div key={col.title}>
              <h4 className="text-xs font-bold uppercase
                tracking-wider text-[#666] mb-3">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map(link => (
                  <li key={link.label}>
                    {'external' in link && link.external ? (
                      <a href={link.href} target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#999] hover:text-yellow-400
                          transition-colors">
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href}
                        className="text-sm text-[#999] hover:text-yellow-400
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

        <div className="mt-12 pt-6 border-t border-dev-border
          flex flex-col sm:flex-row items-start sm:items-center
          justify-between gap-3">
          <p className="text-xs text-[#555]">
            © {new Date().getFullYear()} Awarizon. All rights reserved.
          </p>
          <p className="text-xs text-[#555]">
            Built on the Awarizon chain — secured by RIZ staking.
          </p>
        </div>
      </div>
    </footer>
  )
}
