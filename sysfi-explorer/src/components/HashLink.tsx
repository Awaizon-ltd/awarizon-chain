import { useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy } from 'lucide-react'
import { formatAddress, formatHash } from '../lib/format'

interface HashLinkProps {
	value: string
	to: string
	kind: 'address' | 'hash'
	chars?: number
	mono?: boolean
}

/** Truncated, monospaced, click-to-copy, links to the detail page. The one building block every table/detail page uses for addresses and hashes. */
export function HashLink({ value, to, kind, chars, mono = true }: HashLinkProps) {
	const [copied, setCopied] = useState(false)
	const display = kind === 'address' ? formatAddress(value, chars ?? 4) : formatHash(value, chars ?? 8)

	async function handleCopy(e: MouseEvent) {
		e.preventDefault()
		e.stopPropagation()
		try {
			await navigator.clipboard.writeText(value)
			setCopied(true)
			setTimeout(() => setCopied(false), 1500)
		} catch {
			// Clipboard API can fail (permissions, insecure context) — fail silently, the link itself still works.
		}
	}

	return (
		<span className="inline-flex items-center gap-1">
			<Link
				to={to}
				className={`text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm ${mono ? 'font-mono' : ''}`}
				title={value}
			>
				{display}
			</Link>
			<button
				type="button"
				onClick={handleCopy}
				className="p-1.5 -m-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
				aria-label={copied ? 'Copied' : `Copy ${kind}`}
			>
				{copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
			</button>
		</span>
	)
}
