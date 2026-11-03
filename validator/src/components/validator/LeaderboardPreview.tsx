'use client'

import { useEffect, useState } from 'react'
import type { ValidatorInfo } from 'awarizon.js'
import { useChain } from '../../hooks/useChain'
import ValidatorCard from './ValidatorCard'

// Top-5 preview embedded on the landing page — the full sortable list
// lives at /leaderboard (linked right above this via "View all").
export default function LeaderboardPreview() {
  const { provider } = useChain()
  const [validators, setValidators] = useState<ValidatorInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!provider) return
    let cancelled = false
    provider.validators.list()
      .then(list => {
        if (cancelled) return
        const sorted = list
          .slice()
          .sort((a, b) =>
            (b.uptimeBps + b.finalityBps + b.blocksBps)
            - (a.uptimeBps + a.finalityBps + a.blocksBps))
          .slice(0, 5)
        setValidators(sorted)
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [provider])

  if (loading) {
    return <div className="text-center text-gray-500 py-12">Loading validators...</div>
  }

  if (!validators.length) {
    return (
      <div className="text-center text-gray-500 py-12 border border-gray-800 rounded-xl">
        No validators registered yet — be the first.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {validators.map((v, i) => (
        <ValidatorCard key={v.address} validator={v} rank={i} />
      ))}
    </div>
  )
}
