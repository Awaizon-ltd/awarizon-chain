'use client'

import { useState } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface Result {
  txHash?: string
  amount?: string
  remaining?: string
  error?: string
}

const X_FOLLOWED_KEY = 'awarizon_followed_x'
const X_PROFILE_URL = 'https://x.com/awarizon'

export default function FaucetForm() {
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<Result | null>(
    null
  )
  // sessionStorage (not localStorage) — the gate is meant to reappear
  // next session, not be dismissed forever after one click.
  const [followedX, setFollowedX] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(X_FOLLOWED_KEY) === 'true'
  })

  const handleFollowX = () => {
    sessionStorage.setItem(X_FOLLOWED_KEY, 'true')
    setFollowedX(true)
  }

  const handleSubmit = async () => {
    if (!address.trim()) return

    setStatus('loading')
    setResult(null)

    try {
      const res = await fetch('/api/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: address.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setResult({ error: data.error })
        setStatus('error')
      } else {
        setResult(data)
        setStatus('success')
        setAddress('')
      }
    } catch {
      setResult({ error: 'Network error. Try again.' })
      setStatus('error')
    }
  }

  return (
    <div className="space-y-4">

      {!followedX ? (
        /* Support gate — shown once per session, before the claim form */
        <div className="rounded-xl border
          border-[#FFCC00]/20 bg-[#FFCC00]/5 p-5
          text-center space-y-3">
          <p className="font-bold text-white text-sm">
            Support our mission
          </p>
          <p className="text-xs text-[#8B8B93]">
            Follow @awarizon on X to stay up to date —
            then come back here to claim your RIZ.
          </p>
          <a
            href={X_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleFollowX}
            className="block w-full py-3 px-6 rounded-xl
              bg-[#FFCC00] text-[#0A0A0A]
              font-bold text-sm text-center
              hover:bg-[#FDE047]
              active:bg-[#EAB308]
              transition-all duration-150"
          >
            Follow on X
          </a>
        </div>
      ) : (
        <>
          {/* Address input */}
          <div>
            <label className="block text-sm
              font-semibold text-[#D4D4D8] mb-2">
              Awarizon Address or .riz Name
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSubmit()
              }}
              placeholder="5GrwvaEF... or yourname.riz"
              disabled={status === 'loading'}
              className="w-full px-4 py-3 rounded-xl
                bg-[#0A0A0A] border border-white/10
                text-white placeholder-[#333333]
                font-mono text-sm
                focus:outline-none
                focus:border-[#FFCC00]/50
                focus:ring-1 focus:ring-[#FFCC00]/20
                disabled:opacity-50
                transition-colors"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={
              status === 'loading'
              || !address.trim()
            }
            className="w-full py-3 px-6 rounded-xl
              bg-[#FFCC00] text-[#0A0A0A]
              font-bold text-sm
              hover:bg-[#FDE047]
              active:bg-[#EAB308]
              disabled:opacity-40
              disabled:cursor-not-allowed
              transition-all duration-150"
          >
            {status === 'loading'
              ? '⟳ Sending RIZ...'
              : 'Request 10 RIZ'
            }
          </button>
        </>
      )}

      {/* Success */}
      {status === 'success' && result && (
        <div className="rounded-xl border
          border-[#4ADE80]/30 bg-[#4ADE80]/5 p-4
          space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[#4ADE80]">✓</span>
            <span className="font-bold text-[#4ADE80]
              text-sm">
              {result.amount} RIZ sent successfully
            </span>
          </div>
          {result.txHash && (
            <div className="text-xs font-mono
              text-[#8B8B93] break-all">
              <span className="text-[#444444]">TX </span>
              <a
                href={
                  `https://rizscan.awarizon.com/tx/`
                  + result.txHash
                }
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#FFCC00]
                  transition-colors"
              >
                {result.txHash.slice(0, 16)}...
                {result.txHash.slice(-8)} ↗
              </a>
            </div>
          )}
          <p className="text-xs text-[#8B8B93]">
            One-time claim used — this address
            can&apos;t claim again.
          </p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && result?.error && (
        <div className="rounded-xl border
          border-[#F87171]/30 bg-[#F87171]/5 p-4">
          <div className="flex items-center gap-2">
            <span className="text-[#F87171]">✗</span>
            <span className="text-[#F87171] text-sm
              font-semibold">
              {result.error}
            </span>
          </div>
        </div>
      )}

    </div>
  )
}
