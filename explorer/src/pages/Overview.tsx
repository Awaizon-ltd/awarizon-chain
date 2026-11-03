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
  Users, Wallet, Megaphone, Send, PiggyBank, Activity,
} from 'lucide-react'
import { RiStackLine, RiExchangeLine } from 'react-icons/ri'
import { TbCube, TbArrowsExchange } from 'react-icons/tb'
import {
  useNetworkStats,
  useAccountCount,
  useValidatorCount,
  useValidatorStakeTotal,
  useLiveChainData,
  useIndexerStats,
  useIndexerLiveBlocks,
  useRecentTransfers,
  calcEpochCountdown,
  timeAgo,
} from '../api/queries'
import type { IndexerBlock, RecentTransfer } from '../api/indexer'
import { NetworkInfoCard } from '../components/NetworkInfoCard'
import { TxTypeBadge } from '../components/ui/TxTypeBadge'
import { Panel, SectionLabel } from '../components/ui/Panel'
import { getClient } from '../api/client'
import { formatRizAmount, formatRizAmountStr } from '../lib/formatRiz'

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
function StatCardShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Panel className={`p-3 flex flex-col gap-2 ${className}`}>{children}</Panel>
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
function RecentBlocksList({ blocks }: { blocks: IndexerBlock[] }) {
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
          Loading recent blocks…
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
              <tr key={b.blockNumber} className="hover:bg-awz-gold/5 transition-colors group">
                <td className="pl-5 pr-2 py-3">
                  <TbCube size={18} className="text-awz-gold" />
                </td>
                <td className="px-2 py-3 overflow-hidden">
                  <Link
                    to={`/block/${b.blockNumber}`}
                    className="font-mono text-sm font-bold text-awz-text group-hover:text-awz-gold transition-colors whitespace-nowrap"
                  >
                    #{b.blockNumber.toLocaleString()}
                  </Link>
                </td>
                <td className="px-2 py-3 overflow-hidden">
                  <span className="font-mono text-sm text-awz-muted block truncate">
                    {truncHash(b.blockHash)}
                  </span>
                </td>
                <td className="px-2 py-3 text-right">
                  <span className="font-mono text-sm text-awz-muted">{b.extrinsicCount}</span>
                </td>
                <td className="pl-6 pr-5 py-3 text-right">
                  <span className="font-mono text-sm text-awz-muted/60 whitespace-nowrap">
                    {b.timestamp != null ? timeAgo(b.timestamp) : '—'}
                  </span>
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
function RecentTransactionsList({ transfers }: { transfers: RecentTransfer[] }) {
  return (
    <div className="bg-awz-surface border border-awz-border rounded-xl overflow-hidden flex flex-col shadow-lg">
      {/* panel title */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-awz-border">
        <RiExchangeLine size={22} className="text-awz-gold flex-shrink-0" />
        <div className="flex flex-col">
          <span className="text-sm font-mono font-semibold text-awz-text">Latest Transactions</span>
          <span className="text-[10px] font-mono text-awz-muted/60 uppercase tracking-widest">RIZ transfers</span>
        </div>
      </div>

      {transfers.length === 0 ? (
        <div className="px-5 py-10 text-center text-awz-muted text-sm font-mono">
          No transfers recorded yet
        </div>
      ) : (
        <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
        <table className="w-full border-collapse table-fixed min-w-[480px]">
          <thead>
            <tr className="bg-awz-bg/40">
              <th className="py-2 text-left w-[42px]" />
              <th className="px-2 py-2 text-left text-xs font-mono uppercase tracking-widest text-awz-muted/70 font-medium w-[36%]">Tx Hash</th>
              <th className="px-2 py-2 text-center text-xs font-mono uppercase tracking-widest text-awz-muted/70 font-medium w-[18%]">Type</th>
              <th className="px-2 py-2 text-right text-xs font-mono uppercase tracking-widest text-awz-muted/70 font-medium w-[16%]">Block</th>
              <th className="pl-6 pr-5 py-2 text-right text-xs font-mono uppercase tracking-widest text-awz-muted/70 font-medium">Age</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t, i) => {
              // From/to/amount are only revealed on the tx detail page — the
              // overview list is a public landing page and shouldn't expose
              // wallet activity at a glance.
              const target = t.extrinsicHash
                ? `/tx/${t.blockNumber}?hash=${encodeURIComponent(t.extrinsicHash)}`
                : `/block/${t.blockNumber}`
              return (
              <tr key={`${t.blockNumber}-${t.blockHash}-${i}`} className="hover:bg-awz-gold/5 transition-colors">
                <td className="pl-5 pr-2 py-3">
                  <TbArrowsExchange size={18} className="text-awz-gold" />
                </td>
                <td className="px-2 py-3 overflow-hidden">
                  <Link
                    to={target}
                    className="font-mono text-sm text-awz-green hover:underline block truncate"
                  >
                    {t.extrinsicHash ? truncHash(t.extrinsicHash) : truncHash(t.blockHash)}
                  </Link>
                </td>
                <td className="px-2 py-3 text-center overflow-hidden">
                  {/* The indexer's recent-transfers feed only ever contains
                      Balances.Transfer events, so this is always "Transfer" —
                      the column stays in place for when other event types
                      are added to the feed. */}
                  <TxTypeBadge type="Transfer" size="xs" />
                </td>
                <td className="px-2 py-3 text-right overflow-hidden">
                  <Link
                    to={`/block/${t.blockNumber}`}
                    className="font-mono text-sm text-awz-gold hover:underline whitespace-nowrap"
                  >
                    #{t.blockNumber.toLocaleString()}
                  </Link>
                </td>
                <td className="pl-6 pr-5 py-3 text-right">
                  <span className="font-mono text-sm text-awz-muted/60 whitespace-nowrap">
                    {t.timestamp != null ? timeAgo(t.timestamp) : '—'}
                  </span>
                </td>
              </tr>
              )
            })}
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
  const { data: idxStats } = useIndexerStats()
  const { data: accountCount } = useAccountCount()
  const { data: validatorCount } = useValidatorCount()
  const { data: validatorStakeTotal } = useValidatorStakeTotal()
  const { tps, tpsHistory, latestBlockNumber: rpcLatestBlockNumber } = useLiveChainData()
  const { blocks: idxBlocks, latestBlockNumber: idxLatestBlockNumber } = useIndexerLiveBlocks()
  const { data: recentTransfers } = useRecentTransfers(10)

  // Indexer seeds instantly from REST; fall back to the RPC subscription's
  // head if the indexer hasn't responded yet (e.g. briefly offline).
  const latestBlockNumber = idxLatestBlockNumber || rpcLatestBlockNumber

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
  // Total Staked = developer stakes (AwarizonState::TotalStaked) + validator
  // self-stakes + delegator stakes (AwarizonConsensus's two running totals) —
  // total_staked alone only ever counted developer stakes.
  const developerStaked = stats?.total_staked != null ? BigInt(stats.total_staked) : null
  const totalStakedRiz = developerStaked !== null || validatorStakeTotal !== undefined
    ? (developerStaked ?? 0n) + (validatorStakeTotal ?? 0n)
    : null
  const stakedStr      = totalStakedRiz !== null                             ? formatRizAmount(totalStakedRiz)  : '———'
  const epochStr       = stats?.current_epoch         != null ? stats.current_epoch.toLocaleString()           : '———'
  const validatorStr   = validatorCount               != null ? Number(validatorCount).toLocaleString()        : '———'
  const blockHeightStr = latestBlockNumber > 0                ? `#${latestBlockNumber.toLocaleString()}`       : '———'
  // Real transfer count from the indexer — chain RPC's total_extrinsics
  // includes one Timestamp.set per block and vastly overcounts activity.
  const totalTxStr     = idxStats?.totalTransfers      != null ? idxStats.totalTransfers.toLocaleString()      : '———'
  const deliveriesStr  = stats?.total_deliveries      != null ? stats.total_deliveries.toLocaleString()        : '———'
  const walletsStr     = accountCount != null ? accountCount.toLocaleString() : (stats?.total_wallets != null ? stats.total_wallets.toLocaleString() : '———')
  const campaignsStr   = stats?.active_campaigns      != null ? stats.active_campaigns.toLocaleString()        : '———'
  const inboxStr       = stats?.inbox_reserve_balance != null ? formatRizAmountStr(stats.inbox_reserve_balance) : '———'

  return (
    <div className="flex flex-col gap-4 sm:gap-5">

      {/* ── 4-col card grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* CARD 1 — RIZ SUPPLY · stacked (values too wide for 2-col) */}
        <StatCardShell>
          <CardHeader icon={<Coins size={28} strokeWidth={2.5} />} title="RIZ_SUPPLY" />
          <div className="flex flex-col gap-2 flex-1">
            <Row icon={<RizIcon size={18} />} label="Total Supply">
              {supplyStr}
              <span className="text-awz-muted text-[10px] font-normal ml-1">RIZ</span>
            </Row>
            <Row icon={<Lock size={18} strokeWidth={2.5} />} label="Total Staked">
              {stakedStr}
              <span className="text-awz-muted text-[10px] font-normal ml-1">RIZ</span>
            </Row>
          </div>
        </StatCardShell>

        {/* CARD 2 — EPOCH STATUS · stacked */}
        <StatCardShell>
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
        </StatCardShell>

        {/* CARD 3 — BLOCK ACTIVITY · 2×2 with shared row backgrounds */}
        <StatCardShell>
          <CardHeader icon={<Box size={28} strokeWidth={2.5} />} title="BLOCK_ACTIVITY" />
          <div className="flex flex-col gap-2 flex-1">
            <RowBg>
              <Cell icon={<Box size={14} strokeWidth={2.5} />} label="Block Height">
                {blockHeightStr}
              </Cell>
              <Cell icon={<ArrowLeftRight size={14} strokeWidth={2.5} />} label="Total Txns">
                {totalTxStr}
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
        </StatCardShell>

        {/* CARD 4 — PARTICIPANTS · 2×2 with shared row backgrounds */}
        <StatCardShell>
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
        </StatCardShell>

      </div>

      {/* ── TPS CHART ────────────────────────────────────────────── */}
      {tpsHistory.length > 1 && (
        <Panel className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} className="text-awz-gold" />
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-awz-muted">Throughput · Tx/s</span>
            <span className="ml-auto font-mono text-xs font-semibold text-awz-gold">
              {tps.toFixed(2)} tx/s
            </span>
          </div>
          <ResponsiveContainer width="100%" height={96}>
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
        </Panel>
      )}

      {/* ── RECENT ACTIVITY ──────────────────────────────────────── */}
      <SectionLabel>Recent Activity</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 -mt-1">
        {/* Transactions read first on mobile (stacked); blocks stay on the
            left once side-by-side at sm: and up. */}
        <div className="order-2 sm:order-1">
          <RecentBlocksList blocks={idxBlocks} />
        </div>
        <div className="order-1 sm:order-2">
          <RecentTransactionsList transfers={recentTransfers ?? []} />
        </div>
      </div>

      {/* ── NETWORK ──────────────────────────────────────────────── */}
      <SectionLabel>Network</SectionLabel>
      <div className="-mt-1">
        <NetworkInfoCard />
      </div>

    </div>
  )
}
