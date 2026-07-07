import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TbCube } from 'react-icons/tb'
import { useLiveChainData, useBlocksPage, timeAgo, txHashCache } from '../api/queries'
import { getClient } from '../api/client'
import { getCampaign } from '@awarizon/sdk'

const PAGE_SIZE = 20

function truncHash(h: string, head = 10, tail = 8): string {
  if (!h || h.length < head + tail + 3) return h
  return `${h.slice(0, head)}…${h.slice(-tail)}`
}

// Resolves a 32-byte hash: tries as block hash, then the live tx cache, then a campaign ID.
async function resolveHash(hash: string): Promise<string | null> {
  try {
    const client = await getClient()
    const api = client.getApi()
    const signed = await (api.rpc.chain as any).getBlock(hash)
    const num: number | undefined = signed?.block?.header?.number?.toNumber?.()
    if (num && num > 0) return `/block/${num}`
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

  const { latestBlockNumber, blocks: liveBlocks } = useLiveChainData()

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

  const { data: pageBlocks, isLoading } = useBlocksPage(latestBlockNumber, page, PAGE_SIZE)

  // For page 0, show pre-loaded live blocks while the query fetches the full 20
  const displayBlocks = (page === 0 && (!pageBlocks || pageBlocks.length === 0) && liveBlocks.length > 0)
    ? liveBlocks
    : (pageBlocks ?? [])

  const totalPages = latestBlockNumber > 0 ? Math.ceil(latestBlockNumber / PAGE_SIZE) : 0

  if (hashParam && hashResolving) {
    return (
      <div className="py-24 text-center">
        <TbCube size={36} className="text-awz-gold/30 mx-auto mb-4 animate-pulse" />
        <p className="text-awz-muted text-sm font-mono">Resolving {truncHash(hashParam)}…</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-awz-muted text-xs font-mono tracking-widest uppercase">Latest Blocks</span>
        <div className="flex-1 h-px bg-awz-border" />
        {latestBlockNumber > 0 && (
          <span className="text-awz-gold text-xs font-mono">#{latestBlockNumber.toLocaleString()}</span>
        )}
      </div>

      {hashNotFound && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-awz-surface border border-awz-border text-awz-muted text-xs font-mono">
          Hash <span className="text-awz-text">{truncHash(hashParam ?? '')}</span> not found as a block or recent transaction.
        </div>
      )}

      <div className="border border-awz-border rounded-xl overflow-hidden shadow-lg">
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
              key={b.number}
              className="grid grid-cols-[auto_1fr_64px_100px] gap-4 items-center px-5 py-3.5 border-b border-awz-border last:border-0 hover:bg-awz-gold/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <TbCube size={15} className="text-awz-gold flex-shrink-0" />
                <Link
                  to={`/block/${b.number}`}
                  className="font-mono text-sm font-bold text-awz-gold hover:underline whitespace-nowrap"
                >
                  #{b.number.toLocaleString()}
                </Link>
              </div>
              <span className="font-mono text-sm text-awz-muted truncate">{truncHash(b.hash)}</span>
              <span className="font-mono text-sm text-awz-muted text-right">{b.extrinsicCount}</span>
              <span className="font-mono text-sm text-awz-muted/60 text-right whitespace-nowrap">
                {b.timestamp > 0 ? timeAgo(b.timestamp) : '—'}
              </span>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
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
