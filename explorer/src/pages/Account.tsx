import { useState, useEffect, type ReactNode } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Copy, CheckCheck, Wallet, Mail, Globe, ShieldCheck,
  ShieldOff, Star, Activity, MapPin, Tag, Clock, Hash, Info,
  CircleAlert, ArrowUpRight, Database,
} from 'lucide-react'
import { TbArrowsExchange, TbUserCircle, TbCode } from 'react-icons/tb'
import makeBlockie from 'ethereum-blockies-base64'
import {
  useIdentity, useAccountInfo, useInboxCount,
  useWalletTargetingProfile, useDeveloperProfile,
  useDeveloperCampaigns, useDeveloperManifests,
} from '../api/queries'
import { getTxsByAddress } from '../db/chainDb'
import { useIndexerStatus } from '../db/IndexerContext'
import { formatRizAmount as fmtRiz } from '../lib/formatRiz'
import type { WalletTargetingProfile, DeveloperProfile } from '@awarizon/sdk'
import type { StoredTx } from '../db/chainDb'

function fmtDate(ts: number): string {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function timeAgo(ts: number): string {
  if (!ts) return '—'
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

/* ── copy button ──────────────────────────────────────────────────── */
function CopyBtn({ text, size = 14 }: { text: string; size?: number }) {
  const [copied, setCopied] = useState(false)
  function copy(e: React.MouseEvent) {
    e.preventDefault()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="text-awz-muted/40 hover:text-awz-gold transition-colors flex-shrink-0" title="Copy">
      {copied ? <CheckCheck size={size} className="text-awz-gold" /> : <Copy size={size} />}
    </button>
  )
}

/* ── card shell ────────────────────────────────────────────────────── */
function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-awz-surface border border-awz-border rounded-xl overflow-hidden shadow-lg ${className}`}>
      {children}
    </div>
  )
}

function CardHeader({ icon, title, badge }: { icon: ReactNode; title: string; badge?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-awz-border">
      <div className="flex items-center gap-2.5">
        <span className="text-awz-gold">{icon}</span>
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-awz-muted font-semibold">{title}</span>
      </div>
      {badge}
    </div>
  )
}

function DataRow({ label, hint, children, mono = false }: {
  label: string; hint?: string; children: ReactNode; mono?: boolean
}) {
  return (
    <div className="px-5 py-3.5 flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-awz-muted/60">{label}</span>
        {hint && (
          <span className="group relative">
            <Info size={10} className="text-awz-muted/30 cursor-help" />
            <span className="absolute bottom-5 left-0 w-52 bg-awz-bg border border-awz-border rounded-lg px-3 py-2 text-xs text-awz-text font-sans leading-snug opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
              {hint}
            </span>
          </span>
        )}
      </div>
      <div className={`text-awz-text text-sm leading-snug break-all ${mono ? 'font-mono' : 'font-sans'}`}>
        {children}
      </div>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-awz-border/40 mx-5" />
}

/* ── balance mini card ────────────────────────────────────────────── */
function BalCard({ label, hint, value, sub, icon }: {
  label: string; hint?: string; value: ReactNode; sub?: string; icon: ReactNode
}) {
  return (
    <div className="bg-awz-surface border border-awz-border rounded-xl p-4 flex flex-col gap-2 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-awz-muted/70">{label}</span>
          {hint && (
            <span className="group relative">
              <Info size={10} className="text-awz-muted/30 cursor-help" />
              <span className="absolute bottom-5 left-0 w-52 bg-awz-bg border border-awz-border rounded-lg px-3 py-2 text-xs text-awz-text font-sans leading-snug opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                {hint}
              </span>
            </span>
          )}
        </div>
        <span className="text-awz-gold/50">{icon}</span>
      </div>
      <div className="font-mono font-bold text-lg text-awz-text leading-tight">{value}</div>
      {sub && <div className="text-[10px] text-awz-muted/50 font-mono">{sub}</div>}
    </div>
  )
}

/* ── category badge ─────────────────────────────────────────────────── */
function CatBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-awz-gold/10 border border-awz-gold/20 text-awz-gold text-[10px] font-mono font-semibold uppercase tracking-wide">
      <Tag size={9} /> {String(label)}
    </span>
  )
}

/* ── tx type badge ────────────────────────────────────────────────── */
function TxTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    Transfer:   'bg-awz-gold/10 text-awz-gold border-awz-gold/20',
    System:     'bg-awz-border/40 text-awz-muted border-awz-border',
    Identity:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Campaign:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
    Developer:  'bg-green-500/10 text-green-400 border-green-500/20',
    Validator:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  }
  const cls = map[type] ?? 'bg-awz-surface text-awz-muted border-awz-border'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold uppercase tracking-wide border ${cls}`}>
      {type}
    </span>
  )
}

