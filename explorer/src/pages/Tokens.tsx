import { Link } from 'react-router-dom'
import { Coins } from 'lucide-react'
import { useAssets } from '../api/queries'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { Panel, SectionLabel } from '../components/ui/Panel'
import { formatTokenAmount } from '../lib/formatToken'

export function Tokens() {
  const { data, isLoading } = useAssets(50)
  const assets = data?.assets ?? []

  return (
    <div className="flex flex-col gap-4">
      <SectionLabel action={
        data
          ? <span className="inline-flex items-center gap-1.5 text-awz-gold text-xs font-mono whitespace-nowrap">
              <Coins size={12} /> {data.total} token{data.total !== 1 ? 's' : ''}
            </span>
          : undefined
      }>
        Token Registry
      </SectionLabel>

      {isLoading && (
        <div className="py-16 text-center text-awz-muted text-xs font-mono">LOADING...</div>
      )}

      {!isLoading && assets.length === 0 && (
        <EmptyState message="NO TOKENS CREATED YET" code="assets_empty" />
      )}

      {assets.length > 0 && (
        <Panel>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-awz-bg/40 border-b border-awz-border">
                <th className="px-5 py-2.5 text-left text-awz-muted text-xs font-mono uppercase tracking-widest font-normal">Token</th>
                <th className="px-4 py-2.5 text-left text-awz-muted text-xs font-mono uppercase tracking-widest font-normal">Symbol</th>
                <th className="px-4 py-2.5 text-right text-awz-muted text-xs font-mono uppercase tracking-widest font-normal">Total Supply</th>
                <th className="px-4 py-2.5 text-right text-awz-muted text-xs font-mono uppercase tracking-widest font-normal">Holders</th>
                <th className="px-5 py-2.5 text-right text-awz-muted text-xs font-mono uppercase tracking-widest font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.assetId} className="border-b border-awz-border last:border-0 hover:bg-awz-gold/5 transition-colors">
                  <td className="px-5 py-3">
                    <Link to={`/tokens/${asset.assetId}`} className="font-mono text-sm text-awz-text hover:text-awz-gold transition-colors">
                      {asset.name ?? `Asset #${asset.assetId}`}
                    </Link>
                    <div className="text-awz-muted text-xs font-mono mt-0.5">ID: {asset.assetId}</div>
                  </td>
                  <td className="px-4 py-3">
                    {asset.symbol ? (
                      <span className="bg-awz-gold/10 text-awz-gold font-mono font-bold text-xs px-2 py-1 rounded-md">
                        {asset.symbol}
                      </span>
                    ) : (
                      <span className="text-awz-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-mono text-sm text-awz-text">{formatTokenAmount(asset.totalSupply, asset.decimals)}</div>
                    <div className="text-awz-muted text-xs font-mono">{asset.decimals} decimals</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-sm text-awz-text">
                    {asset.holderCount.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {asset.isFrozen ? <Badge label="Frozen" variant="yellow" /> : <Badge label="Active" variant="green" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  )
}
