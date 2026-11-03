import { SearchBar } from './SearchBar'
import bannerImage from '../assets/banner.webp'
import logoImage from '../assets/logo-small.png'
import { chainConfig } from '../lib/chain'

/**
 * Full-bleed hero banner for the homepage — breaks out of the page's
 * max-width container to run edge-to-edge regardless of where it's mounted.
 * Text sits on a fixed dark scrim over the banner photo, deliberately not
 * theme-tokenized: a photographic background needs its own consistent
 * contrast treatment rather than swapping to light-mode colors on top of it.
 */
export function Hero() {
	return (
		<section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden" aria-label="SysFi network search">
			<img src={bannerImage} alt="" className="absolute inset-0 size-full object-cover" aria-hidden="true" />
			<div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" aria-hidden="true" />
			<div className="relative mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 py-14 text-center sm:py-20">
				<img src={logoImage} alt={`${chainConfig.name} logo`} className="size-14 object-contain drop-shadow sm:size-16" />
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{chainConfig.name} Explorer</h1>
					<p className="mt-1.5 text-sm text-white/80">Search blocks, transactions, and addresses on SysFi.</p>
				</div>
				<SearchBar size="lg" className="w-full max-w-xl" placeholder="Block number, address, or transaction hash" />
			</div>
		</section>
	)
}
