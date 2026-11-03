import Image from 'next/image'
import { ThemeToggle } from '@/components/ThemeToggle'
import { FaucetCard } from '@/components/FaucetCard'
import { chainConfig } from '@/lib/chain'
import logo from '@/assets/logo.png'

export default function Home() {
	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground">
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
			>
				Skip to content
			</a>
			<header className="border-b border-border">
				<div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 md:px-6">
					<Image src={logo} alt="" className="size-8" priority />
					<span className="text-base font-semibold tracking-tight">
						SysFi <span className="font-normal text-muted-foreground">Faucet</span>
					</span>
					<div className="ml-auto">
						<ThemeToggle />
					</div>
				</div>
			</header>

			<main id="main-content" className="flex flex-1 items-center justify-center px-4 py-12">
				<FaucetCard />
			</main>

			<footer className="border-t border-border py-6">
				<p className="text-center text-xs text-muted-foreground">{chainConfig.name} — testnet tokens, no real value</p>
			</footer>
		</div>
	)
}
