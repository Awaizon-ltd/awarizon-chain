import type { Block } from 'ethers'
import { Link } from 'react-router-dom'
import { Card, EmptyState } from './States'
import { HashLink } from './HashLink'
import { formatNumber, formatRelativeTime } from '../lib/format'

export function BlocksTable({ blocks }: { blocks: Block[] }) {
	if (blocks.length === 0) {
		return (
			<Card>
				<EmptyState title="No blocks yet" description="Blocks will appear here as soon as the chain produces one." />
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
								Block
							</th>
							<th scope="col" className="px-4 py-2.5 font-medium">
								Age
							</th>
							<th scope="col" className="px-4 py-2.5 font-medium">
								Txns
							</th>
							<th scope="col" className="px-4 py-2.5 font-medium">
								Gas used
							</th>
							<th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">
								Hash
							</th>
						</tr>
					</thead>
					<tbody>
						{blocks.map((block) => (
							<tr key={block.hash ?? block.number} className="border-b border-border last:border-0 hover:bg-muted/50">
								<td className="px-4 py-2.5">
									<Link
										to={`/block/${block.number}`}
										className="font-mono tabular-nums font-medium text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
									>
										{formatNumber(block.number)}
									</Link>
								</td>
								<td className="px-4 py-2.5 text-muted-foreground">{formatRelativeTime(block.timestamp)}</td>
								<td className="px-4 py-2.5 tabular-nums">{block.transactions.length}</td>
								<td className="px-4 py-2.5 font-mono tabular-nums text-muted-foreground">{formatNumber(block.gasUsed)}</td>
								<td className="hidden px-4 py-2.5 md:table-cell">
									{block.hash && <HashLink value={block.hash} to={`/block/${block.hash}`} kind="hash" />}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Card>
	)
}
