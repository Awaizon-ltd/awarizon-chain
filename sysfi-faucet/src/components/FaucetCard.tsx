'use client'

import { useEffect, useId, useState, type FormEvent } from 'react'
import { CheckCircle2, ExternalLink, Loader2, Wallet, XCircle } from 'lucide-react'
import { chainConfig } from '@/lib/chain'
import { isValidAddress, formatHash } from '@/lib/format'
import { connectWallet, hasInjectedWallet } from '@/lib/wallet'
import { SocialGate } from './SocialGate'

type ClaimState =
	| { status: 'idle' }
	| { status: 'submitting' }
	| { status: 'success'; txHash: string; amount: string }
	| { status: 'error'; message: string }

export function FaucetCard() {
	const [address, setAddress] = useState('')
	const [claim, setClaim] = useState<ClaimState>({ status: 'idle' })
	const [connecting, setConnecting] = useState(false)
	const [walletError, setWalletError] = useState<string | null>(null)
	const [xHandle, setXHandle] = useState<string | null>(null)
	const inputId = useId()

	async function handleConnect() {
		if (!hasInjectedWallet()) {
			setWalletError('No wallet extension found. Install MetaMask, or just paste an address below.')
			return
		}
		setConnecting(true)
		setWalletError(null)
		const result = await connectWallet()
		setConnecting(false)
		if (result.ok) {
			setAddress(result.address)
		} else if (result.reason !== 'rejected') {
			setWalletError('Could not connect wallet. You can still paste an address below.')
		}
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		const trimmed = address.trim()
		if (!isValidAddress(trimmed)) {
			setClaim({ status: 'error', message: 'Enter a valid address (0x followed by 40 hex characters).' })
			return
		}

		setClaim({ status: 'submitting' })
		try {
			const res = await fetch('/api/claim', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ address: trimmed, xHandle }),
			})
			const data = await res.json()
			if (!res.ok) {
				setClaim({ status: 'error', message: data.error ?? 'Something went wrong.' })
				return
			}
			setClaim({ status: 'success', txHash: data.txHash, amount: data.amount })
		} catch {
			setClaim({ status: 'error', message: 'Network error — check your connection and try again.' })
		}
	}

	const isSubmitting = claim.status === 'submitting'

	return (
		<div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
			<h1 className="text-xl font-semibold tracking-tight">{chainConfig.name} Faucet</h1>
			<p className="mt-1 text-sm text-muted-foreground">
				Get {chainConfig.claimAmount} {chainConfig.currencySymbol} for testing. One claim per address every 24 hours.
			</p>

			{xHandle === null && (
				<div className="mt-6">
					<SocialGate onApproved={setXHandle} />
				</div>
			)}

			{xHandle !== null && claim.status === 'success' ? (
				<SuccessPanel txHash={claim.txHash} amount={claim.amount} onReset={() => setClaim({ status: 'idle' })} />
			) : xHandle !== null ? (
				<form onSubmit={handleSubmit} className="mt-6 space-y-4">
					<div>
						<label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
							Wallet address
						</label>
						<div className="flex gap-2">
							<input
								id={inputId}
								type="text"
								inputMode="text"
								autoComplete="off"
								spellCheck={false}
								placeholder="0x…"
								value={address}
								onChange={(e) => {
									setAddress(e.target.value)
									if (claim.status === 'error') setClaim({ status: 'idle' })
								}}
								disabled={isSubmitting}
								className="h-11 flex-1 min-w-0 rounded-md border border-input bg-background px-3 font-mono text-sm placeholder:text-muted-foreground disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
								aria-invalid={claim.status === 'error' ? 'true' : undefined}
								aria-describedby={claim.status === 'error' ? 'claim-error' : undefined}
							/>
							<button
								type="button"
								onClick={handleConnect}
								disabled={connecting || isSubmitting}
								className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
							>
								{connecting ? (
									<Loader2 className="size-4 animate-spin" aria-hidden="true" />
								) : (
									<Wallet className="size-4" aria-hidden="true" />
								)}
								<span className="hidden sm:inline">Connect</span>
							</button>
						</div>
						{walletError && <p className="mt-1.5 text-xs text-muted-foreground">{walletError}</p>}
					</div>

					{claim.status === 'error' && (
						<div id="claim-error" role="alert" className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
							<XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
							<span>{claim.message}</span>
						</div>
					)}

					<button
						type="submit"
						disabled={isSubmitting || !address.trim()}
						className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
					>
						{isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
						{isSubmitting
							? 'Sending…'
							: `Request ${chainConfig.claimAmount} ${chainConfig.currencySymbol}`}
					</button>
				</form>
			) : null}
		</div>
	)
}

function SuccessPanel({ txHash, amount, onReset }: { txHash: string; amount: string; onReset: () => void }) {
	const explorerLink = chainConfig.explorerUrl ? `${chainConfig.explorerUrl}/tx/${txHash}` : null
	return (
		<div className="mt-6 animate-fade-in space-y-4 text-center">
			<CheckCircle2 className="mx-auto size-10 text-primary" aria-hidden="true" />
			<div>
				<p className="font-medium">
					Sent {amount} {chainConfig.currencySymbol}
				</p>
				<p className="mt-1 text-sm text-muted-foreground">
					It should land in your wallet within a few seconds. Come back in 24 hours for another claim.
				</p>
			</div>
			{explorerLink ? (
				<a
					href={explorerLink}
					target="_blank"
					rel="noreferrer"
					className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
				>
					View transaction {formatHash(txHash, 6)}
					<ExternalLink className="size-3.5" aria-hidden="true" />
				</a>
			) : (
				<p className="font-mono text-xs text-muted-foreground">{formatHash(txHash, 10)}</p>
			)}
			<button
				type="button"
				onClick={onReset}
				className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
			>
				Claim for another address
			</button>
		</div>
	)
}

// Currently hidden from the card (balance display was distracting/unwanted)
// — kept here, unused, so re-enabling is a one-line `<FaucetStatus />` away.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FaucetStatus() {
	const [status, setStatus] = useState<{ balance: string; totalClaims: number } | 'loading' | 'error'>('loading')

	useEffect(() => {
		let cancelled = false
		fetch('/api/status')
			.then((r) => r.json())
			.then((data) => {
				if (cancelled) return
				if (data.error) setStatus('error')
				else setStatus(data)
			})
			.catch(() => {
				if (!cancelled) setStatus('error')
			})
		return () => {
			cancelled = true
		}
	}, [])

	return (
		<div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
			<span>Faucet balance</span>
			<span className="font-mono tabular-nums">
				{status === 'loading' && 'loading…'}
				{status === 'error' && '--'}
				{typeof status === 'object' && `${Number(status.balance).toLocaleString('en-US', { maximumFractionDigits: 0 })} ${chainConfig.currencySymbol}`}
			</span>
		</div>
	)
}
