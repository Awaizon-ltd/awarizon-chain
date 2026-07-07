import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip,
} from 'recharts'
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
import { NetworkInfoCard } from '../components/NetworkInfoCard'
import { getClient } from '../api/client'
import { formatRizAmount, formatRizAmountStr } from '../lib/formatRiz'

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
      border border-awz-border
      rounded-xl p-3 flex flex-col gap-2 shadow-lg
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

function Row({ icon, label, children, className = '' }: { icon: ReactNode; label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 bg-black/[0.04] dark:bg-black/[0.18] border border-black/[0.07] dark:border-white/[0.05] rounded-lg p-2 ${className}`}>
      <div className="flex items-center gap-1.5">
        <span className="text-awz-muted/70">{icon}</span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-awz-muted">{label}</span>
      </div>
      <div className="font-mono font-semibold text-awz-text text-sm leading-none">
        {children}
      </div>
    </div>
  )
}

/* Shared-background row wrapper — two cells sit side by side inside one panel */
function RowBg({ children }: { children: ReactNode }) {
  return (
    <div className="bg-black/[0.04] dark:bg-black/[0.18] border border-black/[0.07] dark:border-white/[0.05] rounded-lg grid grid-cols-2 divide-x divide-black/[0.07] dark:divide-white/[0.04] flex-1">
      {children}
    </div>
  )
}

function Cell({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 p-2">
      <div className="flex items-center gap-1">
        <span className="text-awz-muted/70 flex-shrink-0">{icon}</span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-awz-muted truncate">{label}</span>
      </div>
      <div className="font-mono font-semibold text-awz-text text-sm leading-none">
        {children}
      </div>
    </div>
  )
}

/* ── Recent Blocks panel ─────────────────────────────────────────── */
function RecentBlocksList({ blocks }: { blocks: BlockInfo[] }) {
  return (
    <div className="bg-awz-surface border border-awz-border rounded-xl overflow-hidden flex flex-col shadow-lg">
      {/* panel title */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-awz-border">
        <RiStackLine size={22} className="text-awz-gold flex-shrink-0" />
        <div className="flex flex-col">
          <span className="text-sm font-mono font-semibold text-awz-text">Latest Blocks</span>
          <span className="text-[10px] font-mono text-awz-muted/60 uppercase tracking-widest">3s block time</span>
        </div>
      </div>

      {blocks.length === 0 ? (
        <div className="px-5 py-10 text-center text-awz-muted text-sm font-mono">
          Connecting to chain…
        </div>
      ) : (
        <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
        <table className="w-full border-collapse table-fixed min-w-[480px]">
          <thead>
            <tr className="bg-awz-bg/40">
              <th className="py-2 text-left w-[42px]" />
              <th className="px-2 py-2 text-left text-xs font-mono uppercase tracking-widest text-awz-muted/70 font-medium w-[18%]">Block #</th>
              <th className="px-2 py-2 text-left text-xs font-mono uppercase tracking-widest text-awz-muted/70 font-medium w-[37%]">Hash</th>
              <th className="px-2 py-2 text-right text-xs font-mono uppercase tracking-widest text-awz-muted/70 font-medium w-[13%]">Txns</th>
              <th className="pl-6 pr-5 py-2 text-right text-xs font-mono uppercase tracking-widest text-awz-muted/70 font-medium">Age</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((b) => (
              <tr key={b.number} className="hover:bg-awz-gold/5 transition-colors group">
                <td className="pl-5 pr-2 py-3">
                  <TbCube size={18} className="text-awz-gold" />
                </td>
                <td className="px-2 py-3 overflow-hidden">
                  <Link
                    to={`/block/${b.number}`}
                    className="font-mono text-sm font-bold text-awz-text group-hover:text-awz-gold transition-colors whitespace-nowrap"
                  >
                    #{b.number.toLocaleString()}
                  </Link>
                </td>
                <td className="px-2 py-3 overflow-hidden">
                  <span className="font-mono text-sm text-awz-muted block truncate">
                    {truncHash(b.hash)}
                  </span>
                </td>
                <td className="px-2 py-3 text-right">
                  <span className="font-mono text-sm text-awz-muted">{b.extrinsicCount}</span>
                </td>
                <td className="pl-6 pr-5 py-3 text-right">
                  <span className="font-mono text-sm text-awz-muted/60 whitespace-nowrap">{timeAgo(b.timestamp)}</span>
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

/* ── Recent Transactions panel ───────────────────────────────────── */
function RecentTransactionsList({ txs }: { txs: TxInfo[] }) {
  return (
    <div className="bg-awz-surface border border-awz-border rounded-xl overflow-hidden flex flex-col shadow-lg">
      {/* panel title */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-awz-border">
        <RiExchangeLine size={22} className="text-awz-gold flex-shrink-0" />
        <div className="flex flex-col">
          <span className="text-sm font-mono font-semibold text-awz-text">Latest Transactions</span>
          <span className="text-[10px] font-mono text-awz-muted/60 uppercase tracking-widest">User-submitted extrinsics</span>
        </div>
      </div>

      {txs.length === 0 ? (
        <div className="px-5 py-10 text-center text-awz-muted text-sm font-mono">
          No user transactions yet — inherents excluded
        </div>
      ) : (
        <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
        <table className="w-full border-collapse table-fixed min-w-[480px]">
          <thead>
            <tr className="bg-awz-bg/40">
              <th className="py-2 text-left w-[42px]" />
              <th className="px-2 py-2 text-left text-xs font-mono uppercase tracking-widest text-awz-muted/70 font-medium w-[35%]">Hash / Call</th>
              <th className="px-2 py-2 text-center text-xs font-mono uppercase tracking-widest text-awz-muted/70 font-medium w-[18%]">Type</th>
              <th className="px-2 py-2 text-right text-xs font-mono uppercase tracking-widest text-awz-muted/70 font-medium w-[16%]">Block</th>
              <th className="pl-6 pr-5 py-2 text-right text-xs font-mono uppercase tracking-widest text-awz-muted/70 font-medium">Age</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((tx, i) => (
              <tr key={`${tx.blockNumber}-${tx.index}-${i}`} className="hover:bg-awz-gold/5 transition-colors">
                <td className="pl-5 pr-2 py-3">
                  {tx.isSigned
                    ? <TbArrowsExchange size={18} className="text-awz-gold" />
                    : <TbBolt size={18} className="text-awz-muted/50" />
                  }
                </td>
                <td className="px-2 py-3 overflow-hidden">
                  <Link
                    to={`/tx/${tx.blockNumber}/${tx.index}`}
                    className="font-mono text-sm text-awz-green hover:underline block truncate"
                  >
                    {truncHash(tx.hash)}
                  </Link>
                  <span className="font-mono text-xs text-awz-muted block truncate">
                    {tx.section}.{tx.method}
                  </span>
                </td>
                <td className="px-2 py-3 text-center overflow-hidden">
                  <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wide ${typeColor(tx.type)}`}>
                    {tx.type}
                  </span>
                </td>
                <td className="px-2 py-3 text-right overflow-hidden">
                  <Link
                    to={`/block/${tx.blockNumber}`}
                    className="font-mono text-sm text-awz-gold hover:underline whitespace-nowrap"
                  >
                    #{tx.blockNumber.toLocaleString()}
                  </Link>
                </td>
                <td className="pl-6 pr-5 py-3 text-right">
                  <span className="font-mono text-sm text-awz-muted/60 whitespace-nowrap">{timeAgo(tx.timestamp)}</span>
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

/* ── Overview ────────────────────────────────────────────────────── */
export function Overview() {
  const { data: stats } = useNetworkStats()
  const { data: validatorCount } = useValidatorCount()
  const { latestBlockNumber, tps, tpsHistory, blocks, txs } = useLiveChainData()

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

  const supplyStr      = totalIssuance !== null             ? formatRizAmount(totalIssuance)                  : '———'
  const stakedStr      = stats?.total_staked          != null ? formatRizAmountStr(stats.total_staked)         : '———'
  const epochStr       = stats?.current_epoch         != null ? stats.current_epoch.toLocaleString()           : '———'
  const validatorStr   = validatorCount               != null ? Number(validatorCount).toLocaleString()        : '———'
  const blockHeightStr = latestBlockNumber > 0                ? `#${latestBlockNumber.toLocaleString()}`       : '———'
  const totalExtStr    = stats?.total_extrinsics      != null ? stats.total_extrinsics.toLocaleString()        : '———'
  const deliveriesStr  = stats?.total_deliveries      != null ? stats.total_deliveries.toLocaleString()        : '———'
  const walletsStr     = stats?.total_wallets         != null ? stats.total_wallets.toLocaleString()           : '———'
  const campaignsStr   = stats?.active_campaigns      != null ? stats.active_campaigns.toLocaleString()        : '———'
  const inboxStr       = stats?.inbox_reserve_balance != null ? formatRizAmountStr(stats.inbox_reserve_balance) : '———'

  return (
    <div className="flex flex-col gap-4 sm:gap-5">

      {/* ── 4-col card grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* CARD 1 — RIZ SUPPLY · stacked (values too wide for 2-col) */}
        <Card>
          <CardHeader icon={<Coins size={28} strokeWidth={2.5} />} title="RIZ_SUPPLY" />
          <div className="flex flex-col gap-2 flex-1">
            <Row icon={<RizIcon size={18} />} label="Total Supply">
              {supplyStr}
              <span className="text-awz-muted text-[10px] font-normal ml-1">RIZ</span>
            </Row>
            <Row icon={<Lock size={18} strokeWidth={2.5} />} label="Staked">
              {stakedStr}
              <span className="text-awz-muted text-[10px] font-normal ml-1">RIZ</span>
            </Row>
          </div>
        </Card>

        {/* CARD 2 — EPOCH STATUS · stacked */}
        <Card>
          <CardHeader icon={<Timer size={28} strokeWidth={2.5} />} title="EPOCH_STATUS" />
          <div className="flex flex-col gap-2 flex-1">
            <Row icon={<RefreshCw size={18} strokeWidth={2.5} />} label="Current Epoch">
              {epochStr}
            </Row>
            <Row icon={<Clock size={18} strokeWidth={2.5} />} label="Next Epoch In">
              {epochCountdown}
            </Row>
            <Row icon={<Shield size={18} strokeWidth={2.5} />} label="Active Validators">
              {validatorStr}
            </Row>
          </div>
        </Card>

        {/* CARD 3 — BLOCK ACTIVITY · 2×2 with shared row backgrounds */}
        <Card>
          <CardHeader icon={<Box size={28} strokeWidth={2.5} />} title="BLOCK_ACTIVITY" />
          <div className="flex flex-col gap-2 flex-1">
            <RowBg>
              <Cell icon={<Box size={14} strokeWidth={2.5} />} label="Block Height">
                {blockHeightStr}
              </Cell>
              <Cell icon={<ArrowLeftRight size={14} strokeWidth={2.5} />} label="Total Txns">
                {totalExtStr}
              </Cell>
            </RowBg>
            <RowBg>
              <Cell icon={<Inbox size={14} strokeWidth={2.5} />} label="Deliveries">
                {deliveriesStr}
              </Cell>
              <Cell icon={<Zap size={14} strokeWidth={2.5} />} label="Est. TPS">
                {tpsStr !== null ? `${tpsStr} tx/s` : '———'}
                <span className="text-[9px] font-mono text-awz-muted/50 block mt-0.5">3s BLOCK TIME</span>
              </Cell>
            </RowBg>
          </div>
        </Card>

        {/* CARD 4 — PARTICIPANTS · 2×2 with shared row backgrounds */}
        <Card>
          <CardHeader icon={<Users size={28} strokeWidth={2.5} />} title="PARTICIPANTS" />
          <div className="flex flex-col gap-2 flex-1">
            <RowBg>
              <Cell icon={<Wallet size={14} strokeWidth={2.5} />} label="Total Wallets">
                {walletsStr}
              </Cell>
              <Cell icon={<Megaphone size={14} strokeWidth={2.5} />} label="Campaigns">
                {campaignsStr}
              </Cell>
            </RowBg>
            <RowBg>
              <Cell icon={<Send size={14} strokeWidth={2.5} />} label="Deliveries">
                {deliveriesStr}
              </Cell>
              <Cell icon={<PiggyBank size={14} strokeWidth={2.5} />} label="Inbox Reserve">
                {inboxStr}
                <span className="text-awz-muted text-[10px] font-normal ml-1">RIZ</span>
              </Cell>
            </RowBg>
          </div>
        </Card>

      </div>

      {/* ── TPS CHART ────────────────────────────────────────────── */}
      {tpsHistory.length > 1 && (
        <div className="bg-awz-surface border border-awz-border rounded-xl px-5 py-4 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-awz-muted">Throughput · Tx/s</span>
            <span className="ml-auto font-mono text-xs font-semibold text-awz-gold">
              {tps.toFixed(2)} tx/s
            </span>
          </div>
          <ResponsiveContainer width="100%" height={72}>
            <AreaChart data={tpsHistory} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="tpsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor="#C9A84C" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" hide />
              <YAxis hide domain={[0, 'auto']} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-awz-bg border border-awz-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-awz-text shadow-lg">
                      {(payload[0].value as number).toFixed(3)} tx/s
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="tps"
                stroke="#C9A84C"
                strokeWidth={1.5}
                fill="url(#tpsGrad)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── RECENT ACTIVITY ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-awz-muted">
            Recent Activity
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <RecentBlocksList blocks={blocks} />
          <RecentTransactionsList txs={txs} />
        </div>
      </div>

      {/* ── NETWORK ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-[0.18em] text-awz-muted">
            Network
          </span>
        </div>
        <NetworkInfoCard />
      </div>

    </div>
  )
}
