import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Hash as HashIcon, Layers, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { TbCube, TbArrowsExchange, TbBolt } from 'react-icons/tb'
import { getClient } from '../api/client'

/* ── types ─────────────────────────────────────────────────────── */
interface ExtInfo {
  index: number
  hash: string
  section: string
  method: string
  isSigned: boolean
  signer?: string
}

interface BlockData {
  number: number
  hash: string
  parentHash: string
  stateRoot: string
  extrinsicsRoot: string
  extrinsics: ExtInfo[]
  timestamp: number
}

/* ── helpers ────────────────────────────────────────────────────── */
function truncHash(h: string, head = 12, tail = 8): string {
  if (!h || h.length < head + tail + 3) return h
  return `${h.slice(0, head)}…${h.slice(-tail)}`
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

function fmtDate(ts: number): string {
  if (!ts) return '—'
  return new Date(ts).toUTCString()
}

/* ── sub-components ─────────────────────────────────────────────── */
function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="bg-awz-surface border border-awz-border rounded-xl overflow-hidden shadow-lg">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-awz-border">
        <span className="text-awz-gold">{icon}</span>
        <span className="text-xs font-mono uppercase tracking-widest text-awz-muted">{title}</span>
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6 px-5 py-3.5 border-b border-awz-border last:border-0">
      <span className="text-awz-muted text-xs font-mono uppercase tracking-widest min-w-[180px] flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-awz-text text-sm font-mono break-all leading-relaxed">
        {value}
      </span>
    </div>
  )
}

