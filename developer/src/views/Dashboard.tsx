'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Lock, CheckCircle2, Circle, Megaphone, Inbox,
  Coins, BarChart3, Wallet, Archive,
} from 'lucide-react'
import { useWalletStore } from '../store/walletStore'
import StatCard from '../components/ui/StatCard'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { INDEXER_ENDPOINT, MIN_DEVELOPER_STAKE_RIZ } from '../constants'

// devStatus.stake comes back as a formatted string ("5,000.0000 RIZ")
// from the SDK, not a number — parse it back out for the progress bar.
function parseStakeRiz(stake: string): number {
  return parseFloat(stake.replace(/,/g, '').replace(' RIZ', '')) || 0
}

// awarizon.js doesn't export DeveloperStatus from its package entrypoint
// (only defined internally in modules/developer.ts), so this is typed
// loosely rather than importing a type that isn't part of the public API.
export default function Dashboard() {
  const { signer, provider, connected, address } =
    useWalletStore()

  const [devStatus, setDevStatus] =
    useState<any>(null)
  const [walletBalance, setWalletBalance] =
    useState<{ free: string; reserved: string; total: string } | null>(null)
  const [campaigns, setCampaigns] =
    useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] =
    useState(false)
  const [staking, setStaking] = useState(false)
  const [stakeAmount, setStakeAmount] = useState('')
  const [error, setError] = useState<string | null>(
    null
  )

  useEffect(() => {
    // Reset synchronously before the async fetch, not after — otherwise
    // switching accounts (disconnect + reconnect as someone else,
    // without a full page reload) leaves the PREVIOUS account's
    // devStatus on screen for the duration of this fetch. That stale
    // status (e.g. registered-but-unverified) can render the stake
    // form while `signer` already points at the new address, letting
    // a stake attempt fire against an account with no DeveloperProfile
    // at all — which the chain rejects as DeveloperNotFound.
    setDevStatus(null)
    setWalletBalance(null)
    setCampaigns([])
    setLoading(true)

    async function load() {
      if (!provider || !address) return
      try {
        const status =
          await provider.developer.status(address)
        setDevStatus(status)

        const balance = await provider.wallet.balance(address)
        setWalletBalance({
          free: balance.free,
          reserved: balance.reserved,
          total: balance.total,
        })

        const res = await fetch(
          `${INDEXER_ENDPOINT}` +
          `/campaign-events?developer=${address}` +
          `&limit=5`
        ).then(r => r.json()).catch(() => ({ events: [] }))
        setCampaigns(res.events ?? [])
      } catch {}
      setLoading(false)
    }
    load()
  }, [provider, address])

  // Reserved balance is stake + storage deposits (manifests + campaigns).
  // Subtracting stake out of reserved leaves the storage-deposit portion.
  const storageFees = useMemo(() => {
    if (!walletBalance || !devStatus) return null
    try {
      const parseRiz = (s: string) => parseFloat(s.replace(/[^0-9.]/g, ''))
      const reserved = parseRiz(walletBalance.reserved)
      const stake = parseRiz(devStatus.stake)
      const fees = Math.max(0, reserved - stake)
      return fees.toLocaleString(undefined, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      }) + ' RIZ'
    } catch {
      return null
    }
  }, [walletBalance, devStatus])

  const handleRegister = async () => {
    if (!signer) return
    setRegistering(true)
    setError(null)
    try {
      await signer.developer.register()
      const status =
        await provider!.developer.status(address!)
      setDevStatus(status)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRegistering(false)
    }
  }

  const handleStake = async () => {
    if (!signer || !stakeAmount) return
    setStaking(true)
    setError(null)
    try {
      await signer.developer.stake(stakeAmount)
      const status =
        await provider!.developer.status(address!)
      setDevStatus(status)
      setStakeAmount('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setStaking(false)
    }
  }

  if (!connected) {
    return (
      <div className="flex items-center
        justify-center min-h-96">
        <div className="text-center">
          <Lock className="w-16 h-16 mx-auto mb-4 text-[#444]" />
          <h2 className="text-xl font-bold mb-2">
            Connect Your Wallet
          </h2>
          <p className="text-[#888] text-sm">
            Connect to access the developer portal
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row
        sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">
            Developer Dashboard
          </h1>
          <p className="text-[#888] text-sm mt-1">
            Build and distribute apps on Awarizon
          </p>
        </div>
        <Link href="/campaigns/create">
          <Button fullWidth className="sm:w-auto">+ New Campaign</Button>
        </Link>
      </div>

      {!loading && !devStatus && (
        <div className="glass rounded-xl p-6
          border-yellow-400/20 glow-yellow">
          <div className="flex flex-col sm:flex-row
            sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg mb-1">
                Register as Developer
              </h3>
              <p className="text-[#888] text-sm">
                Register your address, then stake at least{' '}
                {MIN_DEVELOPER_STAKE_RIZ.toLocaleString()} RIZ to
                get verified — verification is required before you
                can register apps or create campaigns.
              </p>
            </div>
            <Button
              loading={registering}
              onClick={handleRegister}
              fullWidth
              className="sm:w-auto flex-shrink-0"
            >
              Register Now
            </Button>
          </div>
          {error && (
            <p className="text-red-400 text-sm mt-3">
              {error}
            </p>
          )}
        </div>
      )}

      {devStatus && !devStatus.verified && (() => {
        const staked = parseStakeRiz(devStatus.stake)
        const remaining = Math.max(0, MIN_DEVELOPER_STAKE_RIZ - staked)
        const pct = Math.min(
          100, (staked / MIN_DEVELOPER_STAKE_RIZ) * 100
        )
        return (
          <div className="glass rounded-xl p-6
            border-yellow-400/20 glow-yellow space-y-4">
            <div>
              <h3 className="font-bold text-lg mb-1">
                Stake RIZ to Get Verified
              </h3>
              <p className="text-[#888] text-sm">
                Registering apps and creating campaigns both
                require a verified developer status. Stake at
                least {remaining.toLocaleString()} more RIZ to
                cross the {MIN_DEVELOPER_STAKE_RIZ.toLocaleString()}{' '}
                RIZ threshold.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between
                text-xs text-[#888] mb-1.5">
                <span>{devStatus.stake} staked</span>
                <span>
                  {MIN_DEVELOPER_STAKE_RIZ.toLocaleString()} RIZ
                  required
                </span>
              </div>
              <div className="bg-dev-surface2 rounded-full h-2
                overflow-hidden">
                <div
                  className="bg-yellow-400 h-full rounded-full
                    transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <input
                type="number"
                value={stakeAmount}
                onChange={e => setStakeAmount(e.target.value)}
                placeholder={`e.g. ${remaining}`}
                className="flex-1 bg-dev-surface2
                  border border-dev-border rounded-xl
                  px-4 py-3 text-sm text-white
                  placeholder-[#444]
                  focus:outline-none
                  focus:border-yellow-400/50"
              />
              <Button
                loading={staking}
                disabled={!stakeAmount || staking}
                onClick={handleStake}
              >
                Stake RIZ
              </Button>
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
          </div>
        )
      })()}

      {devStatus && (
        <div className="grid grid-cols-2
          lg:grid-cols-4 gap-4">
          <StatCard
            label="Status"
            value={devStatus.verified
              ? 'Verified' : 'Active'
            }
            icon={devStatus.verified ? CheckCircle2 : Circle}
            accent={devStatus.verified}
          />
          <StatCard
            label="Staked RIZ"
            value={devStatus.stake}
            icon={Lock}
          />
          <StatCard
            label="Campaigns"
            value={devStatus.campaigns}
            icon={Megaphone}
          />
          <StatCard
            label="Total Deliveries"
            value={devStatus.deliveries
              .toLocaleString()}
            icon={Inbox}
          />
          <StatCard
            label="Free Balance"
            value={walletBalance?.free ?? '—'}
            icon={Wallet}
            tooltip="Spendable RIZ in your wallet"
          />
          <StatCard
            label="Reserved"
            value={walletBalance?.reserved ?? '—'}
            icon={Lock}
            tooltip="RIZ locked by chain as deposits"
          />
          <StatCard
            label="Storage Deposits"
            value={storageFees ?? '—'}
            icon={Archive}
            tooltip={
              'RIZ reserved as storage deposits for your manifests ' +
              'and campaigns. Released when items are deleted.'
            }
          />
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b
          border-dev-border flex items-center
          justify-between">
          <h2 className="font-bold">
            Recent Campaigns
          </h2>
          <Link href="/campaigns"
            className="text-yellow-400 text-sm
              hover:text-yellow-300">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center
            text-[#888]">
            Loading...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[#888] text-sm mb-4">
              No campaigns yet
            </p>
            <Link href="/campaigns/create">
              <Button size="sm">
                Create Your First Campaign
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y
            divide-dev-border">
            {campaigns.map((c, i) => {
              // Indexer returns camelCase (campaignId, eventType) —
              // kept the snake_case fallback in case an older/other
              // indexer deployment still returns the old shape.
              const campaignId = c.campaignId ?? c.campaign_id
              const eventType = c.eventType ?? c.event_type
              return (
                <div key={i}
                  className="px-5 py-4 flex items-center
                    justify-between">
                  <div>
                    <p className="font-mono text-sm
                      text-[#888]">
                      {campaignId?.slice(0, 16)}...
                    </p>
                    <p className="text-xs text-[#555]
                      mt-0.5">
                      {c.category}
                    </p>
                  </div>
                  <Badge
                    label={eventType ?? 'active'}
                    variant={
                      eventType === 'created'
                        ? 'success'
                        : 'default'
                    }
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {devStatus && (
        <div className="grid grid-cols-2
          lg:grid-cols-3 gap-4">
          {[
            {
              icon: Megaphone,
              title: 'Create Campaign',
              desc: 'Distribute your app to users',
              path: '/campaigns/create',
            },
            {
              icon: Coins,
              title: 'Create Token',
              desc: 'Launch a token on Awarizon',
              path: '/tokens',
            },
            {
              icon: BarChart3,
              title: 'View Analytics',
              desc: 'Campaign performance data',
              path: '/analytics',
            },
          ].map(action => (
            <Link key={action.path} href={action.path}>
              <div className="glass rounded-xl p-5
                hover:border-yellow-400/30
                transition-all cursor-pointer h-full">
                <div className="mb-3">
                  <action.icon className="w-6 h-6 text-yellow-400" />
                </div>
                <h3 className="font-bold text-sm mb-1">
                  {action.title}
                </h3>
                <p className="text-[#888] text-xs">
                  {action.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
