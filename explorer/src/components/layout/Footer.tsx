import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

const YEAR = new Date().getFullYear()

const EXPLORE = [
  { label: 'Overview', path: '/' },
  { label: 'Blocks', path: '/blocks' },
  { label: 'Tokens', path: '/tokens' },
  { label: 'NFTs', path: '/nfts' },
]

const NETWORK = [
  { label: 'Validators', path: '/validators' },
  { label: 'Campaigns', path: '/campaigns' },
]

const EXTERNAL = [
  { label: 'RizArt Marketplace', href: 'https://rizart.xyz' },
  { label: 'MetaMask', href: 'https://metamask.io' },
]

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-awz-muted text-[10px] font-mono uppercase tracking-[0.18em]">{title}</span>
      {children}
    </div>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-awz-border bg-awz-surface mt-auto">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">

          <div className="col-span-2 sm:col-span-1 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Awarizon" className="h-5 w-5 object-contain" />
              <span className="text-awz-gold font-bold text-sm font-mono tracking-[0.15em]">RIZSCAN</span>
            </div>
            <p className="text-awz-muted text-xs font-mono leading-relaxed max-w-xs">
              Block explorer for the Awarizon network — blocks, transactions, validators, campaigns, and developer activity.
            </p>
          </div>

          <FooterColumn title="Explore">
            {EXPLORE.map((item) => (
              <Link key={item.path} to={item.path} className="text-awz-muted text-xs font-mono hover:text-awz-gold transition-colors w-fit">
                {item.label}
              </Link>
            ))}
          </FooterColumn>

          <FooterColumn title="Network">
            {NETWORK.map((item) => (
              <Link key={item.path} to={item.path} className="text-awz-muted text-xs font-mono hover:text-awz-gold transition-colors w-fit">
                {item.label}
              </Link>
            ))}
          </FooterColumn>

          <FooterColumn title="Resources">
            {EXTERNAL.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-awz-muted text-xs font-mono hover:text-awz-gold transition-colors w-fit"
              >
                {item.label} ↗
              </a>
            ))}
          </FooterColumn>

        </div>

        <div className="mt-8 pt-5 border-t border-awz-border/60 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-awz-muted/50 text-[10px] font-mono">© {YEAR} Awarizon. All rights reserved.</span>
          <span className="text-awz-muted/40 text-[10px] font-mono uppercase tracking-widest">Awarizon Network Explorer</span>
        </div>
      </div>
    </footer>
  )
}
