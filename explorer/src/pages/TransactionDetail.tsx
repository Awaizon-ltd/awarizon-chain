import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Hash as HashIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { TbArrowsExchange, TbBolt, TbCube, TbCircleCheck } from 'react-icons/tb'
import { getClient } from '../api/client'

/* ── types ─────────────────────────────────────────────────────── */
interface TxData {
  blockNumber: number
  blockHash: string
  index: number
  hash: string
  section: string
  method: string
  isSigned: boolean
  signer?: string
  args: string
  timestamp: number
  totalInBlock: number
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

function safeJson(v: unknown): string {
  try { return JSON.stringify(v, null, 2) } catch { return String(v) }
}

/* ── sub-components ─────────────────────────────────────────────── */
function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="bg-awz-surface border border-awz-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-awz-border">
        <span className="text-awz-gold">{icon}</span>
        <span className="text-xs font-mono uppercase tracking-widest text-awz-muted">{title}</span>
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value, copyable }: { label: string; value: ReactNode; copyable?: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-6 px-5 py-3.5 border-b border-awz-border last:border-0 group">
      <span className="text-awz-muted text-xs font-mono uppercase tracking-widest min-w-[180px] flex-shrink-0 pt-0.5">
        {label}
      </span>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="text-awz-text text-sm font-mono break-all leading-relaxed flex-1">
          {value}
        </span>
        {copyable && (
          <button
            onClick={() => navigator.clipboard.writeText(copyable)}
            className="text-awz-muted/40 hover:text-awz-gold transition-colors text-xs font-mono flex-shrink-0 opacity-0 group-hover:opacity-100 mt-0.5"
            title="Copy"
          >
            copy
          </button>
        )}
      </div>
    </div>
  )
}

