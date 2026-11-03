import { useParams } from 'react-router-dom'
import { FileCode2, Wallet } from 'lucide-react'
import { useAddress } from '../hooks/useChainData'
import { Card, EmptyState, ErrorState, Skeleton } from '../components/States'
import { formatSyn } from '../lib/format'

export function AddressPage() {
	const { address } = useParams<{ address: string }>()
	const state = useAddress(address ?? '')

	if (state.status === 'loading') {
		return (
			<div className="space-y-3">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-32 w-full" />
			</div>
		)
	}
	if (state.status === 'error') return <ErrorState message={state.message} />
	if (state.status === 'not-found') return <EmptyState title="Address not found" />

	const { balance, nonce, isContract } = state.data

	return (
		<div className="space-y-6 animate-fade-in">
			<div className="flex items-center gap-2">
				{isContract ? (
					<FileCode2 className="size-5 text-muted-foreground" aria-hidden="true" />
				) : (
					<Wallet className="size-5 text-muted-foreground" aria-hidden="true" />
				)}
				<h1 className="text-sm text-muted-foreground">{isContract ? 'Contract' : 'Address'}</h1>
			</div>
			<p className="break-all font-mono text-lg font-semibold sm:text-xl">{address}</p>

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<Card className="p-4">
					<p className="text-xs text-muted-foreground">Balance</p>
					<p className="mt-1 font-mono tabular-nums text-2xl font-semibold">{formatSyn(balance)} SYN</p>
				</Card>
				<Card className="p-4">
					<p className="text-xs text-muted-foreground">Transaction count (nonce)</p>
					<p className="mt-1 font-mono tabular-nums text-2xl font-semibold">{nonce}</p>
				</Card>
			</div>

			<section>
				<h2 className="mb-3 text-sm font-semibold text-muted-foreground">Transaction history</h2>
				<Card>
					<EmptyState
						title="Not available yet"
						description="Per-address transaction history needs an indexer, which this basic explorer doesn't have yet — it can only read live chain state directly. Coming in a later version."
					/>
				</Card>
			</section>
		</div>
	)
}
