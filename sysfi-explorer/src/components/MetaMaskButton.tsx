import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { addSysFiNetwork, hasInjectedWallet } from '../lib/metamask'
import { chainConfig } from '../lib/chain'

type Status = 'idle' | 'adding' | 'added' | 'rejected' | 'no-wallet' | 'error'

/** Fixed bottom-of-viewport "Add to MetaMask" button, as asked. Doesn't render the RPC URL — MetaMask gets it directly via wallet_addEthereumChain. */
export function MetaMaskButton() {
	const [status, setStatus] = useState<Status>('idle')

	async function handleClick() {
		if (!hasInjectedWallet()) {
			setStatus('no-wallet')
			return
		}
		setStatus('adding')
		const result = await addSysFiNetwork()
		if (result.ok) {
			setStatus('added')
		} else if (result.reason === 'rejected') {
			setStatus('rejected')
		} else if (result.reason === 'no-wallet') {
			setStatus('no-wallet')
		} else {
			setStatus('error')
		}
		setTimeout(() => setStatus('idle'), 3000)
	}

	const label =
		status === 'adding'
			? 'Adding…'
			: status === 'added'
				? 'Added ✓'
				: status === 'rejected'
					? 'Cancelled'
					: status === 'no-wallet'
						? 'No wallet found'
						: status === 'error'
							? 'Failed — try again'
							: `Add ${chainConfig.name} to MetaMask`

	return (
		<div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
			<button
				type="button"
				onClick={handleClick}
				disabled={status === 'adding'}
				className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-medium shadow-md hover:bg-muted disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
			>
				{status === 'adding' && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
				<FoxIcon className="size-4" />
				{label}
			</button>
		</div>
	)
}

function FoxIcon({ className }: { className?: string }) {
	// Small neutral wallet glyph — avoids using MetaMask's trademarked fox artwork.
	return (
		<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
			<rect x="2" y="7" width="20" height="13" rx="2" />
			<path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2Z" />
			<circle cx="16" cy="13.5" r="1.5" fill="currentColor" stroke="none" />
		</svg>
	)
}
