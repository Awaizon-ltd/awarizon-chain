import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Coins, Lock, Timer, RefreshCw, Clock, Shield,
  Box, ArrowLeftRight, Inbox, Zap,
  Users, Wallet, Megaphone, Send, PiggyBank,
} from 'lucide-react'
import { RiStackLine, RiExchangeLine } from 'react-icons/ri'
import { TbCube, TbArrowsExchange, TbBolt } from 'react-icons/tb'
import {
  useNetworkStats,
  useValidatorCount,
  useLiveChainData,
  calcEpochCountdown,
  timeAgo,
} from '../api/queries'
import type { BlockInfo, TxInfo } from '../api/queries'
import { getClient } from '../api/client'

/* ── Constants ───────────────────────────────────────────────────── */
const RIZ = 1_000_000_000_000n

/* ── Formatters ──────────────────────────────────────────────────── */
function formatRizComma(planck: bigint, decimals = 0): string {
  const whole = planck / RIZ
  if (decimals === 0) return whole.toLocaleString()
  const frac = (planck % RIZ).toString().padStart(12, '0').slice(0, decimals)
  return `${whole.toLocaleString()}.${frac}`
}

function formatRizStr(planckStr: string, decimals = 0): string {
  try { return formatRizComma(BigInt(planckStr), decimals) } catch { return '———' }
}

function typeColor(type: string): string {
  switch (type) {
    case 'Transfer':    return 'bg-emerald-500/10 text-emerald-400'
    case 'Campaign':    return 'bg-awz-gold/10 text-awz-gold'
    case 'Delivery':    return 'bg-green-500/10 text-green-400'
    case 'Engagement':  return 'bg-orange-500/10 text-orange-400'
    case 'Developer':   return 'bg-blue-500/10 text-blue-400'
    case 'Manifest':    return 'bg-indigo-500/10 text-indigo-400'
    case 'Validator':   return 'bg-yellow-500/10 text-yellow-400'
    case 'Delegation':  return 'bg-amber-500/10 text-amber-400'
    case 'Staking':     return 'bg-purple-500/10 text-purple-400'
    case 'Vesting':     return 'bg-pink-500/10 text-pink-400'
    case 'Contract Call':
    case 'Deploy':
    case 'EVM':
    case 'Ethereum':    return 'bg-violet-500/10 text-violet-400'
    case 'Sudo':        return 'bg-red-500/10 text-red-400'
    default:            return 'bg-awz-border text-awz-muted'
  }
}

