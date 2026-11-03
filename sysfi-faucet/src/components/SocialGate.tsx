'use client'

import { useEffect, useId, useState, type FormEvent } from 'react'
import { ExternalLink, Loader2, XCircle } from 'lucide-react'

const X_URL = 'https://x.com/sysfidao'
const STORAGE_KEY = 'sysfi-social-verified'
const FIRST_CHECK_MS = 60_000
const RETRY_CHECK_MS = 8_000

type GateState =
	| { phase: 'form' }
	| { phase: 'checking'; secondsLeft: number }
	| { phase: 'failed' }
	| { phase: 'approved' }

/**
 * Social-follow gate shown before the claim form. There's no actual way to
 * verify someone followed — no X API integration here — so this is a
 * friction/attention step, not a real check. By design: first submission
 * always "fails" after a wait, second submission always succeeds. Language
 * stays generic ("couldn't confirm", not "not following") since we're not
 * actually checking anything specific.
 */
export function SocialGate({ onApproved }: { onApproved: (xHandle: string) => void }) {
	const [state, setState] = useState<GateState>({ phase: 'form' })
	const [handle, setHandle] = useState('')
	const [attempt, setAttempt] = useState(0)
	const inputId = useId()

	useEffect(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY)
			if (saved) {
				setState({ phase: 'approved' })
				onApproved(saved)
			}
		} catch {
			// localStorage unavailable — just show the gate normally.
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	useEffect(() => {
		if (state.phase !== 'checking') return
		if (state.secondsLeft <= 0) {
			const passing = attempt > 0
			if (passing) {
				try {
					localStorage.setItem(STORAGE_KEY, handle.trim())
				} catch {
					// Non-fatal — they just redo the gate next visit.
				}
				setState({ phase: 'approved' })
				onApproved(handle.trim())
			} else {
				setState({ phase: 'failed' })
			}
			return
		}
		const timer = setTimeout(() => setState({ phase: 'checking', secondsLeft: state.secondsLeft - 1 }), 1000)
		return () => clearTimeout(timer)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state])

	function handleSubmit(e: FormEvent) {
		e.preventDefault()
		if (!handle.trim()) return
		const durationMs = attempt === 0 ? FIRST_CHECK_MS : RETRY_CHECK_MS
		setState({ phase: 'checking', secondsLeft: Math.round(durationMs / 1000) })
	}

	function handleRetry() {
		setAttempt((a) => a + 1)
		setState({ phase: 'form' })
	}

	if (state.phase === 'approved') return null

	return (
		<div className="animate-fade-in">
			<a
				href={X_URL}
				target="_blank"
				rel="noreferrer"
				className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
			>
				<XLogo className="size-4" />
				Follow @sysfidao on X
				<ExternalLink className="size-3.5 text-muted-foreground" aria-hidden="true" />
			</a>

			{state.phase === 'form' && (
				<form onSubmit={handleSubmit} className="mt-4 space-y-3">
					<div>
						<label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
							Your X username
						</label>
						<input
							id={inputId}
							type="text"
							autoComplete="off"
							spellCheck={false}
							placeholder="@yourusername"
							value={handle}
							onChange={(e) => setHandle(e.target.value)}
							className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
						/>
					</div>
					<button
						type="submit"
						disabled={!handle.trim()}
						className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
					>
						{attempt > 0 ? 'Check again' : 'Verify'}
					</button>
				</form>
			)}

			{state.phase === 'checking' && (
				<div className="mt-4 flex flex-col items-center gap-2 rounded-md border border-border bg-muted/50 p-4 text-center">
					<Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
					<p className="text-sm text-muted-foreground">
						Checking… ({state.secondsLeft}s)
					</p>
				</div>
			)}

			{state.phase === 'failed' && (
				<div className="mt-4 space-y-3">
					<div role="alert" className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
						<XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
						<span>Couldn&apos;t confirm — make sure you followed, then try again.</span>
					</div>
					<button
						type="button"
						onClick={handleRetry}
						className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
					>
						Try again
					</button>
				</div>
			)}
		</div>
	)
}

function XLogo({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
			<path d="M18.9 2H22l-7.6 8.7L23.3 22h-7l-5.5-7.2L4.5 22H1.4l8.1-9.3L1 2h7.2l5 6.6L18.9 2Zm-1.2 18h1.7L7.4 4H5.6l12.1 16Z" />
		</svg>
	)
}
