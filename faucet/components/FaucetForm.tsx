'use client'

import { useState, useRef } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface Result {
  txHash?: string
  amount?: string
  remaining?: string
  error?: string
}

export default function FaucetForm() {
  const [address, setAddress] = useState('')
  const [captchaToken, setCaptchaToken] =
    useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<Result | null>(
    null
  )
  const captchaRef = useRef<ReCAPTCHA>(null)

  const handleSubmit = async () => {
    if (!address.trim() || !captchaToken) return

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
          captchaToken,
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
    } finally {
      captchaRef.current?.reset()
      setCaptchaToken(null)
    }
  }

  return (
    <div className="space-y-4">

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

      {/* reCAPTCHA */}
      <div className="flex justify-center py-1">
        <ReCAPTCHA
          ref={captchaRef}
          sitekey={
            process.env
              .NEXT_PUBLIC_RECAPTCHA_SITE_KEY!
          }
          onChange={token => setCaptchaToken(token)}
          theme="dark"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={
          status === 'loading'
          || !address.trim()
          || !captchaToken
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
          {result.remaining && (
            <p className="text-xs text-[#8B8B93]">
              Remaining allowance:{' '}
              <span className="text-white font-mono">
                {result.remaining} RIZ
              </span>
            </p>
          )}
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
