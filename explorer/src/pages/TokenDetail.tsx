import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Coins } from 'lucide-react'
import { useAsset, useAssetHolders, useAssetTransfers } from '../api/queries'
import { Address } from '../components/ui/Address'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { StatCard } from '../components/ui/StatCard'
import { Panel } from '../components/ui/Panel'
import { formatTokenAmount } from '../lib/formatToken'

export function TokenDetail() {
  const { id } = useParams()
  const assetId = id !== undefined ? Number(id) : undefined
  const { data: asset, isLoading } = useAsset(assetId)
  const { data: holdersPage } = useAssetHolders(assetId, 50)
  const { data: transfersPage } = useAssetTransfers(assetId, 20)
  const [tab, setTab] = useState<'holders' | 'transfers'>('holders')

  const holders = holdersPage?.holders ?? []
  const transfers = transfersPage?.transfers ?? []

  if (isLoading) {
    return <div className="py-16 text-center text-awz-muted text-xs font-mono">LOADING...</div>
  }

  if (!asset) {
    return <EmptyState message="TOKEN NOT FOUND" code="asset_not_found" />
  }

  const decimals = asset.decimals ?? 0

  return (
    <div className="flex flex-col gap-5">
      <Link to="/tokens" className="inline-flex items-center gap-1.5 text-awz-muted text-xs font-mono hover:text-awz-gold transition-colors w-fit">
        <ArrowLeft size={13} /> Token Registry
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl border-2 bg-awz-gold/10 border-awz-gold/30 flex items-center justify-center flex-shrink-0">
          <Coins size={22} className="text-awz-gold" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-awz-text font-mono truncate">
              {asset.name ?? `Asset #${asset.assetId}`}
            </h1>
            {asset.symbol && (
              <span className="bg-awz-gold/10 text-awz-gold font-mono font-bold text-xs px-2.5 py-1 rounded-md">
                {asset.symbol}
              </span>
            )}
            {asset.isFrozen && <Badge label="Frozen" variant="yellow" />}
          </div>
          <p className="text-awz-muted font-mono text-xs mt-1 flex items-center gap-2 flex-wrap">
            <span>Asset ID: {asset.assetId}</span>
            {asset.owner && (
              <>
                <span className="text-awz-border">·</span>
                <span className="flex items-center gap-1">Owner: <Address value={asset.owner} /></span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Supply" value={formatTokenAmount(asset.totalSupply, decimals)} sub={asset.symbol ?? undefined} />
        <StatCard label="Holders" value={asset.holderCount.toLocaleString()} sub="addresses" />
        <StatCard label="Decimals" value={decimals.toString()} sub="precision" />
        <StatCard label="Created" value={`#${asset.createdBlock.toLocaleString()}`} sub="block" />
      </div>

      <div className="flex gap-1.5">
        {(['holders', 'transfers'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-mono font-semibold capitalize transition-all ${
              tab === t ? 'bg-awz-gold text-black' : 'bg-awz-surface border border-awz-border text-awz-muted hover:text-awz-text hover:border-awz-gold/40'
            }`}
          >
            {t === 'holders' ? `Holders (${asset.holderCount})` : 'Transfers'}
          </button>
        ))}
      </div>

      {tab === 'holders' && (
        holders.length === 0 ? (
          <EmptyState message="NO HOLDERS YET" code="holders_empty" />
        ) : (
          <Panel>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-awz-bg/40 border-b border-awz-border">
                  <th className="px-5 py-2.5 text-left text-awz-muted text-xs font-mono uppercase tracking-widest font-normal">Rank</th>
                  <th className="px-4 py-2.5 text-left text-awz-muted text-xs font-mono uppercase tracking-widest font-normal">Address</th>
                  <th className="px-5 py-2.5 text-right text-awz-muted text-xs font-mono uppercase tracking-widest font-normal">Balance</th>
                </tr>
              </thead>
              <tbody>
                {holders.map((h, i) => (
                  <tr key={h.address} className="border-b border-awz-border last:border-0 hover:bg-awz-gold/5 transition-colors">
                    <td className="px-5 py-3 text-awz-muted font-mono text-sm">{i + 1}</td>
                    <td className="px-4 py-3"><Address value={h.address} /></td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-sm text-awz-text">
                      {formatTokenAmount(h.balance, decimals)}
                      {asset.symbol && <span className="text-awz-muted font-normal ml-1 text-xs">{asset.symbol}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )
      )}

      {tab === 'transfers' && (
        transfers.length === 0 ? (
          <EmptyState message="NO TRANSFERS YET" code="transfers_empty" />
        ) : (
          <Panel>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-awz-bg/40 border-b border-awz-border">
                  <th className="px-5 py-2.5 text-left text-awz-muted text-xs font-mono uppercase tracking-widest font-normal">Block</th>
                  <th className="px-4 py-2.5 text-left text-awz-muted text-xs font-mono uppercase tracking-widest font-normal">From</th>
                  <th className="px-4 py-2.5 text-left text-awz-muted text-xs font-mono uppercase tracking-widest font-normal">To</th>
                  <th className="px-5 py-2.5 text-right text-awz-muted text-xs font-mono uppercase tracking-widest font-normal">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t, i) => (
                  <tr key={i} className="border-b border-awz-border last:border-0 hover:bg-awz-gold/5 transition-colors">
                    <td className="px-5 py-3">
                      <Link to={`/block/${t.blockNumber}`} className="font-mono text-sm text-awz-gold hover:underline">
                        #{t.blockNumber.toLocaleString()}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {t.fromAddress ? <Address value={t.fromAddress} /> : <span className="text-awz-muted text-xs font-mono">Mint</span>}
                    </td>
                    <td className="px-4 py-3">
                      {t.toAddress ? <Address value={t.toAddress} /> : <span className="text-awz-muted text-xs font-mono">Burn</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-sm text-awz-text">
                      {formatTokenAmount(t.amount, decimals)}
                      {asset.symbol && <span className="text-awz-muted font-normal ml-1 text-xs">{asset.symbol}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )
      )}
    </div>
  )
}