/* ── transaction history ──────────────────────────────────────────── */
function TxHistory({ address }: { address: string }) {
  const [txs, setTxs] = useState<StoredTx[]>([])
  const [loading, setLoading] = useState(true)
  const indexerStatus = useIndexerStatus()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getTxsByAddress(address, 50).then(list => {
      if (!cancelled) { setTxs(list); setLoading(false) }
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [address, indexerStatus.blockCount]) // re-run when indexer adds new blocks

  const userTxs = txs.filter(t => t.section !== 'timestamp' && t.section !== 'parachainSystem')

  return (
    <Card>
      <CardHeader
        icon={<TbArrowsExchange size={15} />}
        title={`Transaction History (${userTxs.length})`}
        badge={
          indexerStatus.isBackfilling
            ? <span className="flex items-center gap-1 text-[10px] font-mono text-awz-yellow animate-pulse">
                <Database size={10} /> Indexing…
              </span>
            : <span className="flex items-center gap-1 text-[10px] font-mono text-awz-muted/40">
                <Database size={10} /> {indexerStatus.blockCount.toLocaleString()} blocks indexed
              </span>
        }
      />
      {loading ? (
        <div className="px-5 py-8 text-center">
          <p className="text-awz-muted text-xs font-mono animate-pulse">Loading transactions…</p>
        </div>
      ) : userTxs.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <TbArrowsExchange size={32} className="text-awz-muted/20 mx-auto mb-3" />
          <p className="text-awz-text text-sm mb-1">No transactions found</p>
          <p className="text-awz-muted text-xs">
            {indexerStatus.isBackfilling
              ? 'Still indexing historical blocks — check back shortly.'
              : 'This address has no signed transactions in the indexed history.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-awz-border/40">
          {userTxs.map((tx) => (
            <Link
              key={tx.id}
              to={`/tx/${tx.blockNumber}/${tx.txIndex}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-awz-gold/5 transition-colors group"
            >
              {/* icon */}
              <div className="w-8 h-8 rounded-lg bg-awz-gold/10 border border-awz-gold/20 flex items-center justify-center flex-shrink-0">
                <TbArrowsExchange size={14} className="text-awz-gold" />
              </div>

              {/* main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-mono text-xs text-awz-text font-medium">
                    {tx.section}<span className="text-awz-muted">.</span>{tx.method}
                  </span>
                  <TxTypeBadge type={tx.type} />
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-awz-muted/60">
                  <span>Block #{tx.blockNumber.toLocaleString()}</span>
                  <span>·</span>
                  <span className="text-awz-muted/40 truncate max-w-36">
                    {tx.hash.slice(0, 10)}…{tx.hash.slice(-6)}
                  </span>
                </div>
              </div>

              {/* time */}
              <div className="text-right flex-shrink-0">
                <div className="text-[10px] font-mono text-awz-muted/50 flex items-center gap-1">
                  <Clock size={9} />
                  {tx.timestamp > 0 ? timeAgo(tx.timestamp) : '—'}
                </div>
              </div>

              <ArrowUpRight size={13} className="text-awz-muted/20 group-hover:text-awz-gold transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {userTxs.length >= 50 && (
        <div className="px-5 py-3 border-t border-awz-border/40 text-center">
          <p className="text-awz-muted/50 text-[10px] font-mono">Showing last 50 transactions</p>
        </div>
      )}
    </Card>
  )
}

/* ── account info ─────────────────────────────────────────────────── */
function AccountInfo({ address }: { address: string }) {
  const { data: accountInfo, isLoading: infoLoading } = useAccountInfo(address)
  const { data: identity, isLoading: identLoading } = useIdentity(address)
  const { data: inboxCount } = useInboxCount(address)
  const { data: targetingProfile } = useWalletTargetingProfile(address)
  const { data: developerProfile } = useDeveloperProfile(address)
  const { data: developerCampaigns } = useDeveloperCampaigns(address)
  const { data: developerManifests } = useDeveloperManifests(address)

  const tp = targetingProfile as WalletTargetingProfile | undefined | null
  const hasIdentity = !!identity
  const hasDeveloper = !!developerProfile
  const devCampaigns = (developerCampaigns as string[]) ?? []
  const devManifests = (developerManifests as string[]) ?? []

  const isNewAccount =
    !infoLoading && accountInfo &&
    accountInfo.free === 0n && accountInfo.reserved === 0n && accountInfo.nonce === 0

  return (
    <div className="flex flex-col gap-5">

      {/* address header card */}
      <Card>
        <div className="px-5 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* blockies + address (always side by side, even on mobile) */}
          <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
            <img
              src={makeBlockie(address)}
              alt="Account avatar"
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg border-2 border-awz-gold/30 object-cover flex-shrink-0"
              style={{ imageRendering: 'pixelated' }}
            />

            <div className="flex-1 min-w-0">
              {hasIdentity && identity.rizNameFull && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-awz-gold text-lg leading-tight">
                    {identity.rizNameFull}
                  </span>
                  {identity.verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono font-semibold">
                      <ShieldCheck size={9} /> Verified
                    </span>
                  )}
                </div>
              )}
              {hasIdentity && identity.displayName && (
                <p className="text-awz-text text-sm font-sans mb-1.5">{identity.displayName}</p>
              )}
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[10px] sm:text-xs text-awz-muted truncate" title={address}>
                  {address}
                </span>
                <CopyBtn text={address} size={13} />
              </div>
            </div>
          </div>

          {/* flags */}
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            {hasIdentity && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-awz-gold/10 border border-awz-gold/20 text-awz-gold text-[10px] font-mono font-semibold uppercase">
                <TbUserCircle size={11} /> Identity
              </span>
            )}
            {hasDeveloper && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-mono font-semibold uppercase">
                <TbCode size={11} /> Developer
              </span>
            )}
            {tp && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-mono font-semibold uppercase">
                <Activity size={11} /> Active
              </span>
            )}
          </div>
        </div>

        {accountInfo && accountInfo.nonce > 0 && (
          <div className="border-t border-awz-border/50 px-5 py-2.5 flex items-center gap-4 bg-awz-bg/40">
            <span className="text-[10px] font-mono text-awz-muted/60 uppercase tracking-widest">Nonce</span>
            <span className="font-mono text-xs text-awz-text">{accountInfo.nonce}</span>
            <span className="text-awz-border">·</span>
            <span className="text-[10px] font-mono text-awz-muted/60 uppercase tracking-widest">Transactions sent</span>
            <span className="font-mono text-xs text-awz-text">{accountInfo.nonce}</span>
          </div>
        )}
      </Card>

      {isNewAccount && (
        <div className="flex items-center gap-3 px-4 py-3 bg-awz-yellow/5 border border-awz-yellow/20 rounded-xl">
          <CircleAlert size={16} className="text-awz-yellow flex-shrink-0" />
          <p className="text-awz-yellow text-xs font-sans">
            This address has no on-chain activity yet — it may not exist on Awarizon.
          </p>
        </div>
      )}

      {/* balance cards */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-awz-muted/60 mb-3 px-1">Balance</div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <BalCard
            label="Free Balance"
            hint="Transferable balance available for spending or staking"
            icon={<Wallet size={15} />}
            value={infoLoading ? <span className="animate-pulse text-awz-muted">—</span> : `${fmtRiz(accountInfo?.free ?? 0n)} RIZ`}
            sub="Available to transfer"
          />
          <BalCard
            label="Reserved"
            hint="Balance locked by the network for on-chain storage or collateral"
            icon={<Hash size={15} />}
            value={infoLoading ? <span className="animate-pulse text-awz-muted">—</span> : `${fmtRiz(accountInfo?.reserved ?? 0n)} RIZ`}
            sub="Locked by network"
          />
          <BalCard
            label="Total"
            hint="Free + Reserved balance combined"
            icon={<Star size={15} />}
            value={infoLoading ? <span className="animate-pulse text-awz-muted">—</span> : `${fmtRiz(accountInfo?.total ?? 0n)} RIZ`}
            sub="Free + Reserved"
          />
          <BalCard
            label="Inbox Items"
            hint="Ad campaigns delivered to this wallet's inbox"
            icon={<Mail size={15} />}
            value={inboxCount !== undefined ? String(inboxCount) : '—'}
            sub="Unread campaigns"
          />
        </div>
      </div>

      {/* transaction history */}
      <TxHistory address={address} />

      {/* identity card */}
      {!identLoading && (
        hasIdentity ? (
          <Card>
            <CardHeader
              icon={<TbUserCircle size={15} />}
              title="Identity"
              badge={
                identity.verified
                  ? <span className="flex items-center gap-1 text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                      <ShieldCheck size={10} /> Verified
                    </span>
                  : <span className="flex items-center gap-1 text-[10px] font-mono text-awz-muted/50 bg-awz-bg border border-awz-border/50 px-2 py-0.5 rounded-full">
                      <ShieldOff size={10} /> Unverified
                    </span>
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <DataRow label=".riz Name" hint="Unique human-readable name on Awarizon">
                {identity.rizNameFull
                  ? <span className="font-mono text-awz-gold">{identity.rizNameFull}</span>
                  : <span className="text-awz-muted/50">—</span>
                }
              </DataRow>
              <DataRow label="Display Name">
                {identity.displayName ?? <span className="text-awz-muted/50">—</span>}
              </DataRow>
            </div>
            {identity.bio && (
              <>
                <Divider />
                <DataRow label="Bio">
                  <span className="text-awz-muted leading-relaxed">{identity.bio}</span>
                </DataRow>
              </>
            )}
            <Divider />
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <DataRow label="Website">
                {identity.website
                  ? <span className="flex items-center gap-1.5 font-mono text-awz-gold"><Globe size={12} />{identity.website}</span>
                  : <span className="text-awz-muted/50">—</span>
                }
              </DataRow>
              <DataRow label="Member Since">
                {identity.registeredAt
                  ? <span className="flex items-center gap-1.5 text-awz-muted"><Clock size={12} />{fmtDate(identity.registeredAt)}</span>
                  : <span className="text-awz-muted/50">—</span>
                }
              </DataRow>
            </div>
            <Divider />
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <DataRow label="Reputation Score">
                <span className="flex items-center gap-1.5 font-mono font-bold text-awz-gold">
                  <Star size={13} /> {identity.reputationScore ?? 0}
                </span>
              </DataRow>
              <DataRow label="Avatar">
                {identity.avatarUri
                  ? <span className="font-mono text-xs text-awz-muted truncate max-w-xs">{identity.avatarUri}</span>
                  : <span className="text-awz-muted/50">—</span>
                }
              </DataRow>
            </div>
          </Card>
        ) : (
          <Card>
            <CardHeader icon={<TbUserCircle size={15} />} title="Identity" />
            <div className="px-5 py-10 text-center">
              <TbUserCircle size={36} className="text-awz-muted/20 mx-auto mb-3" />
              <p className="text-awz-text text-sm mb-1">No identity registered</p>
              <p className="text-awz-muted text-xs">This wallet hasn't registered a .riz name on Awarizon yet.</p>
            </div>
          </Card>
        )
      )}

      {/* developer profile */}
      {hasDeveloper && developerProfile && (() => {
        const dp = developerProfile as DeveloperProfile
        return (
          <Card>
            <CardHeader
              icon={<TbCode size={15} />}
              title="Developer Profile"
              badge={
                dp.status === 'Verified'
                  ? <span className="flex items-center gap-1 text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                      <ShieldCheck size={10} /> Verified
                    </span>
                  : dp.status === 'Suspended'
                  ? <span className="flex items-center gap-1 text-[10px] font-mono text-awz-red bg-awz-red/10 border border-awz-red/20 px-2 py-0.5 rounded-full">
                      <ShieldOff size={10} /> Suspended
                    </span>
                  : <span className="flex items-center gap-1 text-[10px] font-mono text-awz-muted/50 bg-awz-bg border border-awz-border/50 px-2 py-0.5 rounded-full">
                      <ShieldOff size={10} /> Unverified
                    </span>
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-4">
              <DataRow label="Staked RIZ">{fmtRiz(dp.staked_riz ?? 0n)} RIZ</DataRow>
              <DataRow label="Total Campaigns">{(dp.total_campaigns ?? 0).toLocaleString()}</DataRow>
              <DataRow label="Total Deliveries">{(dp.total_deliveries ?? 0n).toLocaleString()}</DataRow>
              <DataRow label="Violations">
                <span className={(dp.violation_count ?? 0) > 0 ? 'text-awz-red' : undefined}>
                  {(dp.violation_count ?? 0).toLocaleString()}
                </span>
              </DataRow>
            </div>

            {devCampaigns.length > 0 && (
              <>
                <Divider />
                <div className="px-5 py-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-awz-muted/60 mb-3">
                    Campaigns ({devCampaigns.length})
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {devCampaigns.map((cid, i) => (
                      <Link key={i} to={`/campaigns/${cid}`} className="font-mono text-xs text-awz-gold hover:underline break-all">
                        {cid}
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}

            {devManifests.length > 0 && (
              <>
                <Divider />
                <div className="px-5 py-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-awz-muted/60 mb-3">
                    Manifests ({devManifests.length})
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {devManifests.map((mhash, i) => (
                      <span key={i} className="font-mono text-xs text-awz-muted break-all">{mhash}</span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </Card>
        )
      })()}

      {/* targeting profile */}
      {tp ? (
        <Card>
          <CardHeader
            icon={<Activity size={15} />}
            title="Activity Profile"
            badge={
              <span className="text-[10px] font-mono text-awz-muted/50 bg-awz-bg px-2 py-0.5 rounded-full border border-awz-border/50">
                Ad targeting data
              </span>
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-3">
            <DataRow label="Wallet Age" hint="How long this wallet has been active on Awarizon">
              <span className="flex items-center gap-1.5 font-mono">
                <Clock size={13} className="text-awz-muted/50" />
                {tp.wallet_age_days ?? 0} day{(tp.wallet_age_days ?? 0) !== 1 ? 's' : ''}
              </span>
            </DataRow>
            <DataRow label="Activity Count" hint="Total on-chain transactions submitted">
              <span className="flex items-center gap-1.5 font-mono font-bold text-awz-text">
                <Activity size={13} className="text-awz-gold/70" />
                {(tp.activity_count ?? 0).toLocaleString()}
              </span>
            </DataRow>
            <DataRow label="Region">
              <span className="flex items-center gap-1.5 font-mono">
                <MapPin size={13} className="text-awz-muted/50" />
                {(tp.region_code ?? 0) > 0 ? `Region ${tp.region_code}` : <span className="text-awz-muted/50">Not set</span>}
              </span>
            </DataRow>
          </div>
          {(tp.category_history ?? []).length > 0 && (
            <>
              <Divider />
              <div className="px-5 py-4">
                <div className="text-[10px] font-mono uppercase tracking-widest text-awz-muted/60 mb-3">Interest Categories</div>
                <div className="flex flex-wrap gap-2">
                  {(tp.category_history ?? []).map((cat, i) => <CatBadge key={i} label={String(cat)} />)}
                </div>
              </div>
            </>
          )}
        </Card>
      ) : targetingProfile === null ? (
        <Card>
          <CardHeader icon={<Activity size={15} />} title="Activity Profile" />
          <div className="px-5 py-8 text-center">
            <Activity size={32} className="text-awz-muted/20 mx-auto mb-3" />
            <p className="text-awz-text text-sm mb-1">No activity profile</p>
            <p className="text-awz-muted text-xs">This wallet hasn't opted into ad targeting yet.</p>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

/* ── page ──────────────────────────────────────────────────────────── */
export function Account() {
  const [searchParams] = useSearchParams()
  const address = (searchParams.get('address') ?? '').trim()

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <TbUserCircle size={48} className="text-awz-muted/20" />
        <p className="text-awz-text font-mono text-sm">No address provided</p>
        <p className="text-awz-muted text-xs text-center max-w-sm">
          Use the search bar at the top to look up a wallet address or .riz name.
        </p>
      </div>
    )
  }

  return <AccountInfo key={address} address={address} />
}
