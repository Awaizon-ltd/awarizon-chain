import { useParams, Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useBlock } from '../hooks/useChainData'
import { Card, EmptyState, ErrorState, Skeleton } from '../components/States'
import { HashLink } from '../components/HashLink'
import { TransactionsTable } from '../components/TransactionsTable'
import { formatAbsoluteTime, formatNumber, formatRelativeTime } from '../lib/format'

export function BlockPage() {
	const { id } = useParams<{ id: string }>()
	const state = useBlock(id ?? '')

	if (state.status === 'loading') {
		return (
			<div className="space-y-3">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-40 w-full" />
			</div>
		)
	}
	if (state.status === 'error') return <ErrorState message={state.message} />
	if (state.status === 'not-found') {
		return <EmptyState title="Block not found" description={`No block matches "${id}".`} />
	}

	const block = state.data
	const timestamps = new Map([[block.number, block.timestamp]])

	return (
		<div className="space-y-6 animate-fade-in">
			<div className="flex items-center justify-between gap-2">
				<h1 className="font-mono tabular-nums text-2xl font-semibold">Block {formatNumber(block.number)}</h1>
				<div className="flex gap-1">
					<Link
						to={`/block/${block.number - 1}`}
						className="inline-flex size-9 items-center justify-center rounded-md border border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
						aria-label="Previous block"
					>
						<ChevronLeft className="size-4" aria-hidden="true" />
					</Link>
					<Link
						to={`/block/${block.number + 1}`}
						className="inline-flex size-9 items-center justify-center rounded-md border border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
						aria-label="Next block"
					>
						<ChevronRight className="size-4" aria-hidden="true" />
					</Link>
				</div>
			</div>

			<Card className="divide-y divide-border">
				<Row label="Timestamp">
					{formatAbsoluteTime(block.timestamp)} ({formatRelativeTime(block.timestamp)})
				</Row>
				<Row label="Transactions">{block.transactions.length}</Row>
				<Row label="Block hash">{block.hash && <HashLink value={block.hash} to={`/block/${block.hash}`} kind="hash" chars={12} />}</Row>
				<Row label="Parent hash">
					<HashLink value={block.parentHash} to={`/block/${block.parentHash}`} kind="hash" chars={12} />
				</Row>
				<Row label="Author / miner">
					<HashLink value={block.miner} to={`/address/${block.miner}`} kind="address" chars={8} />
				</Row>
				<Row label="Gas used / limit">
					{formatNumber(block.gasUsed)} / {formatNumber(block.gasLimit)}
				</Row>
				{block.baseFeePerGas !== null && <Row label="Base fee">{block.baseFeePerGas.toString()} wei</Row>}
			</Card>

			<section aria-labelledby="block-txs-heading">
				<h2 id="block-txs-heading" className="mb-3 text-sm font-semibold text-muted-foreground">
					Transactions in this block
				</h2>
				<TransactionsTable transactions={block.prefetchedTransactions} timestamps={timestamps} />
			</section>
		</div>
	)
}

function Row({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
			<span className="w-40 shrink-0 text-sm text-muted-foreground">{label}</span>
			<span className="min-w-0 flex-1 break-all text-sm">{children}</span>
		</div>
	)
}
