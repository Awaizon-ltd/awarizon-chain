'use client'
import { useEffect, useState } from 'react'
import type { ValidatorInfo } from 'awarizon.js'
import { useChain } from '../../hooks/useChain'
import StatCard from '../ui/StatCard'

function avgBps(list: ValidatorInfo[], pick: (v: ValidatorInfo) => number): string {
  if (!list.length) return '—'
  const avg = list.reduce((acc, v) => acc + pick(v), 0) / list.length
  return `${(avg / 100).toFixed(1)}%`
}

// Network-wide health, aggregated client-side from validators.list() —
// the same three performance dimensions (uptime/finality/blocks) shown
// per-validator on the dashboard, rolled up here as the network view.
export default function PerformanceSummary() {
  const { provider } = useChain()
  const [validators, setValidators] = useState<ValidatorInfo[] | null>(null)

  useEffect(() => {
    if (!provider) return
    let cancelled = false
    provider.validators.list()
      .then(list => { if (!cancelled) setValidators(list) })
      .catch(console.error)
    return () => { cancelled = true }
  }, [provider])

  const totalSlashes = validators?.reduce((acc, v) => acc + v.slashCount, 0) ?? undefined

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Avg Uptime"
        value={validators ? avgBps(validators, v => v.uptimeBps) : '—'} />
      <StatCard label="Avg Finality"
        value={validators ? avgBps(validators, v => v.finalityBps) : '—'} />
      <StatCard label="Avg Blocks Produced"
        value={validators ? avgBps(validators, v => v.blocksBps) : '—'} />
      <StatCard label="Total Slashes"
        value={totalSlashes !== undefined ? totalSlashes.toLocaleString() : '—'} />
    </div>
  )
}