/* ── page ────────────────────────────────────────────────────────── */
export function BlockDetail() {
  const { number = '' } = useParams<{ number: string }>()
  const blockNum = parseInt(number, 10)

  const [data, setData] = useState<BlockData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNaN(blockNum)) {
      setError('Invalid block number')
      setLoading(false)
      return
    }

    let mounted = true
    setLoading(true)
    setError(null)
    setData(null)

    getClient()
      .then(async (client) => {
        const api = client.getApi()
        const blockHash = await (api.rpc.chain as any).getBlockHash(blockNum)
        if (!blockHash || blockHash.isEmpty) throw new Error('Block not found')

        const [signedBlock, ts] = await Promise.all([
          (api.rpc.chain as any).getBlock(blockHash),
          (api.query as any).timestamp?.now?.at?.(blockHash).catch(() => null),
        ])

        const header = signedBlock.block.header
        const exts: ExtInfo[] = Array.from(signedBlock.block.extrinsics as any[]).map(
          (ext: any, i: number) => ({
            index: i,
            hash: ext.hash?.toHex?.() ?? '0x',
            section: ext.method?.section ?? 'unknown',
            method: ext.method?.method ?? 'unknown',
            isSigned: Boolean(ext.isSigned),
            signer: ext.isSigned ? ext.signer?.toString?.() : undefined,
          })
        )

        if (mounted) {
          setData({
            number: blockNum,
            hash: blockHash.toHex(),
            parentHash: header.parentHash?.toHex?.() ?? '—',
            stateRoot: header.stateRoot?.toHex?.() ?? '—',
            extrinsicsRoot: header.extrinsicsRoot?.toHex?.() ?? '—',
            extrinsics: exts,
            timestamp: ts ? Number(ts.toString()) : 0,
          })
          setLoading(false)
        }
      })
      .catch((e: Error) => {
        if (mounted) {
          setError(e?.message ?? 'Failed to load block')
          setLoading(false)
        }
      })

    return () => { mounted = false }
  }, [blockNum])

  /* ── loading ── */
  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-awz-muted text-xs font-mono hover:text-awz-gold transition-colors w-fit">
          <ArrowLeft size={14} /> OVERVIEW
        </Link>
        <div className="py-24 text-center">
          <TbCube size={36} className="text-awz-gold/30 mx-auto mb-4 animate-pulse" />
          <p className="text-awz-muted text-sm font-mono animate-pulse">LOADING BLOCK #{number}…</p>
        </div>
      </div>
    )
  }

  /* ── error ── */
  if (error || !data) {
    return (
      <div className="flex flex-col gap-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-awz-muted text-xs font-mono hover:text-awz-gold transition-colors w-fit">
          <ArrowLeft size={14} /> OVERVIEW
        </Link>
        <div className="bg-awz-surface border border-awz-border rounded-xl p-12 text-center shadow-lg">
          <TbCube size={44} className="text-awz-muted/20 mx-auto mb-4" />
          <p className="text-awz-muted font-mono text-sm">{error ?? 'Block not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* breadcrumb */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/" className="inline-flex items-center gap-1.5 text-awz-muted text-xs font-mono hover:text-awz-gold transition-colors">
          <ArrowLeft size={13} /> OVERVIEW
        </Link>
        <span className="text-awz-border">›</span>
        <span className="text-awz-muted text-xs font-mono">BLOCK</span>
        <span className="text-awz-text text-xs font-mono font-semibold">#{data.number.toLocaleString()}</span>
      </div>

      {/* title row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-awz-gold/10 border border-awz-gold/20 flex items-center justify-center flex-shrink-0">
            <TbCube size={22} className="text-awz-gold" />
          </div>
          <div>
            <h1 className="text-awz-text font-mono font-bold text-2xl">
              Block <span className="text-awz-gold">#{data.number.toLocaleString()}</span>
            </h1>
            {data.timestamp > 0 && (
              <p className="text-awz-muted text-xs font-mono mt-0.5">
                {fmtDate(data.timestamp)} &middot; {timeAgo(data.timestamp)}
              </p>
            )}
          </div>
        </div>

        {/* prev / next nav */}
        <div className="flex items-center gap-2">
          {data.number > 0 && (
            <Link
              to={`/block/${data.number - 1}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-awz-border text-awz-muted text-xs font-mono hover:border-awz-gold hover:text-awz-gold transition-colors"
            >
              <ChevronLeft size={14} /> Prev
            </Link>
          )}
          <Link
            to={`/block/${data.number + 1}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-awz-border text-awz-muted text-xs font-mono hover:border-awz-gold hover:text-awz-gold transition-colors"
          >
            Next <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* summary stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Block Height', value: `#${data.number.toLocaleString()}` },
          { label: 'Extrinsics', value: String(data.extrinsics.length) },
          { label: 'Signed Txns', value: String(data.extrinsics.filter(e => e.isSigned).length) },
          { label: 'Time', value: data.timestamp > 0 ? timeAgo(data.timestamp) : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-awz-surface border border-awz-border rounded-xl p-4 flex flex-col gap-1 shadow-lg">
            <span className="text-awz-muted text-[10px] font-mono uppercase tracking-widest">{label}</span>
            <span className="text-awz-text text-xl font-mono font-semibold leading-tight">{value}</span>
          </div>
        ))}
      </div>

      {/* block details */}
      <Section icon={<HashIcon size={16} />} title="Block Details">
        <InfoRow label="Block Hash" value={
          <span className="text-awz-green">{data.hash}</span>
        } />
        <InfoRow label="Parent Hash" value={
          data.number > 0
            ? <Link to={`/block/${data.number - 1}`} className="text-awz-green hover:underline">{data.parentHash}</Link>
            : <span className="text-awz-muted">{data.parentHash}</span>
        } />
        <InfoRow label="State Root" value={
          <span className="text-awz-muted/70">{data.stateRoot}</span>
        } />
        <InfoRow label="Extrinsics Root" value={
          <span className="text-awz-muted/70">{data.extrinsicsRoot}</span>
        } />
        {data.timestamp > 0 && (
          <InfoRow label="Timestamp" value={
            <span className="flex items-center gap-2">
              <Clock size={13} className="text-awz-muted/60 flex-shrink-0" />
              {fmtDate(data.timestamp)}
            </span>
          } />
        )}
      </Section>

      {/* extrinsics table */}
      <Section icon={<Layers size={16} />} title={`Extrinsics (${data.extrinsics.length})`}>
        {data.extrinsics.length === 0 ? (
          <div className="py-10 text-center text-awz-muted text-sm font-mono">
            No extrinsics in this block
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* header */}
            <div className="hidden sm:grid grid-cols-[48px_90px_1fr_1fr_60px] gap-4 px-5 py-2.5 border-b border-awz-border bg-awz-bg/40">
              {['Idx', 'Type', 'Call', 'Hash', 'Signed'].map((h) => (
                <span key={h} className="text-awz-muted text-[11px] font-mono uppercase tracking-wider">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-awz-border">
              {data.extrinsics.map((ext) => (
                <div
                  key={ext.index}
                  className="grid grid-cols-1 sm:grid-cols-[48px_90px_1fr_1fr_60px] gap-2 sm:gap-4 px-5 py-3.5 hover:bg-awz-gold/5 transition-colors"
                >
                  {/* index */}
                  <span className="text-awz-muted text-sm font-mono sm:hidden">
                    <span className="text-awz-muted/50">IDX </span>{ext.index}
                  </span>
                  <span className="text-awz-muted text-sm font-mono hidden sm:block">{ext.index}</span>

                  {/* type badge */}
                  <span className="flex items-center gap-1.5">
                    {ext.isSigned ? (
                      <>
                        <TbArrowsExchange size={14} className="text-awz-gold" />
                        <span className="text-awz-gold text-xs font-mono">signed</span>
                      </>
                    ) : (
                      <>
                        <TbBolt size={14} className="text-awz-muted/60" />
                        <span className="text-awz-muted/60 text-xs font-mono">unsigned</span>
                      </>
                    )}
                  </span>

                  {/* call + signer */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-mono">
                      <span className="text-awz-text">{ext.section}.</span>
                      <span className="text-awz-gold font-semibold">{ext.method}</span>
                    </span>
                    {ext.signer && (
                      <span className="text-awz-muted text-xs font-mono truncate">{truncHash(ext.signer, 14, 10)}</span>
                    )}
                  </div>

                  {/* hash link */}
                  <Link
                    to={`/tx/${data.number}/${ext.index}`}
                    className="text-awz-green text-sm font-mono hover:underline truncate"
                  >
                    {truncHash(ext.hash)}
                  </Link>

                  {/* signed badge */}
                  <span className={`text-xs font-mono font-semibold ${ext.isSigned ? 'text-awz-gold' : 'text-awz-muted/40'}`}>
                    {ext.isSigned ? '✓ YES' : 'NO'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

    </div>
  )
}
