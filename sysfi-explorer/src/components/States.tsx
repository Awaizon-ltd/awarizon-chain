import type { ReactNode } from 'react'
import { AlertTriangle, RotateCw, SearchX } from 'lucide-react'

export function Skeleton({ className = '' }: { className?: string }) {
	return <div className={`animate-skeleton-pulse rounded-md bg-muted ${className}`} aria-hidden="true" />
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
	return (
		<div className="space-y-2" role="status" aria-label="Loading">
			{Array.from({ length: rows }).map((_, i) => (
				<Skeleton key={i} className="h-11 w-full" />
			))}
		</div>
	)
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
	return (
		<div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
			<SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
			<p className="font-medium">{title}</p>
			{description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
		</div>
	)
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
			<AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
			<div>
				<p className="font-medium">Something went wrong</p>
				<p className="text-sm text-muted-foreground max-w-sm">{message}</p>
			</div>
			{onRetry && (
				<button
					type="button"
					onClick={onRetry}
					className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
				>
					<RotateCw className="size-3.5" aria-hidden="true" />
					Retry
				</button>
			)}
		</div>
	)
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
	return <div className={`rounded-lg border border-border bg-card text-card-foreground ${className}`}>{children}</div>
}
