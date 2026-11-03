'use client'

import { useEffect, useState } from 'react'

interface Stats {
  totalRequests: number
  totalRizSent: string
  faucetBalance: string
  online: boolean
}

export default function StatusCard() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/status')
        setStats(await res.json())
      } catch {}
    }
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [])

  const items = [
    {
      label: 'REQUESTS',
      value: stats
        ? stats.totalRequests.toLocaleString()
        : '—',
    },
    {
      label: 'RIZ SENT',
      value: stats
        ? `${Number(
            stats.totalRizSent
          ).toLocaleString()} RIZ`
        : '—',
    },
    {
      label: 'BALANCE',
      value: stats?.faucetBalance ?? '—',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(item => (
        <div
          key={item.label}
          className="rounded-xl border border-white/5
            bg-[#111111] p-4 text-center"
        >
          <p className="text-[#444444] text-xs
            font-mono mb-1 tracking-wider">
            {item.label}
          </p>
          <p className="text-white font-bold
            text-sm font-mono">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}
