import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TbCube } from 'react-icons/tb'
import {
  useIndexerLiveBlocks, useIndexerBlocksPage, useIndexerStats,
  INDEXER_BLOCKS_LIMIT_CAP, timeAgo, txHashCache,
} from '../api/queries'
import type { IndexerBlock } from '../api/indexer'
import { getRecentTransfers } from '../api/indexer'
import { getClient } from '../api/client'
import { getCampaign } from '@awarizon/sdk'
import { Panel, SectionLabel } from '../components/ui/Panel'

const PAGE_SIZE = 20

function truncHash(h: string, head = 10, tail = 8): string {
  if (!h || h.length < head + tail + 3) return h
  return `${h.slice(0, head)}…${h.slice(-tail)}`
}

// Resolves a 32-byte hash to a page, trying the fastest/most authoritative
// sources first:
//  1. Chain RPC — is it a block hash? (works for any block, including ones
//     the indexer hasn't caught up to yet)
//  2. Indexer's recent-transfers feed — is it a transfer's extrinsic hash?
//     Persistent (survives refresh, works across browser sessions), unlike
//     the in-memory txHashCache below, but only covers the most recent
//     window of transfers.
//  3. In-memory tx cache — covers non-transfer extrinsics (or transfers
//     older than the indexer window) seen live in this browser session.
//  4. Campaign ID lookup, as a last resort.
async function resolveHash(hash: string): Promise<string | null> {
  try {
    const client = await getClient()
    const api = client.getApi()
    const signed = await (api.rpc.chain as any).getBlock(hash)
    const num: number | undefined = signed?.block?.header?.number?.toNumber?.()
    if (num !== undefined) return `/block/${num}`
  } catch {}

  try {
    const recent = await getRecentTransfers(100)
    const match = recent.find((t) => t.extrinsicHash === hash)
    if (match) return `/tx/${match.blockNumber}?hash=${encodeURIComponent(hash)}`
  } catch {}

  const cached = txHashCache.get(hash)
  if (cached) return `/tx/${cached.blockNumber}/${cached.index}`

  try {
    const client = await getClient()
    const campaign = await getCampaign(client.getApi(), hash)
    if (campaign) return `/campaigns/${hash}`
  } catch {}

  return null
}

export function Blocks() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [hashResolving, setHashResolving] = useState(false)
  const [hashNotFound, setHashNotFound] = useState(false)

  const { latestBlockNumber, blocks: liveBlocks } = useIndexerLiveBlocks()
  const { data: idxStats } = useIndexerStats()

  const blockParam = searchParams.get('block')
  const hashParam  = searchParams.get('hash')

  // ?block=N → direct navigate to block detail
  useEffect(() => {
    if (!blockParam) return
    const n = parseInt(blockParam, 10)
    if (!isNaN(n)) navigate(`/block/${n}`, { replace: true })
  }, [blockParam, navigate])

  // ?hash=H → try as block hash, then fall back to tx cache
  useEffect(() => {
    if (!hashParam) return
    setHashResolving(true)
    setHashNotFound(false)
    resolveHash(hashParam).then(path => {
      if (path) {
        navigate(path, { replace: true })
      } else {
        setHashResolving(false)
        setHashNotFound(true)
      }
    })
  }, [hashParam, navigate])

  const { data: pageBlocks, isLoading } = useIndexerBlocksPage(page, PAGE_SIZE)

  // For page 0, show the already-seeded, WS-live block list while the paginated query catches up
  const displayBlocks: IndexerBlock[] = (page === 0 && (!pageBlocks || pageBlocks.length === 0) && liveBlocks.length > 0)
    ? liveBlocks
    : (pageBlocks ?? [])

  // The indexer's /blocks endpoint has no offset param — only the first
  // INDEXER_BLOCKS_LIMIT_CAP blocks are reachable via client-side slicing.
  const reachablePages = Math.floor(INDEXER_BLOCKS_LIMIT_CAP / PAGE_SIZE)
  const totalPages = idxStats?.totalBlocks
    ? Math.min(Math.ceil(idxStats.totalBlocks / PAGE_SIZE), reachablePages)
    : 0

  if (hashParam && hashResolving) {
    return (
      <div className="py-24 text-center">
        <TbCube size={36} className="text-awz-gold/30 mx-auto mb-4 animate-pulse" />
        <p className="text-awz-muted text-sm font-mono">Resolving {truncHash(hashParam)}…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionLabel action={
        latestBlockNumber > 0
          ? <span className="text-awz-gold text-xs font-mono whitespace-nowrap">#{latestBlockNumber.toLocaleString()}</span>
          : undefined
      }>
        Latest Blocks
      </SectionLabel>

      {hashNotFound && (
        <div className="px-4 py-3 rounded-lg bg-awz-surface border border-awz-border text-awz-muted text-xs font-mono">
          Hash <span className="text-awz-text">{truncHash(hashParam ?? '')}</span> not found as a block or recent transaction.
        </div>
      )}

      <Panel>
        <div className="grid grid-cols-[auto_1fr_64px_100px] gap-4 px-5 py-2.5 bg-awz-bg/40 border-b border-awz-border">
          <span className="text-awz-muted text-xs font-mono uppercase tracking-widest">Block</span>
          <span className="text-awz-muted text-xs font-mono uppercase tracking-widest">Hash</span>
          <span className="text-awz-muted text-xs font-mono uppercase tracking-widest text-right">Txns</span>
          <span className="text-awz-muted text-xs font-mono uppercase tracking-widest text-right">Age</span>
        </div>

        {isLoading && displayBlocks.length === 0 ? (
          <div className="py-16 text-center text-awz-muted text-xs font-mono">
            <TbCube size={28} className="text-awz-gold/30 mx-auto mb-3 animate-pulse" />
            Loading blocks…
          </div>
        ) : displayBlocks.length === 0 ? (
          <div className="py-16 text-center text-awz-muted text-xs font-mono">Awaiting blocks…</div>
        ) : (
          displayBlocks.map((b) => (
            <div
              key={b.blockNumber}
              className="grid grid-cols-[auto_1fr_64px_100px] gap-4 items-center px-5 py-3.5 border-b border-awz-border last:border-0 hover:bg-awz-gold/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <TbCube size={15} className="text-awz-gold flex-shrink-0" />
                <Link
                  to={`/block/${b.blockNumber}`}
                  className="font-mono text-sm font-bold text-awz-gold hover:underline whitespace-nowrap"
                >
                  #{b.blockNumber.toLocaleString()}
                </Link>
              </div>
              <span className="font-mono text-sm text-awz-muted truncate">{truncHash(b.blockHash)}</span>
              <span className="font-mono text-sm text-awz-muted text-right">{b.extrinsicCount}</span>
              <span className="font-mono text-sm text-awz-muted/60 text-right whitespace-nowrap">
                {b.timestamp != null ? timeAgo(b.timestamp) : '—'}
              </span>
            </div>
          ))
        )}
      </Panel>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-awz-border text-awz-muted text-xs font-mono hover:border-awz-gold hover:text-awz-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} /> Newer
          </button>
          <span className="text-awz-muted text-xs font-mono">Page {page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-awz-border text-awz-muted text-xs font-mono hover:border-awz-gold hover:text-awz-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Older <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