/* ── page ────────────────────────────────────────────────────────── */
export function TransactionDetail() {
  const { blockNumber = '', index = '' } = useParams<{ blockNumber: string; index: string }>()
  const blockNum = parseInt(blockNumber, 10)
  const extIdx = parseInt(index, 10)

  const [data, setData] = useState<TxData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNaN(blockNum) || isNaN(extIdx)) {
      setError('Invalid block number or index')
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

        const exts: any[] = Array.from(signedBlock.block.extrinsics)
        if (extIdx >= exts.length) {
          throw new Error(`Extrinsic #${extIdx} not found in block #${blockNum} (${exts.length} total)`)
        }

        const ext = exts[extIdx]
        let argsStr = '—'
        try { argsStr = safeJson(ext.method?.args?.toJSON?.()) } catch {}

        if (mounted) {
          setData({
            blockNumber: blockNum,
            blockHash: blockHash.toHex(),
            index: extIdx,
            hash: ext.hash?.toHex?.() ?? '0x',
            section: ext.method?.section ?? 'unknown',
            method: ext.method?.method ?? 'unknown',
            isSigned: Boolean(ext.isSigned),
            signer: ext.isSigned ? ext.signer?.toString?.() : undefined,
            args: argsStr,
            timestamp: ts ? Number(ts.toString()) : 0,
            totalInBlock: exts.length,
          })
          setLoading(false)
        }
      })
      .catch((e: Error) => {
        if (mounted) {
          setError(e?.message ?? 'Failed to load transaction')
          setLoading(false)
        }
      })

    return () => { mounted = false }
  }, [blockNum, extIdx])

  /* ── loading ── */
  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-awz-muted text-xs font-mono hover:text-awz-gold transition-colors w-fit">
          <ArrowLeft size={14} /> OVERVIEW
        </Link>
        <div className="py-24 text-center">
          <TbArrowsExchange size={36} className="text-awz-gold/30 mx-auto mb-4 animate-pulse" />
          <p className="text-awz-muted text-sm font-mono animate-pulse">
            LOADING TX #{blockNumber}/{index}…
          </p>
        </div>
      </div>
    )
  }

  /* ── error ── */
  if (error || !data) {
    return (
      <div className="flex flex-col gap-6">
        <Link to={`/block/${blockNumber}`} className="inline-flex items-center gap-1.5 text-awz-muted text-xs font-mono hover:text-awz-gold transition-colors w-fit">
          <ArrowLeft size={14} /> BLOCK #{blockNumber}
        </Link>
        <div className="bg-awz-surface border border-awz-border rounded-xl p-12 text-center">
          <TbArrowsExchange size={44} className="text-awz-muted/20 mx-auto mb-4" />
          <p className="text-awz-muted font-mono text-sm">{error ?? 'Transaction not found'}</p>
        </div>
      </div>
    )
  }

  const prevIdx = data.index > 0 ? data.index - 1 : null
  const nextIdx = data.index < data.totalInBlock - 1 ? data.index + 1 : null

  return (
    <div className="flex flex-col gap-6">

      {/* breadcrumb */}
      <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
        <Link to="/" className="text-awz-muted hover:text-awz-gold transition-colors flex items-center gap-1">
          <ArrowLeft size={13} /> OVERVIEW
        </Link>
        <span className="text-awz-border">›</span>
        <Link to={`/block/${data.blockNumber}`} className="text-awz-muted hover:text-awz-gold transition-colors flex items-center gap-1">
          <TbCube size={13} /> BLOCK #{data.blockNumber.toLocaleString()}
        </Link>
        <span className="text-awz-border">›</span>
        <span className="text-awz-text font-semibold">TX #{data.index}</span>
      </div>

      {/* title row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${
            data.isSigned
              ? 'bg-awz-gold/10 border-awz-gold/20'
              : 'bg-awz-surface border-awz-border'
          }`}>
            {data.isSigned
              ? <TbArrowsExchange size={22} className="text-awz-gold" />
              : <TbBolt size={22} className="text-awz-muted" />
            }
          </div>
          <div>
            <h1 className="text-awz-text font-mono font-bold text-2xl">
              <span className="text-awz-gold">{data.section}</span>
              <span className="text-awz-muted">.</span>
              {data.method}
            </h1>
            <p className="text-awz-muted text-xs font-mono mt-0.5">
              {data.isSigned ? 'Signed extrinsic' : 'Unsigned extrinsic'} · Index {data.index} of {data.totalInBlock}
              {data.timestamp > 0 && <> · {timeAgo(data.timestamp)}</>}
            </p>
          </div>
        </div>

        {/* prev / next in same block */}
        <div className="flex items-center gap-2">
          {prevIdx !== null && (
            <Link
              to={`/tx/${data.blockNumber}/${prevIdx}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-awz-border text-awz-muted text-xs font-mono hover:border-awz-gold hover:text-awz-gold transition-colors"
            >
              <ChevronLeft size={14} /> Prev Tx
            </Link>
          )}
          {nextIdx !== null && (
            <Link
              to={`/tx/${data.blockNumber}/${nextIdx}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-awz-border text-awz-muted text-xs font-mono hover:border-awz-gold hover:text-awz-gold transition-colors"
            >
              Next Tx <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* summary stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Block', value: `#${data.blockNumber.toLocaleString()}`, link: `/block/${data.blockNumber}` },
          { label: 'Index', value: String(data.index), link: undefined },
          { label: 'Type', value: data.isSigned ? 'Signed' : 'Unsigned', link: undefined },
          { label: 'Time', value: data.timestamp > 0 ? timeAgo(data.timestamp) : '—', link: undefined },
        ].map(({ label, value, link }) => (
          <div key={label} className="bg-awz-surface border border-awz-border rounded-xl p-4 flex flex-col gap-1">
            <span className="text-awz-muted text-[10px] font-mono uppercase tracking-widest">{label}</span>
            {link
              ? <Link to={link} className="text-awz-gold text-xl font-mono font-semibold leading-tight hover:underline">{value}</Link>
              : <span className="text-awz-text text-xl font-mono font-semibold leading-tight">{value}</span>
            }
          </div>
        ))}
      </div>

      {/* transaction details */}
      <Section icon={<HashIcon size={16} />} title="Transaction Details">
        <InfoRow
          label="Extrinsic Hash"
          value={<span className="text-awz-green">{data.hash}</span>}
          copyable={data.hash}
        />
        <InfoRow
          label="Block Hash"
          value={
            <Link to={`/block/${data.blockNumber}`} className="text-awz-green hover:underline">
              {data.blockHash}
            </Link>
          }
          copyable={data.blockHash}
        />
        <InfoRow
          label="Block Number"
          value={
            <Link to={`/block/${data.blockNumber}`} className="text-awz-gold hover:underline">
              #{data.blockNumber.toLocaleString()}
            </Link>
          }
        />
        <InfoRow label="Extrinsic Index" value={String(data.index)} />
        <InfoRow
          label="Call"
          value={
            <span>
              <span className="text-awz-text">{data.section}.</span>
              <span className="text-awz-gold font-semibold">{data.method}</span>
            </span>
          }
        />
        <InfoRow
          label="Signed"
          value={
            data.isSigned ? (
              <span className="inline-flex items-center gap-1.5 text-awz-gold">
                <TbCircleCheck size={15} /> Yes
              </span>
            ) : (
              <span className="text-awz-muted/60">No</span>
            )
          }
        />
        {data.signer && (
          <InfoRow
            label="Signer"
            value={<span className="text-awz-green">{data.signer}</span>}
            copyable={data.signer}
          />
        )}
        {data.timestamp > 0 && (
          <InfoRow
            label="Timestamp"
            value={
              <span className="flex items-center gap-2">
                <Clock size={13} className="text-awz-muted/60 flex-shrink-0" />
                {fmtDate(data.timestamp)}
              </span>
            }
          />
        )}
      </Section>

      {/* args */}
      <Section icon={<TbArrowsExchange size={16} />} title="Call Arguments">
        {data.args === '—' || data.args === 'null' ? (
          <div className="px-5 py-6 text-awz-muted text-sm font-mono">No arguments</div>
        ) : (
          <div className="px-5 py-4 overflow-x-auto">
            <pre className="text-awz-text text-sm font-mono whitespace-pre-wrap break-words leading-relaxed">
              {data.args}
            </pre>
          </div>
        )}
      </Section>

    </div>
  )
}
