'use client'

import { useEffect, useState } from 'react'

interface Stats {
  blockHeight: number
  totalExtrinsics: number
  currentEpoch: number
  circulatingSupply: string
}

export default function NetworkInfo() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [netRes, blockRes] = await Promise.all([
          fetch('https://rpc.awarizon.com', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: 1,
              jsonrpc: '2.0',
              method: 'awarizon_getNetworkStats',
              params: [],
            }),
          }),
          fetch('https://rpc.awarizon.com', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: 2,
              jsonrpc: '2.0',
              method: 'chain_getHeader',
              params: [],
            }),
          }),
        ])

        const netData = await netRes.json()
        const blockData = await blockRes.json()
        const r = netData.result

        setStats({
          blockHeight: parseInt(
            blockData.result?.number ?? '0',
            16
          ),
          totalExtrinsics: r.total_extrinsics ?? 0,
          currentEpoch: r.current_epoch ?? 0,
          circulatingSupply: (
            Number(r.circulating_supply ?? 0) / 1e12
          ).toLocaleString(undefined, {
            maximumFractionDigits: 0,
          }),
        })
      } catch {}
    }
    load()
    const t = setInterval(load, 6_000)
    return () => clearInterval(t)
  }, [])

  const items = [
    {
      label: 'BLOCK',
      value: stats
        ? `#${stats.blockHeight.toLocaleString()}`
        : '—',
    },
    {
      label: 'EPOCH',
      value: stats?.currentEpoch ?? '—',
    },
    {
      label: 'TRANSACTIONS',
      value: stats
        ? stats.totalExtrinsics.toLocaleString()
        : '—',
    },
    {
      label: 'CIRCULATING',
      value: stats
        ? `${stats.circulatingSupply} RIZ`
        : '—',
    },
  ]

  return (
    <div className="rounded-2xl border border-white/5
      bg-[#111111] p-4">
      <p className="text-xs font-mono text-[#444444]
        uppercase tracking-widest mb-3">
        Network
      </p>
      <div className="grid grid-cols-2 gap-y-3">
        {items.map(item => (
          <div key={item.label}>
            <p className="text-[#444444] text-xs
              font-mono mb-0.5">
              {item.label}
            </p>
            <p className="text-white text-sm
              font-mono font-bold">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
