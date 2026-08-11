'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { useDeveloperStatus } from '../hooks/useDeveloperStatus'

// register_manifest and create_campaign are the only two calls that
// actually hard-reject on-chain without Verified (staked >=
// VerificationStakeThreshold) status — everywhere else in the portal
// (token creation, analytics, viewing apps/campaigns) needs nothing
// past free registration. Render this only around those two forms,
// not as a blanket warning across every gated route.
export default function VerifiedNotice() {
  const { status, loading } = useDeveloperStatus()

  if (loading || !status || status.verified) return null

  return (
    <div className="glass rounded-xl p-4
      border-yellow-400/20 flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 text-yellow-400
        flex-shrink-0" />
      <p className="text-sm text-[#888]">
        You're registered but not verified yet — stake more
        RIZ to unlock this.
        {' '}
        <Link href="/dashboard" className="text-yellow-400
          hover:text-yellow-300 font-semibold">
          Go to Dashboard
        </Link>
      </p>
    </div>
  )
}
