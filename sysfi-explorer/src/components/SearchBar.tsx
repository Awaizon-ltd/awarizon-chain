import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search } from 'lucide-react'
import { classifySearchInput } from '../lib/format'
import { provider } from '../lib/chain'

interface SearchBarProps {
	className?: string
	/** 'lg' is the hero-banner treatment: bigger text, translucent surface (the input sits on top of a photo, not the page background). */
	size?: 'default' | 'lg'
	placeholder?: string
}

export function SearchBar({ className = '', size = 'default', placeholder }: SearchBarProps) {
	const [value, setValue] = useState('')
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const navigate = useNavigate()
	const inputId = useId()
	const errorId = useId()

	async function handleSubmit(e: FormEvent) {
		e.preventDefault()
		const { kind, value: input } = classifySearchInput(value)
		setError(null)

		if (kind === 'invalid') {
			setError('Enter a block number, address, or transaction hash')
			return
		}
		if (kind === 'block-number') {
			navigate(`/block/${input}`)
			return
		}
		if (input.length === 42) {
			navigate(`/address/${input}`)
			return
		}
		// 66-char hex: could be a tx hash or a block hash — check which.
		setBusy(true)
		try {
			const tx = await provider.getTransaction(input)
			navigate(tx ? `/tx/${input}` : `/block/${input}`)
		} catch {
			navigate(`/block/${input}`)
		} finally {
			setBusy(false)
		}
	}

	const isLg = size === 'lg'

	return (
		<form onSubmit={handleSubmit} className={className} role="search">
			<label htmlFor={inputId} className="sr-only">
				Search by block number, address, or transaction hash
			</label>
			<div className="relative">
				<Search
					className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground ${isLg ? 'left-4 size-5' : 'left-3 size-4'}`}
					aria-hidden="true"
				/>
				<input
					id={inputId}
					type="search"
					inputMode="search"
					autoComplete="off"
					placeholder={placeholder ?? 'Search by block, address, or transaction hash'}
					value={value}
					onChange={(e) => {
						setValue(e.target.value)
						if (error) setError(null)
					}}
					className={
						isLg
							? 'h-14 w-full rounded-xl border border-white/20 bg-white/10 pl-12 pr-24 text-base text-white placeholder:text-white/60 backdrop-blur-md shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent'
							: 'h-10 w-full rounded-md border border-input bg-background pl-9 pr-16 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
					}
					aria-invalid={error ? 'true' : undefined}
					aria-describedby={error ? errorId : undefined}
				/>
				<button
					type="submit"
					disabled={busy || !value.trim()}
					className={
						isLg
							? 'absolute right-2 top-2 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent'
							: 'absolute right-1.5 top-1.5 inline-flex h-7 items-center rounded-sm bg-primary px-2.5 text-xs font-medium text-primary-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
					}
				>
					{busy ? <Loader2 className={isLg ? 'size-4 animate-spin' : 'size-3.5 animate-spin'} aria-hidden="true" /> : 'Search'}
				</button>
			</div>
			{error && (
				<p id={errorId} className={`mt-1.5 text-xs ${isLg ? 'text-white' : 'text-destructive'}`}>
					{error}
				</p>
			)}
		</form>
	)
}
