'use client'

import { useEffect, useState } from 'react'

interface Request {
  address: string
  amount: string
  txHash: string
  createdAt: string
}

function timeAgo(ts: string): string {
  const s = Math.floor(
    (Date.now() - new Date(ts).getTime()) / 1000
  )
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400)
    return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function truncate(addr: string): string {
  if (addr.endsWith('.riz')) return addr
  return `${addr.slice(0, 8)}...${addr.slice(-4)}`
}

export default function RecentRequests() {
  const [requests, setRequests] = useState<Request[]>(
    []
  )

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/status')
        const data = await res.json()
        setRequests(data.recentRequests ?? [])
      } catch {}
    }
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [])

  if (requests.length === 0) return null

  return (
    <div className="rounded-2xl border border-white/5
      bg-[#111111] overflow-hidden">

      <div className="px-4 py-3 border-b
        border-white/5">
        <p className="text-xs font-mono
          text-[#444444] tracking-widest uppercase">
          Recent Requests
        </p>
      </div>

      <div className="divide-y divide-white/[0.03]">
        {requests.map((req, i) => (
          <div
            key={i}
            className="flex items-center
              justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg
                bg-[#FFCC00]/10 flex items-center
                justify-center flex-shrink-0">
                <span className="text-[#FFCC00]
                  text-xs font-bold">
                  ◈
                </span>
              </div>
              <div>
                <p className="text-white text-sm
                  font-mono">
                  {truncate(req.address)}
                </p>
                <p className="text-[#444444] text-xs">
                  {timeAgo(req.createdAt)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[#FFCC00] text-sm
                font-bold font-mono">
                +{req.amount} RIZ
              </p>
              {req.txHash && (
                <a
                  href={
                    `https://rizscan.awarizon.com/tx/`
                    + req.txHash
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#444444] text-xs
                    hover:text-[#FFCC00]
                    transition-colors font-mono"
                >
                  {req.txHash.slice(0, 8)}... ↗
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
