import { Blocks, Fuel, ListTree, Timer } from 'lucide-react'
import { useLatestBlocks, useNetworkStats } from '../hooks/useChainData'
import { StatCard } from '../components/StatCard'
import { BlocksTable } from '../components/BlocksTable'
import { TransactionsTable } from '../components/TransactionsTable'
import { TableSkeleton, ErrorState } from '../components/States'
import { Hero } from '../components/Hero'
import { formatGwei, formatNumber } from '../lib/format'
import { chainConfig } from '../lib/chain'

const LATEST_BLOCKS_COUNT = 10
const LATEST_TX_COUNT = 10

export function Home() {
	const blocksState = useLatestBlocks(LATEST_BLOCKS_COUNT)
	const statsState = useNetworkStats()

	const blocks = blocksState.status === 'ready' ? blocksState.data : []
	const timestamps = new Map(blocks.map((b) => [b.number, b.timestamp]))
	const latestTxs = blocks.flatMap((b) => b.prefetchedTransactions).slice(0, LATEST_TX_COUNT)

	return (
		<div className="animate-fade-in">
			<Hero />

			<div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
				<StatCard
					label="Latest block"
					icon={<Blocks className="size-4.5" />}
					loading={statsState.status === 'loading'}
					value={statsState.status === 'ready' ? formatNumber(statsState.data.blockNumber) : '--'}
				/>
				<StatCard
					label="Block time"
					icon={<Timer className="size-4.5" />}
					loading={statsState.status === 'loading'}
					value={
						statsState.status === 'ready' && statsState.data.avgBlockTimeSec !== null
							? `~${statsState.data.avgBlockTimeSec.toFixed(1)}s`
							: '--'
					}
				/>
				<StatCard
					label="Gas price"
					icon={<Fuel className="size-4.5" />}
					loading={statsState.status === 'loading'}
					value={statsState.status === 'ready' ? `${formatGwei(statsState.data.gasPrice)} Gwei` : '--'}
				/>
				<StatCard label="Chain ID" icon={<ListTree className="size-4.5" />} value={chainConfig.chainId} />
			</div>

			<section aria-labelledby="latest-blocks-heading" className="mt-8">
				<h2 id="latest-blocks-heading" className="mb-3 text-sm font-semibold text-muted-foreground">
					Latest blocks
				</h2>
				{blocksState.status === 'loading' && <TableSkeleton />}
				{blocksState.status === 'error' && <ErrorState message={blocksState.message} />}
				{blocksState.status === 'ready' && <BlocksTable blocks={blocks} />}
			</section>

			<section aria-labelledby="latest-txs-heading" className="mt-8">
				<h2 id="latest-txs-heading" className="mb-3 text-sm font-semibold text-muted-foreground">
					Latest transactions
				</h2>
				{blocksState.status === 'loading' && <TableSkeleton />}
				{blocksState.status === 'error' && <ErrorState message={blocksState.message} />}
				{blocksState.status === 'ready' && <TransactionsTable transactions={latestTxs} timestamps={timestamps} />}
			</section>
		</div>
	)
}
