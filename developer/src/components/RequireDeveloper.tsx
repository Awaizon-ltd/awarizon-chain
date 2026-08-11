'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { useWalletStore } from '../store/walletStore'
import { useDeveloperStatus } from '../hooks/useDeveloperStatus'
import Button from './ui/Button'

// Every feature route (apps, campaigns, analytics, token creator) is
// gated behind this — nothing but the Dashboard (where registering
// and staking actually happens) is usable until the connected account
// is registered. Registration itself is free (no stake required).
//
// Verified (staked >= VerificationStakeThreshold) status is a
// *separate*, narrower requirement — only register_manifest and
// create_campaign hard-reject without it on-chain. Token creation and
// every read-only view need nothing more than registration, so that
// warning lives locally on just those two forms (see VerifiedNotice)
// instead of being shown blanket-wide here, where it used to
// incorrectly imply every gated feature needed a stake.
export default function RequireDeveloper({
  children,
}: {
  children: React.ReactNode
}) {
  const connected = useWalletStore(s => s.connected)
  const { status, loading } = useDeveloperStatus()

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

  if (loading) {
    return (
      <div className="text-center py-20 text-[#888]">
        Loading...
      </div>
    )
  }

  if (!status) {
    return (
      <div className="flex items-center
        justify-center min-h-96">
        <div className="text-center max-w-sm">
          <Lock className="w-16 h-16 mx-auto mb-4 text-[#444]" />
          <h2 className="text-xl font-bold mb-2">
            Register as a Developer First
          </h2>
          <p className="text-[#888] text-sm mb-6">
            This is only available to registered developers.
            Head to the Dashboard to register your address and
            stake RIZ to get verified.
          </p>
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return <div className="space-y-6">{children}</div>
}
