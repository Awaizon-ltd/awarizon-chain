import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useNftCollections, useNftRankings, useNftEvents } from '../api/queries'
import { EmptyState } from '../components/ui/EmptyState'
import { formatRizAmountStr } from '../lib/formatRiz'

function hasVolume(v: string | null): boolean {
  if (!v) return false
  try { return BigInt(v) > 0n } catch { return false }
}

const EVENT_LABELS: Record<string, string> = {
  mint: 'Minted',
  transfer: 'Transferred',
  list: 'Listed',
  delist: 'Delisted',
  sale: 'Sold',
  burn: 'Burned',
  create: 'Collection Created',
  destroy: 'Collection Destroyed',
  owner_changed: 'Owner Changed',
}

const EVENT_COLORS: Record<string, string> = {
  mint: 'text-awz-green',
  transfer: 'text-blue-400',
  list: 'text-awz-gold',
  delist: 'text-awz-muted',
  sale: 'text-purple-400',
  burn: 'text-awz-red',
  create: 'text-awz-gold',
  destroy: 'text-awz-red',
  owner_changed: 'text-awz-muted',
}

function NftActivity() {
  const { data, isLoading } = useNftEvents(30)
  const events = data?.events ?? []

  if (isLoading) {
    return <div className="py-16 text-center text-awz-muted text-xs font-mono">LOADING...</div>
  }
  if (events.length === 0) {
    return <EmptyState message="NO NFT ACTIVITY YET" code="nft_activity_empty" />
  }

  return (
    <div className="border border-awz-border rounded-sm overflow-hidden shadow-lg">
      {events.map((e, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-awz-border last:border-0 hover:bg-awz-surface/40 transition-colors"
        >
          <span className={`text-sm font-bold font-mono w-32 flex-shrink-0 ${EVENT_COLORS[e.eventType] ?? 'text-awz-text'}`}>
            {EVENT_LABELS[e.eventType] ?? e.eventType}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-sm text-awz-text truncate">
              {e.itemId !== null ? `Item #${e.itemId} · Collection #${e.collectionId}` : `Collection #${e.collectionId}`}
            </p>
            {e.fromAddress && (
              <p className="text-awz-muted text-xs font-mono truncate">
                {e.fromAddress}
                {e.toAddress ? ` → ${e.toAddress}` : ''}
              </p>
            )}
          </div>
          {hasVolume(e.price) && (
            <span className="text-awz-gold font-bold font-mono text-sm flex-shrink-0">
              {formatRizAmountStr(e.price as string)} RIZ
            </span>
          )}
          <Link to={`/block/${e.blockNumber}`} className="text-awz-muted font-mono text-xs hover:text-awz-gold flex-shrink-0 hidden sm:block">
            #{e.blockNumber.toLocaleString()}
          </Link>
        </div>
      ))}
    </div>
  )
}

export function NFTs() {
  const { data: colData, isLoading: colLoading } = useNftCollections(50)
  const { data: rankData, isLoading: rankLoading } = useNftRankings(10)
  const [tab, setTab] = useState<'collections' | 'rankings' | 'activity'>('collections')

  const collections = colData?.collections ?? []
  const rankings = rankData?.rankings ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-awz-muted text-xs font-mono tracking-widest uppercase">NFT_MARKETPLACE</span>
        <div className="flex-1 h-px bg-awz-border" />
        {colData && (
          <span className="text-awz-green text-xs font-mono">
            {colData.total} COLLECTION{colData.total !== 1 ? 'S' : ''}
          </span>
        )}
        <a
          href="https://rizart.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-awz-gold hover:bg-awz-gold-dim text-black font-bold text-xs px-3 py-1.5 rounded-sm transition-all font-mono"
        >
          Open RizArt ↗
        </a>
      </div>

      <div className="flex gap-2">
        {([
          { key: 'collections', label: 'Collections' },
          { key: 'rankings', label: 'Rankings' },
          { key: 'activity', label: 'Activity' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-sm text-sm font-mono font-semibold transition-all ${
              tab === t.key ? 'bg-awz-gold text-black' : 'bg-awz-surface text-awz-muted hover:text-awz-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'collections' && (
        colLoading ? (
          <div className="py-16 text-center text-awz-muted text-xs font-mono">LOADING...</div>
        ) : collections.length === 0 ? (
          <EmptyState message="NO NFT COLLECTIONS YET" code="nft_collections_empty" />
        ) : (
          <div className="border border-awz-border rounded-sm overflow-hidden shadow-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-awz-surface border-b border-awz-border">
                  <th className="px-4 py-2 text-left text-awz-muted text-xs font-mono font-normal">COLLECTION</th>
                  <th className="px-4 py-2 text-right text-awz-muted text-xs font-mono font-normal">ITEMS</th>
                  <th className="px-4 py-2 text-right text-awz-muted text-xs font-mono font-normal">FLOOR</th>
                  <th className="px-4 py-2 text-right text-awz-muted text-xs font-mono font-normal">VOLUME</th>
                </tr>
              </thead>
              <tbody>
                {collections.map((c) => (
                  <tr key={c.collectionId} className="border-b border-awz-border last:border-0 hover:bg-awz-surface/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {c.imageUrl && <img src={c.imageUrl} alt="" className="w-8 h-8 rounded-sm object-cover flex-shrink-0" />}
                        <div>
                          <p className="font-semibold text-awz-text text-sm">{c.name ?? `Collection #${c.collectionId}`}</p>
                          <p className="text-awz-muted text-xs font-mono">#{c.collectionId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-sm text-awz-text">
                      {c.totalItems.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-awz-gold">
                      {hasVolume(c.floorPrice) ? `${formatRizAmountStr(c.floorPrice as string)} RIZ` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-sm text-awz-text">
                      {hasVolume(c.totalVolume) ? `${formatRizAmountStr(c.totalVolume)} RIZ` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'rankings' && (
        rankLoading ? (
          <div className="py-16 text-center text-awz-muted text-xs font-mono">LOADING...</div>
        ) : rankings.length === 0 ? (
          <EmptyState message="NO COLLECTIONS RANKED YET" code="nft_rankings_empty" />
        ) : (
          <div className="border border-awz-border rounded-sm overflow-hidden shadow-lg">
            {rankings.map((r) => (
              <div key={r.collectionId} className="flex items-center gap-4 px-4 py-3 border-b border-awz-border last:border-0 hover:bg-awz-surface/40 transition-colors">
                <span className="text-awz-muted font-black font-mono w-6 text-sm flex-shrink-0">#{r.rank}</span>
                {r.imageUrl && <img src={r.imageUrl} alt="" className="w-8 h-8 rounded-sm object-cover flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-awz-text text-sm truncate">{r.name ?? `Collection #${r.collectionId}`}</p>
                  <p className="text-awz-muted text-xs font-mono">{r.totalItems} items · {r.uniqueOwners} owners</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm text-awz-gold font-mono">
                    {hasVolume(r.totalVolume) ? `${formatRizAmountStr(r.totalVolume)} RIZ` : '—'}
                  </p>
                  <p className="text-awz-muted text-xs">volume</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'activity' && <NftActivity />}
    </div>
  )
}
