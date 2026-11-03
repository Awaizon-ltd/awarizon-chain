import { useParams, Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { CheckCircle2, Clock, FileQuestion, XCircle } from 'lucide-react'
import { useTransaction } from '../hooks/useChainData'
import { Card, EmptyState, ErrorState, Skeleton } from '../components/States'
import { HashLink } from '../components/HashLink'
import { formatAbsoluteTime, formatGwei, formatNumber, formatRelativeTime, formatSyn } from '../lib/format'

export function TransactionPage() {
	const { hash } = useParams<{ hash: string }>()
	const state = useTransaction(hash ?? '')

	if (state.status === 'loading') {
		return (
			<div className="space-y-3">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-64 w-full" />
			</div>
		)
	}
	if (state.status === 'error') return <ErrorState message={state.message} />
	if (state.status === 'not-found') {
		return <EmptyState title="Transaction not found" description={`No transaction matches "${hash}".`} />
	}

	const { tx, receipt, timestamp } = state.data
	const status = receipt === null ? 'pending' : receipt.status === 1 ? 'success' : 'failed'

	return (
		<div className="space-y-6 animate-fade-in">
			<div>
				<h1 className="break-all font-mono text-xl font-semibold sm:text-2xl">Transaction</h1>
				<p className="mt-1 break-all font-mono text-sm text-muted-foreground">{tx.hash}</p>
			</div>

			<Card className="divide-y divide-border">
				<Row label="Status">
					<StatusBadge status={status} />
				</Row>
				{tx.blockNumber && (
					<Row label="Block">
						<Link
							to={`/block/${tx.blockNumber}`}
							className="font-mono tabular-nums text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
						>
							{formatNumber(tx.blockNumber)}
						</Link>
					</Row>
				)}
				{timestamp && (
					<Row label="Timestamp">
						{formatAbsoluteTime(timestamp)} ({formatRelativeTime(timestamp)})
					</Row>
				)}
				<Row label="From">
					<HashLink value={tx.from} to={`/address/${tx.from}`} kind="address" chars={10} />
				</Row>
				<Row label="To">
					{tx.to ? (
						<HashLink value={tx.to} to={`/address/${tx.to}`} kind="address" chars={10} />
					) : receipt?.contractAddress ? (
						<span className="inline-flex items-center gap-1.5">
							<FileQuestion className="size-3.5 text-muted-foreground" aria-hidden="true" />
							Contract created:{' '}
							<HashLink value={receipt.contractAddress} to={`/address/${receipt.contractAddress}`} kind="address" chars={8} />
						</span>
					) : (
						<span className="text-muted-foreground">contract creation</span>
					)}
				</Row>
				<Row label="Value">
					<span className="font-mono tabular-nums">{formatSyn(tx.value)} SYN</span>
				</Row>
				<Row label="Gas price">
					<span className="font-mono tabular-nums">{formatGwei(tx.gasPrice)} Gwei</span>
				</Row>
				{receipt && (
					<Row label="Gas used">
						<span className="font-mono tabular-nums">
							{formatNumber(receipt.gasUsed)} / {formatNumber(tx.gasLimit)}
						</span>
					</Row>
				)}
				<Row label="Nonce">{tx.nonce}</Row>
			</Card>

			{tx.data && tx.data !== '0x' && (
				<section>
					<h2 className="mb-2 text-sm font-semibold text-muted-foreground">Input data</h2>
					<Card className="overflow-x-auto p-4">
						<code className="break-all font-mono text-xs">{tx.data}</code>
					</Card>
				</section>
			)}

			{receipt && receipt.logs.length > 0 && (
				<section>
					<h2 className="mb-2 text-sm font-semibold text-muted-foreground">Logs ({receipt.logs.length})</h2>
					<div className="space-y-2">
						{receipt.logs.map((log, i) => (
							<Card key={i} className="p-4 text-xs">
								<div className="mb-1 flex items-center justify-between text-muted-foreground">
									<span>Log {i}</span>
									<HashLink value={log.address} to={`/address/${log.address}`} kind="address" chars={6} />
								</div>
								{log.topics.map((topic, j) => (
									<p key={j} className="break-all font-mono text-muted-foreground">
										topic{j}: {topic}
									</p>
								))}
							</Card>
						))}
					</div>
				</section>
			)}
		</div>
	)
}

function StatusBadge({ status }: { status: 'pending' | 'success' | 'failed' }) {
	if (status === 'pending') {
		return (
			<span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
				<Clock className="size-3.5" aria-hidden="true" />
				Pending
			</span>
		)
	}
	if (status === 'success') {
		return (
			<span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
				<CheckCircle2 className="size-3.5" aria-hidden="true" />
				Success
			</span>
		)
	}
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
			<XCircle className="size-3.5" aria-hidden="true" />
			Failed
		</span>
	)
}

function Row({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
			<span className="w-32 shrink-0 text-sm text-muted-foreground">{label}</span>
			<span className="min-w-0 flex-1 break-all text-sm">{children}</span>
		</div>
	)
}