function truncHash(hash: string, head = 10, tail = 6): string {
  if (!hash || hash.length < head + tail + 3) return hash
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`
}

/* ── RIZ logo icon ───────────────────────────────────────────────── */
function RizIcon({ size = 18 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-md bg-[#0D0D0D] flex-shrink-0"
      style={{ width: size, height: size, padding: Math.max(2, size * 0.12) }}
    >
      <img
        src="/logo.png"
        alt="RIZ"
        style={{ width: size * 0.76, height: size * 0.76 }}
        className="object-contain"
      />
    </span>
  )
}

/* ── Layout primitives ───────────────────────────────────────────── */
function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`
      bg-awz-surface
      border border-awz-border border-b-[10px] border-b-awz-gold/60
      rounded-xl p-4 flex flex-col gap-3
      ${className}
    `}>
      {children}
    </div>
  )
}

function CardHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-1 border-b border-awz-border">
      <span className="text-awz-gold">{icon}</span>
      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-awz-muted">
        {title}
      </span>
    </div>
  )
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 bg-black/[0.18] border border-white/[0.05] rounded-lg p-3">
      <div className="flex items-center gap-1.5">
        <span className="text-awz-muted/70">{icon}</span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-awz-muted">
          {label}
        </span>
      </div>
      <div className="font-mono font-semibold text-awz-text text-base sm:text-lg leading-none">
        {children}
      </div>
    </div>
  )
}

function LiveDot() {
  return <span className="w-1.5 h-1.5 rounded-full bg-awz-gold inline-block animate-pulse flex-shrink-0" />
}

/* ── Column header row ───────────────────────────────────────────── */
function ColHead({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-mono uppercase tracking-widest text-awz-muted/60 select-none">
      {children}
    </span>
  )
}

/* ── Recent Blocks panel ─────────────────────────────────────────── */
function RecentBlocksList({ blocks }: { blocks: BlockInfo[] }) {
  return (
    <div className="bg-awz-surface border border-awz-border rounded-xl flex flex-col overflow-hidden">
      {/* panel title */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-awz-border">
        <RiStackLine size={22} className="text-awz-gold flex-shrink-0" />
        <div className="flex flex-col">
          <span className="text-sm font-mono font-semibold text-awz-text">Latest Blocks</span>
          <span className="text-[10px] font-mono text-awz-muted/60 uppercase tracking-widest">
            Live · 3s block time
          </span>
        </div>
        <span className="ml-auto"><LiveDot /></span>
      </div>
      {/* column headers */}
      <div className="flex items-center gap-3 px-4 py-2 bg-awz-bg/40 border-b border-awz-border">
        <span className="w-5 flex-shrink-0" />
        <ColHead><span className="w-[72px] inline-block">Block #</span></ColHead>
        <ColHead><span className="flex-1">Hash</span></ColHead>
        <ColHead><span className="w-10 inline-block text-right">Txns</span></ColHead>
        <ColHead><span className="w-14 inline-block text-right">Age</span></ColHead>
      </div>
      {/* rows */}
      <div className="overflow-y-auto max-h-80 divide-y divide-awz-border">
        {blocks.length === 0 ? (
          <div className="px-4 py-10 text-center text-awz-muted text-sm font-mono">
            Connecting to chain…
          </div>
        ) : (
          blocks.map((b) => (
            <div key={b.number} className="flex items-center gap-3 px-4 py-3 hover:bg-awz-gold/5 transition-colors">
              <TbCube size={20} className="text-awz-gold flex-shrink-0 w-5" />
              <Link
                to={`/block/${b.number}`}
                className="font-mono text-sm font-bold text-awz-text hover:text-awz-gold transition-colors w-[72px] flex-shrink-0"
              >
                #{b.number.toLocaleString()}
              </Link>
              <span className="font-mono text-sm text-awz-muted flex-1 truncate min-w-0">
                {truncHash(b.hash)}
              </span>
              <span className="font-mono text-sm text-awz-muted flex-shrink-0 w-10 text-right">
                {b.extrinsicCount}
              </span>
              <span className="font-mono text-sm text-awz-muted/60 flex-shrink-0 w-14 text-right">
                {timeAgo(b.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ── Recent Transactions panel ───────────────────────────────────── */
function RecentTransactionsList({ txs }: { txs: TxInfo[] }) {
  return (
    <div className="bg-awz-surface border border-awz-border rounded-xl flex flex-col overflow-hidden">
      {/* panel title */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-awz-border">
        <RiExchangeLine size={22} className="text-awz-gold flex-shrink-0" />
        <div className="flex flex-col">
          <span className="text-sm font-mono font-semibold text-awz-text">Latest Transactions</span>
          <span className="text-[10px] font-mono text-awz-muted/60 uppercase tracking-widest">
            User-submitted extrinsics
          </span>
        </div>
        <span className="ml-auto"><LiveDot /></span>
      </div>
      {/* column headers */}
      <div className="flex items-center gap-3 px-4 py-2 bg-awz-bg/40 border-b border-awz-border">
        <span className="w-5 flex-shrink-0" />
        <ColHead><span className="flex-1">Hash / Call</span></ColHead>
        <ColHead><span className="w-[72px] inline-block text-center">Type</span></ColHead>
        <ColHead><span className="w-12 inline-block text-right">Block</span></ColHead>
        <ColHead><span className="w-14 inline-block text-right">Age</span></ColHead>
      </div>
      {/* rows */}
      <div className="overflow-y-auto max-h-80 divide-y divide-awz-border">
        {txs.length === 0 ? (
          <div className="px-4 py-10 text-center text-awz-muted text-sm font-mono">
            No user transactions yet — inherents excluded
          </div>
        ) : (
          txs.map((tx, i) => (
            <div key={`${tx.blockNumber}-${tx.index}-${i}`} className="flex items-center gap-3 px-4 py-3 hover:bg-awz-gold/5 transition-colors">
              {tx.isSigned
                ? <TbArrowsExchange size={20} className="text-awz-gold flex-shrink-0 w-5" />
                : <TbBolt size={20} className="text-awz-muted/50 flex-shrink-0 w-5" />
              }
              {/* hash + call stacked */}
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <Link
                  to={`/tx/${tx.blockNumber}/${tx.index}`}
                  className="font-mono text-sm text-awz-green hover:underline truncate"
                >
                  {truncHash(tx.hash)}
                </Link>
                <span className="font-mono text-xs text-awz-muted truncate">
                  {tx.section}.{tx.method}
                </span>
              </div>
              {/* type badge */}
              <span className={`flex-shrink-0 w-[72px] inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wide ${typeColor(tx.type)}`}>
                {tx.type}
              </span>
              {/* block */}
              <Link
                to={`/block/${tx.blockNumber}`}
                className="font-mono text-sm text-awz-gold hover:underline flex-shrink-0 w-12 text-right"
              >
                #{tx.blockNumber.toLocaleString()}
              </Link>
              {/* age */}
              <span className="font-mono text-sm text-awz-muted/60 flex-shrink-0 w-14 text-right">
                {timeAgo(tx.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ── Overview ────────────────────────────────────────────────────── */
export function Overview() {
  const { data: stats } = useNetworkStats()
  const { data: validatorCount } = useValidatorCount()
  const { latestBlockNumber, tps, blocks, txs } = useLiveChainData()

  const [totalIssuance, setTotalIssuance] = useState<bigint | null>(null)

  useEffect(() => {
    let mounted = true
    getClient()
      .then(async (client) => {
        const result = await (client.getApi().query.balances as any).totalIssuance()
        if (mounted) setTotalIssuance(BigInt(result.toString()))
      })
      .catch(console.error)
    return () => { mounted = false }
  }, [])

  // Force re-render every 5 s so timeAgo values tick forward.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 5000)
    return () => clearInterval(id)
  }, [])

  /* ── derived ────────────────────────────────────────────────── */
  const epochCountdown  = latestBlockNumber > 0 ? calcEpochCountdown(latestBlockNumber) : '———'
  const tpsStr          = latestBlockNumber > 0 ? tps.toFixed(2) : null

  const supplyStr      = totalIssuance !== null             ? formatRizComma(totalIssuance)                  : '———'
  const stakedStr      = stats?.total_staked          != null ? formatRizStr(stats.total_staked)               : '———'
  const epochStr       = stats?.current_epoch         != null ? stats.current_epoch.toLocaleString()           : '———'
  const validatorStr   = validatorCount               != null ? Number(validatorCount).toLocaleString()        : '———'
  const blockHeightStr = latestBlockNumber > 0                ? `#${latestBlockNumber.toLocaleString()}`       : '———'
  const totalExtStr    = stats?.total_extrinsics      != null ? stats.total_extrinsics.toLocaleString()        : '———'
  const deliveriesStr  = stats?.total_deliveries      != null ? stats.total_deliveries.toLocaleString()        : '———'
  const walletsStr     = stats?.total_wallets         != null ? stats.total_wallets.toLocaleString()           : '———'
  const campaignsStr   = stats?.active_campaigns      != null ? stats.active_campaigns.toLocaleString()        : '———'
  const inboxStr       = stats?.inbox_reserve_balance != null ? formatRizStr(stats.inbox_reserve_balance, 2)   : '———'

  return (
    <div className="flex flex-col gap-4 sm:gap-5">

      {/* ── 4-col card grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* CARD 1 — RIZ SUPPLY */}
        <Card>
          <CardHeader icon={<Coins size={30} strokeWidth={2.5} />} title="RIZ_SUPPLY" />

          <Row icon={<RizIcon size={22} />} label="Total Supply">
            {supplyStr}
            <span className="text-awz-muted text-xs font-normal ml-1">RIZ</span>
          </Row>

          <Row icon={<Lock size={22} strokeWidth={2.5} />} label="Staked">
            {stakedStr}
            <span className="text-awz-muted text-xs font-normal ml-1">RIZ</span>
          </Row>
        </Card>

        {/* CARD 2 — EPOCH STATUS */}
        <Card>
          <CardHeader icon={<Timer size={30} strokeWidth={2.5} />} title="EPOCH_STATUS" />

          <Row icon={<RefreshCw size={22} strokeWidth={2.5} />} label="Current Epoch">
            {epochStr}
          </Row>

          <Row icon={<Clock size={22} strokeWidth={2.5} />} label="Next Epoch In">
            {epochCountdown}
          </Row>

          <Row icon={<Shield size={22} strokeWidth={2.5} />} label="Active Validators">
            {validatorStr}
          </Row>
        </Card>

        {/* CARD 3 — BLOCK ACTIVITY */}
        <Card>
          <CardHeader icon={<Box size={30} strokeWidth={2.5} />} title="BLOCK_ACTIVITY" />

          <Row icon={<Box size={22} strokeWidth={2.5} />} label="Block Height">
            {blockHeightStr}
          </Row>

          <Row icon={<ArrowLeftRight size={22} strokeWidth={2.5} />} label="Total Transactions">
            {totalExtStr}
          </Row>

          <Row icon={<Inbox size={22} strokeWidth={2.5} />} label="Deliveries">
            {deliveriesStr}
          </Row>

          <div className="flex flex-col gap-1.5 bg-black/[0.18] border border-white/[0.05] rounded-lg p-3">
            <div className="flex items-center gap-1.5">
              <Zap size={22} strokeWidth={2.5} className="text-awz-muted/70" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-awz-muted">Est. TPS</span>
            </div>
            <div className="font-mono font-semibold text-awz-text text-base sm:text-lg leading-none">
              {tpsStr !== null ? `${tpsStr} tx/s` : '———'}
            </div>
            <div className="text-[10px] font-mono text-awz-muted/60 tracking-wider">BLOCK TIME 3s</div>
          </div>
        </Card>

        {/* CARD 4 — NETWORK PARTICIPANTS */}
        <Card>
          <CardHeader icon={<Users size={30} strokeWidth={2.5} />} title="PARTICIPANTS" />

          <Row icon={<Wallet size={22} strokeWidth={2.5} />} label="Total Wallets">
            {walletsStr}
          </Row>

          <Row icon={<Megaphone size={22} strokeWidth={2.5} />} label="Active Campaigns">
            {campaignsStr}
          </Row>

          <Row icon={<Send size={22} strokeWidth={2.5} />} label="Total Deliveries">
            {deliveriesStr}
          </Row>

          <Row icon={<PiggyBank size={22} strokeWidth={2.5} />} label="Inbox Reserve">
            {inboxStr}
            <span className="text-awz-muted text-xs font-normal ml-1">RIZ</span>
          </Row>
        </Card>

      </div>

      {/* ── RECENT ACTIVITY ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-awz-muted">
            Recent Activity
          </span>
          <LiveDot />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <RecentBlocksList blocks={blocks} />
          <RecentTransactionsList txs={txs} />
        </div>
      </div>

    </div>
  )
}
