import { Link } from 'react-router-dom'
import { useAssets } from '../api/queries'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { formatTokenAmount } from '../lib/formatToken'

export function Tokens() {
  const { data, isLoading } = useAssets(50)
  const assets = data?.assets ?? []

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-awz-muted text-xs font-mono tracking-widest uppercase">
          TOKEN_REGISTRY
        </span>
        <div className="flex-1 h-px bg-awz-border" />
        {data && (
          <span className="text-awz-green text-xs font-mono">
            {data.total} TOKEN{data.total !== 1 ? 'S' : ''}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="py-16 text-center text-awz-muted text-xs font-mono">LOADING...</div>
      )}

      {!isLoading && assets.length === 0 && (
        <EmptyState message="NO TOKENS CREATED YET" code="assets_empty" />
      )}

      {assets.length > 0 && (
        <div className="border border-awz-border rounded-sm overflow-hidden shadow-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-awz-surface border-b border-awz-border">
                <th className="px-4 py-2 text-left text-awz-muted text-xs font-mono font-normal">TOKEN</th>
                <th className="px-4 py-2 text-left text-awz-muted text-xs font-mono font-normal">SYMBOL</th>
                <th className="px-4 py-2 text-right text-awz-muted text-xs font-mono font-normal">TOTAL SUPPLY</th>
                <th className="px-4 py-2 text-right text-awz-muted text-xs font-mono font-normal">HOLDERS</th>
                <th className="px-4 py-2 text-right text-awz-muted text-xs font-mono font-normal">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.assetId} className="border-b border-awz-border last:border-0 hover:bg-awz-surface/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/tokens/${asset.assetId}`} className="font-mono text-sm text-awz-text hover:text-awz-gold transition-colors">
                      {asset.name ?? `Asset #${asset.assetId}`}
                    </Link>
                    <div className="text-awz-muted text-xs font-mono mt-0.5">ID: {asset.assetId}</div>
                  </td>
                  <td className="px-4 py-3">
                    {asset.symbol ? (
                      <span className="bg-awz-gold/10 text-awz-gold font-mono font-bold text-xs px-2 py-1 rounded-sm">
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
                  <td className="px-4 py-3 text-right">
                    {asset.isFrozen ? <Badge label="Frozen" variant="yellow" /> : <Badge label="Active" variant="green" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
