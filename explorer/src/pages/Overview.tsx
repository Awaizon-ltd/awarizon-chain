import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Coins, Lock, Timer, RefreshCw, Clock, Shield,
  Box, ArrowLeftRight, Inbox, Zap,
  Users, Wallet, Megaphone, Send, PiggyBank,
} from 'lucide-react'
import { RiStackLine, RiExchangeLine } from 'react-icons/ri'
import { TbCube, TbArrowsExchange, TbBolt, TbCircleCheck } from 'react-icons/tb'
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

function truncHash(hash: string): string {
  if (!hash || hash.length < 12) return hash
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`
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
    <div className={`bg-awz-surface border border-awz-border rounded-xl p-5 sm:p-6 flex flex-col gap-4 ${className}`}>
      {children}
    </div>
  )
}

function CardHeader({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-1 border-b border-awz-border">
      <span className="text-awz-gold">{icon}</span>
      <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.18em] text-awz-muted">
        {title}
      </span>
    </div>
  )
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-awz-muted/70">{icon}</span>
        <span className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-awz-muted">
          {label}
        </span>
      </div>
      <div className="font-mono font-semibold text-awz-text text-xl sm:text-2xl leading-none">
        {children}
      </div>
    </div>
  )
}

function Divider() {
  return <div className="h-px w-full bg-awz-border" />
}

function LiveDot() {
  return <span className="w-1.5 h-1.5 rounded-full bg-awz-gold inline-block animate-pulse flex-shrink-0" />
}

/* ── Recent Blocks panel ─────────────────────────────────────────── */
function RecentBlocksList({ blocks }: { blocks: BlockInfo[] }) {
  return (
    <div className="bg-awz-surface border border-awz-border rounded-xl flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-awz-border">
        <RiStackLine size={16} className="text-awz-gold" />
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-awz-muted">
          Recent Blocks
        </span>
        <span className="ml-auto"><LiveDot /></span>
      </div>
      <div className="overflow-y-auto max-h-72 divide-y divide-awz-border">
        {blocks.length === 0 ? (
          <div className="px-4 py-6 text-center text-awz-muted text-xs font-mono">
            Waiting for first block…
          </div>
        ) : (
          blocks.map((b) => (
            <div key={b.number} className="flex items-center gap-3 px-4 py-2.5">
              <TbCube size={14} className="text-awz-gold flex-shrink-0" />
              <span className="font-mono text-sm font-semibold text-awz-text min-w-[56px]">
                #{b.number.toLocaleString()}
              </span>
              <span className="font-mono text-xs text-awz-muted flex-1 truncate">
                {truncHash(b.hash)}
              </span>
              <span className="font-mono text-xs text-awz-muted flex-shrink-0">
                {b.extrinsicCount} tx
              </span>
              <span className="font-mono text-xs text-awz-muted/60 flex-shrink-0">
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
    <div className="bg-awz-surface border border-awz-border rounded-xl flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-awz-border">
        <RiExchangeLine size={16} className="text-awz-gold" />
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-awz-muted">
          Recent Transactions
        </span>
        <span className="ml-auto"><LiveDot /></span>
      </div>
      <div className="overflow-y-auto max-h-72 divide-y divide-awz-border">
        {txs.length === 0 ? (
          <div className="px-4 py-6 text-center text-awz-muted text-xs font-mono">
            Waiting for first block…
          </div>
        ) : (
          txs.map((tx, i) => (
            <div key={`${tx.blockNumber}-${tx.index}-${i}`} className="flex items-center gap-2 px-4 py-2.5 min-w-0">
              {tx.isSigned
                ? <TbArrowsExchange size={14} className="text-awz-gold flex-shrink-0" />
                : <TbBolt size={14} className="text-awz-muted/60 flex-shrink-0" />
              }
              <span className="font-mono text-xs text-awz-text font-medium truncate flex-1 min-w-0">
                {tx.section}.{tx.method}
              </span>
              <span className="font-mono text-xs text-awz-muted flex-shrink-0">
                #{tx.blockNumber}
              </span>
              <span className="font-mono text-xs text-awz-muted/60 flex-shrink-0">
                {timeAgo(tx.timestamp)}
              </span>
              {tx.isSigned && (
                <span className="flex items-center gap-0.5 text-awz-gold text-[10px] font-mono flex-shrink-0">
                  <TbCircleCheck size={11} />
                  SIGNED
                </span>
              )}
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

  /* ── derived ────────────────────────────────────────────────── */
  const epochCountdown  = latestBlockNumber > 0 ? calcEpochCountdown(latestBlockNumber) : '———'
  const tpsStr          = latestBlockNumber > 0 ? tps.toFixed(2) : null

  const supplyStr      = totalIssuance !== null    ? formatRizComma(totalIssuance)                  : '———'
  const stakedStr      = stats !== undefined        ? formatRizStr(stats.total_staked)               : '———'
  const epochStr       = stats !== undefined        ? stats.current_epoch.toLocaleString()           : '———'
  const validatorStr   = validatorCount !== undefined ? Number(validatorCount).toLocaleString()      : '———'
  const blockHeightStr = latestBlockNumber > 0      ? `#${latestBlockNumber.toLocaleString()}`       : '———'
  const totalExtStr    = stats !== undefined        ? stats.total_extrinsics.toLocaleString()        : '———'
  const deliveriesStr  = stats !== undefined        ? stats.total_deliveries.toLocaleString()        : '———'
  const walletsStr     = stats !== undefined        ? stats.total_wallets.toLocaleString()           : '———'
  const campaignsStr   = stats !== undefined        ? stats.active_campaigns.toLocaleString()        : '———'
  const inboxStr       = stats !== undefined        ? formatRizStr(stats.inbox_reserve_balance, 2)   : '———'

  return (
    <div className="flex flex-col gap-4 sm:gap-5">

      {/* ── CARD 1 — RIZ SUPPLY ──────────────────────────────────── */}
      <Card>
        <CardHeader icon={<Coins size={18} />} title="RIZ_SUPPLY" />

        <Row icon={<RizIcon size={13} />} label="Total Supply">
          {supplyStr}
          <span className="text-awz-muted text-sm font-normal ml-1.5">RIZ</span>
        </Row>

        <Divider />

        <Row icon={<Lock size={13} />} label="Staked">
          {stakedStr}
          <span className="text-awz-muted text-sm font-normal ml-1.5">RIZ</span>
        </Row>
      </Card>

      {/* ── CARD 2 — EPOCH STATUS ────────────────────────────────── */}
      <Card>
        <CardHeader icon={<Timer size={18} />} title="EPOCH_STATUS" />

        <Row icon={<RefreshCw size={13} />} label="Current Epoch">
          {epochStr}
        </Row>

        <Divider />

        <Row icon={<Clock size={13} />} label="Next Epoch In">
          {epochCountdown}
        </Row>

        <Divider />

        <Row icon={<Shield size={13} />} label="Active Validators">
          {validatorStr}
        </Row>
      </Card>

      {/* ── CARD 3 — BLOCK ACTIVITY ──────────────────────────────── */}
      <Card>
        <CardHeader icon={<Box size={18} />} title="BLOCK_ACTIVITY" />

        <Row icon={<Box size={13} />} label="Block Height">
          {blockHeightStr}
        </Row>

        <Divider />

        <Row icon={<ArrowLeftRight size={13} />} label="Total Transactions">
          {totalExtStr}
        </Row>

        <Divider />

        <Row icon={<Inbox size={13} />} label="Deliveries">
          {deliveriesStr}
        </Row>

        <Divider />

        {/* TPS with sub-note */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Zap size={13} className="text-awz-muted/70" />
            <span className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-awz-muted">
              Est. TPS
            </span>
          </div>
          <div className="font-mono font-semibold text-awz-text text-xl sm:text-2xl leading-none">
            {tpsStr !== null ? `${tpsStr} tx/s` : '———'}
          </div>
          <div className="text-[10px] font-mono text-awz-muted tracking-wider">BLOCK TIME 3s</div>
        </div>
      </Card>

      {/* ── CARD 4 — NETWORK PARTICIPANTS ────────────────────────── */}
      <Card>
        <CardHeader icon={<Users size={18} />} title="NETWORK_PARTICIPANTS" />

        <Row icon={<Wallet size={13} />} label="Total Wallets">
          {walletsStr}
        </Row>

        <Divider />

        <Row icon={<Megaphone size={13} />} label="Active Campaigns">
          {campaignsStr}
        </Row>

        <Divider />

        <Row icon={<Send size={13} />} label="Total Deliveries">
          {deliveriesStr}
        </Row>

        <Divider />

        <Row icon={<PiggyBank size={13} />} label="Inbox Reserve">
          {inboxStr}
          <span className="text-awz-muted text-sm font-normal ml-1.5">RIZ</span>
        </Row>
      </Card>

      {/* ── RECENT ACTIVITY ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.18em] text-awz-muted">
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
