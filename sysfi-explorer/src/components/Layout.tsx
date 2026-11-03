import { type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SearchBar } from './SearchBar'
import { ThemeToggle } from './ThemeToggle'
import { MetaMaskButton } from './MetaMaskButton'
import { chainConfig } from '../lib/chain'
import logoImage from '../assets/logo-small.png'

export function Layout({ children }: { children: ReactNode }) {
	const { pathname } = useLocation()
	const isHome = pathname === '/'

	return (
		<div className="min-h-screen bg-background text-foreground">
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
			>
				Skip to content
			</a>
			<header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
				<div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 md:px-6 lg:px-8">
					<Link
						to="/"
						className="flex shrink-0 items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
					>
						<img src={logoImage} alt="" className="size-8 object-contain" />
						<span className="text-base font-semibold tracking-tight">
							SysFi <span className="text-muted-foreground font-normal">Explorer</span>
						</span>
					</Link>
					{/* The homepage hero has its own prominent search — no need to duplicate it right above it. Every other page still needs quick search access without scrolling back home. */}
					{!isHome && <SearchBar className="order-3 w-full md:order-2 md:ml-4 md:w-96 md:flex-1" />}
					<div className={`order-2 flex items-center gap-1 md:order-3 ${isHome ? 'ml-auto' : 'ml-auto md:ml-0'}`}>
						<span className="mr-1 hidden items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground sm:inline-flex">
							<span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
							{chainConfig.name}
						</span>
						<ThemeToggle />
					</div>
				</div>
			</header>

			<main id="main-content" className="mx-auto max-w-7xl px-4 py-6 pb-28 md:px-6 lg:px-8">
				{children}
			</main>

			<footer className="border-t border-border py-6">
				<div className="mx-auto max-w-7xl px-4 text-center text-xs text-muted-foreground md:px-6 lg:px-8">
					SysFi Explorer — chain ID {chainConfig.chainId}
				</div>
			</footer>

			<MetaMaskButton />
		</div>
	)
}
