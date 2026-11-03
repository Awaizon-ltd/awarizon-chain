import type { ReactNode } from 'react'
import { Card, Skeleton } from './States'

export function StatCard({ label, value, icon, loading }: { label: string; value: ReactNode; icon: ReactNode; loading?: boolean }) {
	return (
		<Card className="flex items-center gap-3 p-4">
			<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary" aria-hidden="true">
				{icon}
			</div>
			<div className="min-w-0">
				<p className="text-xs text-muted-foreground">{label}</p>
				{loading ? (
					<Skeleton className="mt-1 h-5 w-20" />
				) : (
					<p className="truncate font-mono tabular-nums text-lg font-semibold leading-tight">{value}</p>
				)}
			</div>
		</Card>
	)
}
