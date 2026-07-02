import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useBalance, useInboxCount, useWalletTargetingProfile } from '../api/queries'
import { StatCard } from '../components/ui/StatCard'
import { RizAmount } from '../components/ui/RizAmount'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge } from '../components/ui/Badge'
import type { WalletTargetingProfile } from '@awarizon/sdk'

function AccountInfo({ address }: { address: string }) {
  const { data: balance, isLoading: bLoading } = useBalance(address)
  const { data: inboxCount } = useInboxCount(address)
  const { data: targetingProfile } = useWalletTargetingProfile(address)

  const tp = targetingProfile as WalletTargetingProfile | undefined | null

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-awz-muted text-xs font-mono tracking-widest uppercase">
          ACCOUNT_INFO
        </span>
        <div className="flex-1 h-px bg-awz-border" />
      </div>

      <div className="border border-awz-border rounded-sm overflow-hidden">
        <div className="px-4 py-3">
          <span className="text-awz-muted text-xs font-mono">ADDRESS</span>
          <p className="text-awz-text text-xs font-mono mt-1 break-all">{address}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="FREE BALANCE"
          value={
            bLoading
              ? '—'
              : balance !== undefined
              ? <RizAmount planck={balance as bigint} decimals={4} />
              : '—'
          }
        />
        <StatCard
          label="INBOX ITEMS"
          value={inboxCount !== undefined ? String(inboxCount) : '—'}
        />
      </div>

      {tp && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-awz-muted text-xs font-mono tracking-widest uppercase">
              TARGETING_PROFILE
            </span>
            <div className="flex-1 h-px bg-awz-border" />
          </div>
          <div className="border border-awz-border rounded-sm overflow-hidden">
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-awz-border">
                  <td className="px-4 py-3 text-awz-muted font-mono w-40">WALLET AGE</td>
                  <td className="px-4 py-3 font-mono text-awz-text">{tp.wallet_age_days} days</td>
                </tr>
                <tr className="border-b border-awz-border">
                  <td className="px-4 py-3 text-awz-muted font-mono">ACTIVITY COUNT</td>
                  <td className="px-4 py-3 font-mono text-awz-text">{tp.activity_count}</td>
                </tr>
                <tr className="border-b border-awz-border">
                  <td className="px-4 py-3 text-awz-muted font-mono">REGION CODE</td>
                  <td className="px-4 py-3 font-mono text-awz-text">{tp.region_code}</td>
                </tr>
                {tp.category_history.length > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-awz-muted font-mono">CATEGORIES</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {tp.category_history.map((cat, i) => (
                          <Badge key={i} label={String(cat)} variant="muted" />
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {targetingProfile === null && (
        <EmptyState message="NO TARGETING PROFILE" code="not_opted_in" />
      )}
    </div>
  )
}

export function Account() {
  const [searchParams] = useSearchParams()
  const [address, setAddress] = useState('')
  const [submitted, setSubmitted] = useState('')

  // Pre-fill from header search (?address=...)
  useEffect(() => {
    const a = searchParams.get('address')
    if (a) { setAddress(a); setSubmitted(a) }
  }, [searchParams])

  function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    const a = address.trim()
    if (a) setSubmitted(a)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-awz-muted text-xs font-mono tracking-widest uppercase">
          ACCOUNT_LOOKUP
        </span>
        <div className="flex-1 h-px bg-awz-border" />
      </div>

      <form onSubmit={handleLookup} className="flex gap-3 max-w-lg">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="SS58_ADDRESS"
          className="flex-1 bg-awz-surface border border-awz-border rounded-sm px-3 py-2 text-xs font-mono text-awz-text placeholder:text-awz-muted focus:outline-none focus:border-awz-green transition-colors"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-awz-surface border border-awz-green text-awz-green text-xs font-mono rounded-sm hover:bg-awz-green/10 transition-colors"
        >
          LOOKUP
        </button>
      </form>

      {submitted && <AccountInfo address={submitted} />}
    </div>
  )
}
