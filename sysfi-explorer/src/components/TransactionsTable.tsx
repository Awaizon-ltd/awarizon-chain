import type { TransactionResponse } from 'ethers'
import { ArrowRight, FileQuestion } from 'lucide-react'
import { Card, EmptyState } from './States'
import { HashLink } from './HashLink'
import { formatRelativeTime, formatSyn } from '../lib/format'

export function TransactionsTable({
	transactions,
	timestamps,
}: {
	transactions: TransactionResponse[]
	/** blockNumber -> timestamp, so a page rendering many blocks' txs together only needs one lookup per row */
	timestamps: Map<number, number>
}) {
	if (transactions.length === 0) {
		return (
			<Card>
				<EmptyState
					title="No transactions yet"
					description="Once wallets start transacting on SysFi, they'll show up here."
				/>
			</Card>
		)
	}

	return (
		<Card className="overflow-hidden">
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead className="border-b border-border text-left text-xs text-muted-foreground">
						<tr>
							<th scope="col" className="px-4 py-2.5 font-medium">
								Hash
							</th>
							<th scope="col" className="px-4 py-2.5 font-medium">
								Age
							</th>
							<th scope="col" className="px-4 py-2.5 font-medium">
								From / To
							</th>
							<th scope="col" className="px-4 py-2.5 text-right font-medium">
								Value
							</th>
						</tr>
					</thead>
					<tbody>
						{transactions.map((tx) => (
							<tr key={tx.hash} className="border-b border-border last:border-0 hover:bg-muted/50">
								<td className="px-4 py-2.5">
									<HashLink value={tx.hash} to={`/tx/${tx.hash}`} kind="hash" chars={6} />
								</td>
								<td className="px-4 py-2.5 text-muted-foreground">
									{tx.blockNumber ? formatRelativeTime(timestamps.get(tx.blockNumber)) : 'pending'}
								</td>
								<td className="px-4 py-2.5">
									<div className="flex items-center gap-1.5 text-xs">
										<HashLink value={tx.from} to={`/address/${tx.from}`} kind="address" chars={4} mono />
										<ArrowRight className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
										{tx.to ? (
											<HashLink value={tx.to} to={`/address/${tx.to}`} kind="address" chars={4} mono />
										) : (
											<span className="inline-flex items-center gap-1 text-muted-foreground">
												<FileQuestion className="size-3" aria-hidden="true" />
												contract creation
											</span>
										)}
									</div>
								</td>
								<td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatSyn(tx.value)} SYN</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Card>
	)
}
