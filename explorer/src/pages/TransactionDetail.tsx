import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Copy, CheckCheck, Clock, Hash, Box,
  ArrowRight, Zap, User, ChevronLeft, ChevronRight,
  CircleCheck, CircleX,
} from 'lucide-react'
import { TbArrowsExchange, TbBolt, TbCube } from 'react-icons/tb'
import { getClient } from '../api/client'
import { classifyExtrinsic } from '../api/queries'
import { TxTypeBadge } from '../components/ui/TxTypeBadge'
import { Panel, PanelHeader, DataRow, DataGrid, StatMini } from '../components/ui/Panel'
import { formatRizAmount } from '../lib/formatRiz'

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
  args: unknown
  timestamp: number
  totalInBlock: number
  // Every extrinsic (signed or inherent) gets exactly one ExtrinsicSuccess/
  // ExtrinsicFailed system event; null here just means that event couldn't
  // be found or read, not that the extrinsic has no outcome.
  success: boolean | null
  dispatchError?: string
}

/* ── helpers ────────────────────────────────────────────────────── */
function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function fmtDate(ts: number): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'UTC', timeZoneName: 'short',
  })
}

function truncate(addr: string, head = 8, tail = 6): string {
  if (!addr || addr.length <= head + tail + 3) return addr
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`
}

// Plain-English description of what the tx did
// ext.method.toJSON().args is a named object keyed by argument name (e.g.
// { dest, value } for transferKeepAlive) — field names are chain-defined, so
// read positionally via Object.values() (insertion order matches the call's
// argument order) rather than assuming exact names.
function getCallArgs(args: unknown): unknown[] {
  if (!args || typeof args !== 'object') return []
  return Object.values(args as Record<string, unknown>)
}

function describeTx(section: string, method: string, args: unknown): string {
  const vals = getCallArgs(args)
  if (section === 'balances') {
    if (['transferKeepAlive', 'transfer', 'transferAllowDeath', 'transferAll'].includes(method)) {
      const destRaw = vals[0] as any
      const dest = destRaw?.id ?? destRaw?.Id ?? destRaw ?? '?'
      const raw = BigInt(String(vals[1] ?? '0').replace(/,/g, ''))
      return `Transferred ${formatRizAmount(raw)} RIZ to ${truncate(String(dest))}`
    }
    return `Balances operation: ${method}`
  }
  if (section === 'timestamp') return 'System block timestamp — recorded automatically by the network'
  if (section === 'awarizonState') {
    if (method === 'registerIdentity') return 'Registered a new on-chain identity'
    if (method === 'updateIdentity') return 'Updated on-chain identity details'
    if (method === 'registerDeveloper') return 'Registered as an app developer'
    if (method === 'registerValidator') return 'Registered as a network validator'
    if (method === 'createCampaign') return 'Created a new ad campaign'
    if (method === 'deliverCampaign') return 'Delivered a campaign to a wallet'
    if (method === 'engageInbox') return 'Engaged with an inbox campaign reward'
    if (method === 'claimReward') return 'Claimed an engagement reward'
    if (method === 'updateWalletIndex') return 'Updated wallet targeting profile'
    if (method === 'delegate') return 'Delegated stake to a validator'
    if (method === 'undelegate') return 'Removed stake delegation'
  }
  return `Called ${section}.${method}`
}

// Extract transfer from/to/amount for visual flow card
function extractTransfer(section: string, method: string, args: unknown, signer?: string) {
  const vals = getCallArgs(args)
  if (section === 'balances' && ['transferKeepAlive', 'transfer', 'transferAllowDeath'].includes(method)) {
    const destRaw = vals[0] as any
    const dest = destRaw?.id ?? destRaw?.Id ?? String(destRaw ?? '')
    const raw = BigInt(String(vals[1] ?? '0').replace(/,/g, ''))
    return { from: signer ?? '?', to: String(dest), amount: raw }
  }
  return null
}

/* ── copy button ─────────────────────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="flex-shrink-0 text-awz-muted/40 hover:text-awz-gold transition-colors" title="Copy">
      {copied ? <CheckCheck size={13} className="text-awz-gold" /> : <Copy size={13} />}
    </button>
  )
}

/* ── page ─────────────────────────────────────────────────────────── */
export function TransactionDetail() {
  const { blockNumber = '', index } = useParams<{ blockNumber: string; index?: string }>()
  const [searchParams] = useSearchParams()
  const hashParam = searchParams.get('hash')
  const blockNum = parseInt(blockNumber, 10)
  // Index comes straight from the URL for /tx/:block/:index links (recent-activity,
  // block-detail rows). Indexer-sourced links only know the tx hash, not its position
  // in the block, so /tx/:block?hash=... resolves the index below once the block loads.
  const urlIdx = index !== undefined ? parseInt(index, 10) : NaN

  const [data, setData] = useState<TxData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNaN(blockNum) || (isNaN(urlIdx) && !hashParam)) {
      setError('Invalid block number or transaction reference')
      setLoading(false)
      return
    }
    let mounted = true
    setLoading(true); setError(null); setData(null)

    getClient()
      .then(async (client) => {
        const api = client.getApi()
        const blockHash = await (api.rpc.chain as any).getBlockHash(blockNum)
        if (!blockHash || blockHash.isEmpty) throw new Error('Block not found')

        const [signedBlock, ts, events] = await Promise.all([
          (api.rpc.chain as any).getBlock(blockHash),
          (api.query as any).timestamp?.now?.at?.(blockHash).catch(() => null),
          (api.query.system as any).events.at(blockHash).catch(() => null),
        ])

        const exts: any[] = Array.from(signedBlock.block.extrinsics)

        const extIdx = !isNaN(urlIdx)
          ? urlIdx
          : exts.findIndex((e: any) => e.hash?.toHex?.() === hashParam)

        if (extIdx < 0) throw new Error(`Transaction ${hashParam ?? `#${urlIdx}`} not found in block #${blockNum}`)
        if (extIdx >= exts.length) throw new Error(`Extrinsic #${extIdx} not found in block #${blockNum}`)

        const ext = exts[extIdx]
        // ext.method.args is a plain array of Codec instances with no
        // .toJSON() of its own — decode the whole Call instead and pull its
        // .args, which is the properly JSON-encoded, name-keyed struct.
        let parsedArgs: unknown = null
        try { parsedArgs = (ext.method?.toJSON?.() as any)?.args ?? null } catch {}

        // Determine real success/failure from this block's system events —
        // every dispatched extrinsic gets exactly one ExtrinsicSuccess or
        // ExtrinsicFailed with phase.applyExtrinsic === its index. Previously
        // this page just assumed "Success" unconditionally.
        let success: boolean | null = null
        let dispatchError: string | undefined
        try {
          const eventRecords: any[] = events ? Array.from(events as any) : []
          for (const record of eventRecords) {
            const { event, phase } = record
            if (!phase?.isApplyExtrinsic || !phase.asApplyExtrinsic.eq(extIdx)) continue
            if (event.section === 'system' && event.method === 'ExtrinsicFailed') {
              success = false
              const dispatchErr = event.data?.[0]
              if (dispatchErr?.isModule) {
                try {
                  const decoded = api.registry.findMetaError(dispatchErr.asModule)
                  dispatchError = decoded.docs?.length ? decoded.docs.join(' ') : `${decoded.section}.${decoded.name}`
                } catch {
                  dispatchError = dispatchErr.toString()
                }
              } else {
                dispatchError = dispatchErr?.toString?.() ?? 'Unknown dispatch error'
              }
            } else if (event.section === 'system' && event.method === 'ExtrinsicSuccess') {
              success = true
            }
          }
        } catch {}

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
            args: parsedArgs,
            timestamp: ts ? Number(ts.toString()) : 0,
            totalInBlock: exts.length,
            success,
            dispatchError,
          })
          setLoading(false)
        }
      })
      .catch((e: Error) => {
        if (mounted) { setError(e?.message ?? 'Failed to load transaction'); setLoading(false) }
      })

    return () => { mounted = false }
  }, [blockNum, urlIdx, hashParam])

  /* ── loading ── */
  if (loading) return (
    <div className="flex flex-col gap-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-awz-muted text-xs font-mono hover:text-awz-gold transition-colors w-fit">
        <ArrowLeft size={14} /> Overview
      </Link>
      <div className="py-32 text-center">
        <TbArrowsExchange size={40} className="text-awz-gold/30 mx-auto mb-4 animate-pulse" />
        <p className="text-awz-muted text-sm font-mono animate-pulse">Loading transaction…</p>
      </div>
    </div>
  )

  /* ── error ── */
  if (error || !data) return (
    <div className="flex flex-col gap-6">
      <Link to={`/block/${blockNumber}`} className="inline-flex items-center gap-1.5 text-awz-muted text-xs font-mono hover:text-awz-gold transition-colors w-fit">
        <ArrowLeft size={14} /> Block #{blockNumber}
      </Link>
      <Panel className="p-16 text-center">
        <TbArrowsExchange size={44} className="text-awz-muted/20 mx-auto mb-4" />
        <p className="text-awz-muted font-mono text-sm">{error ?? 'Transaction not found'}</p>
      </Panel>
    </div>
  )

  const txType = classifyExtrinsic(data.section, data.method)
  const description = describeTx(data.section, data.method, data.args)
  const transfer = extractTransfer(data.section, data.method, data.args, data.signer)
  const prevIdx = data.index > 0 ? data.index - 1 : null
  const nextIdx = data.index < data.totalInBlock - 1 ? data.index + 1 : null
  const isSystem = !data.isSigned

  return (
    <div className="flex flex-col gap-5">

      {/* breadcrumb */}
      <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono text-awz-muted">
        <Link to="/" className="hover:text-awz-gold transition-colors flex items-center gap-1">
          <ArrowLeft size={12} /> Overview
        </Link>
        <span className="text-awz-border">›</span>
        <Link to={`/block/${data.blockNumber}`} className="hover:text-awz-gold transition-colors flex items-center gap-1">
          <TbCube size={12} /> Block #{data.blockNumber.toLocaleString()}
        </Link>
        <span className="text-awz-border">›</span>
        <span className="text-awz-text">Transaction #{data.index}</span>
      </div>

      {/* hero */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${
            isSystem ? 'bg-awz-surface border-awz-border' : 'bg-awz-gold/10 border-awz-gold/30'
          }`}>
            {isSystem
              ? <TbBolt size={24} className="text-awz-muted/50" />
              : <TbArrowsExchange size={24} className="text-awz-gold" />
            }
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-mono font-bold text-xl text-awz-text">
                <span className="text-awz-muted">{data.section}</span>
                <span className="text-awz-border mx-0.5">.</span>
                <span className="text-awz-gold">{data.method}</span>
              </h1>
              <TxTypeBadge type={txType} />
              {data.success === false ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-awz-red bg-awz-red/10 border border-awz-red/20 px-2 py-0.5 rounded-full">
                  <CircleX size={10} /> Failed
                </span>
              ) : data.success === true ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-green-400/80 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                  <CircleCheck size={10} /> Success
                </span>
              ) : null}
            </div>
            <p className="text-awz-muted text-sm mt-1 font-sans leading-snug">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {prevIdx !== null && (
            <Link to={`/tx/${data.blockNumber}/${prevIdx}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-awz-border text-awz-muted text-xs font-mono hover:border-awz-gold hover:text-awz-gold transition-colors">
              <ChevronLeft size={13} /> Prev
            </Link>
          )}
          {nextIdx !== null && (
            <Link to={`/tx/${data.blockNumber}/${nextIdx}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-awz-border text-awz-muted text-xs font-mono hover:border-awz-gold hover:text-awz-gold transition-colors">
              Next <ChevronRight size={13} />
            </Link>
          )}
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatMini label="Block" value={`#${data.blockNumber.toLocaleString()}`} sub="Click to view block" link={`/block/${data.blockNumber}`} />
        <StatMini label="Position" value={`${data.index + 1} of ${data.totalInBlock}`} sub="Extrinsic index in block" />
        <StatMini label="Status" value={
          data.success === false
            ? <span className="flex items-center gap-1.5 text-awz-red"><CircleX size={16} />Failed</span>
            : data.success === true
            ? <span className="flex items-center gap-1.5 text-green-400"><CircleCheck size={16} />Success</span>
            : <span className="flex items-center gap-1.5 text-awz-muted">Unknown</span>
        } sub="Included in finalized block" />
        <StatMini
          label="Time"
          value={data.timestamp > 0 ? timeAgo(data.timestamp) : '—'}
          sub={data.timestamp > 0 ? fmtDate(data.timestamp) : undefined}
        />
      </div>

      {/* transfer flow — only for balance transfers */}
      {transfer && (
        <Panel>
          <PanelHeader icon={<TbArrowsExchange size={15} />} title="Transfer Flow" />
          <div className="px-5 py-5 flex flex-col sm:flex-row items-center gap-4">
            {/* From */}
            <div className="flex-1 min-w-0 bg-awz-bg rounded-xl border border-awz-border p-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-awz-muted/70 mb-2">From</div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-awz-gold/20 border border-awz-gold/30 flex items-center justify-center flex-shrink-0">
                  <User size={13} className="text-awz-gold" />
                </div>
                <span className="font-mono text-xs text-awz-text break-all">{transfer.from}</span>
                <CopyBtn text={transfer.from} />
              </div>
            </div>

            {/* Arrow + amount */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className="flex items-center gap-2 bg-awz-gold/10 border border-awz-gold/20 rounded-full px-4 py-1.5">
                <span className="font-mono font-bold text-awz-gold text-sm">{formatRizAmount(transfer.amount)} RIZ</span>
              </div>
              <ArrowRight size={20} className="text-awz-gold" />
            </div>

            {/* To */}
            <div className="flex-1 min-w-0 bg-awz-bg rounded-xl border border-awz-border p-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-awz-muted/70 mb-2">To</div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-awz-gold/20 border border-awz-gold/30 flex items-center justify-center flex-shrink-0">
                  <User size={13} className="text-awz-gold" />
                </div>
                <span className="font-mono text-xs text-awz-text break-all">{transfer.to}</span>
                <CopyBtn text={transfer.to} />
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* main 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT — identifiers (2/3) */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <Panel>
            <PanelHeader icon={<Hash size={15} />} title="Transaction Identifiers" />
            <DataRow label="Transaction Hash" hint="Unique hash of this extrinsic">
              <div className="flex items-start gap-2.5">
                <span className="text-awz-gold break-all">{data.hash}</span>
                <CopyBtn text={data.hash} />
              </div>
            </DataRow>
            <div className="border-t border-awz-border/50" />
            <DataRow label="Block Hash" hint="Hash of the block this transaction was included in">
              <div className="flex items-start gap-2.5">
                <Link to={`/block/${data.blockNumber}`} className="text-awz-muted hover:text-awz-gold transition-colors break-all">
                  {data.blockHash}
                </Link>
                <CopyBtn text={data.blockHash} />
              </div>
            </DataRow>
            <div className="border-t border-awz-border/50" />
            <DataGrid>
              <DataRow label="Block Number">
                <Link to={`/block/${data.blockNumber}`} className="text-awz-gold hover:underline">
                  #{data.blockNumber.toLocaleString()}
                </Link>
              </DataRow>
              <DataRow label="Extrinsic Index" hint="Position of this transaction within the block">
                {data.index}
              </DataRow>
            </DataGrid>
            {data.signer && (
              <>
                <div className="border-t border-awz-border/50" />
                <DataRow label="Signed By" hint="The wallet address that signed and submitted this transaction">
                  <div className="flex items-start gap-2.5">
                    <Link to={`/account?address=${data.signer}`} className="text-awz-gold hover:underline break-all">
                      {data.signer}
                    </Link>
                    <CopyBtn text={data.signer} />
                  </div>
                </DataRow>
              </>
            )}
            {data.timestamp > 0 && (
              <>
                <div className="border-t border-awz-border/50" />
                <DataRow label="Timestamp">
                  <span className="flex items-center gap-2 text-awz-muted">
                    <Clock size={13} className="flex-shrink-0" />
                    {fmtDate(data.timestamp)}
                  </span>
                </DataRow>
              </>
            )}
          </Panel>
        </div>

        {/* RIGHT — call summary (1/3) */}
        <div className="flex flex-col gap-5">
          <Panel>
            <PanelHeader icon={<Zap size={15} />} title="Call Summary" />
            <DataRow label="Category" hint="A plain-English summary of what this call does">
              <TxTypeBadge type={txType} />
            </DataRow>
            <div className="border-t border-awz-border/50" />
            <DataRow label="Module" hint="The on-chain module this call belongs to, as named in the chain's raw metadata">
              {data.section}
            </DataRow>
            <div className="border-t border-awz-border/50" />
            <DataRow label="Action" hint="The specific function called within that module">
              <span className="text-awz-gold">{data.method}</span>
            </DataRow>
            <div className="border-t border-awz-border/50" />
            <DataRow label="Submitted By" hint="Whether a user wallet signed and submitted this, or the network created it automatically">
              {data.isSigned
                ? <span className="flex items-center gap-1.5 text-awz-gold"><CircleCheck size={13} /> A user wallet</span>
                : <span className="flex items-center gap-1.5 text-awz-muted"><TbBolt size={13} /> The network (automatic)</span>
              }
            </DataRow>
            <div className="border-t border-awz-border/50" />
            <DataRow label="Result">
              {data.success === false ? (
                <span className="flex items-center gap-1.5 text-awz-red">
                  <CircleX size={13} /> Failed{data.dispatchError ? `: ${data.dispatchError}` : ''}
                </span>
              ) : data.success === true ? (
                <span className="flex items-center gap-1.5 text-green-400">
                  <CircleCheck size={13} /> Transaction succeeded
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-awz-muted">
                  <TbBolt size={13} /> Dispatch outcome unavailable
                </span>
              )}
            </DataRow>
          </Panel>

          <Panel>
            <PanelHeader icon={<TbCube size={15} />} title="Block Context" />
            <DataRow label="Block">
              <Link to={`/block/${data.blockNumber}`} className="text-awz-gold hover:underline">
                #{data.blockNumber.toLocaleString()}
              </Link>
            </DataRow>
            <div className="border-t border-awz-border/50" />
            <DataRow label="Transactions in Block" hint="Total number of extrinsics including system ones">
              {data.totalInBlock}
            </DataRow>
          </Panel>
        </div>
      </div>

      {/* parameters card */}
      <Panel>
        <PanelHeader icon={<Box size={15} />} title="Call Parameters" badge={
          <span className="text-[10px] font-mono text-awz-muted/50 bg-awz-bg px-2 py-0.5 rounded-full border border-awz-border/50">
            Raw decoded args
          </span>
        } />
        {!data.args || data.args === null || (Array.isArray(data.args) && data.args.length === 0) ? (
          <div className="px-5 py-8 text-center">
            <CircleX size={28} className="text-awz-muted/20 mx-auto mb-2" />
            <p className="text-awz-muted text-sm font-mono">No parameters for this call</p>
          </div>
        ) : (
          <div className="px-5 py-4 overflow-x-auto">
            <pre className="text-awz-text text-sm font-mono whitespace-pre-wrap break-words leading-relaxed">
              {JSON.stringify(data.args, null, 2)}
            </pre>
          </div>
        )}
      </Panel>

    </div>
  )
}
