'use client'
import { useState } from 'react'
import emailjs from '@emailjs/browser'
import {
  MANAGED_YEARLY_FEE_ETH, MANAGED_YEARLY_FEE_ETH_LIST,
  MANAGED_YEARLY_FEE_DISCOUNT_PCT, COUNTRY_NAMES,
} from '../../../lib/constants'

// Same pattern as developer/src/components/marketing/GrantForm.tsx —
// EmailJS's public key is meant to be exposed client-side (EmailJS
// enforces domain restriction + rate limiting on their end, not via
// secrecy of these IDs).
const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_APPLY_TEMPLATE_ID
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
const emailjsConfigured = Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY)

export default function ApplyPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    wallet: '',
    country: '',
    experience: '',
    reason: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      // Durable record — kept in Mongo regardless of whether the email
      // below succeeds (see api/validator-application/route.ts).
      const res = await fetch('/api/validator-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to submit application')
      }

      // Operator notification — best-effort. A misconfigured/failed
      // EmailJS send shouldn't block the applicant; the record is
      // already in Mongo either way.
      if (emailjsConfigured) {
        try {
          await emailjs.send(
            SERVICE_ID!,
            TEMPLATE_ID!,
            {
              from_name: form.name,
              from_email: form.email,
              wallet: form.wallet,
              country: form.country,
              experience: form.experience,
              reason: form.reason,
            },
            { publicKey: PUBLIC_KEY! },
          )
        } catch (err: any) {
          console.error('EmailJS notification failed:', err?.text ?? err?.message)
        }
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message)
    }
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen
        flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-3xl font-bold mb-4">
            Application received
          </h1>
          <p className="text-gray-400">
            We will review your application and
            send your activation code to{' '}
            <strong className="text-white">
              {form.email}
            </strong>{' '}
            within 24-48 hours.
          </p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen
      text-white py-24">
      <div className="max-w-2xl mx-auto px-6">
        <h1 className="text-4xl font-black mb-2">
          Apply for a managed validator slot
        </h1>
        <p className="text-gray-400 mb-8">
          Fill in your details. We will review
          and email you an activation code within
          24-48 hours.
        </p>

        {/* Pricing box */}
        <div className="bg-yellow-400/10 border
          border-yellow-400/30 rounded-xl p-5 mb-8">
          <div className="flex justify-between
            items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-bold">
                  Managed Validator Slot
                </p>
                <span className="text-[10px] font-bold text-black
                  bg-yellow-400 px-1.5 py-0.5 rounded-md
                  flex-shrink-0">
                  {MANAGED_YEARLY_FEE_DISCOUNT_PCT}% OFF
                </span>
              </div>
              <p className="text-sm text-gray-400">
                Yearly subscription ·
                Node operated by Awarizon team
              </p>
            </div>
            <div className="text-right flex-shrink-0 pl-4">
              <div className="flex items-baseline justify-end gap-2">
                <p className="text-2xl font-black
                  text-yellow-400">
                  {MANAGED_YEARLY_FEE_ETH} ETH
                </p>
                <span className="text-sm text-gray-500 line-through">
                  {MANAGED_YEARLY_FEE_ETH_LIST} ETH
                </span>
              </div>
              <p className="text-sm text-gray-400">
                per year
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4 pt-4
            border-t border-yellow-400/20">
            {MANAGED_YEARLY_FEE_DISCOUNT_PCT}% discount available for
            Awarizon Testnet validators only.
          </p>
        </div>

        {!emailjsConfigured && (
          <div className="bg-yellow-400/5 border border-yellow-400/20
            rounded-xl p-4 mb-6 text-xs text-gray-500 leading-relaxed">
            Operator email notifications aren't configured yet — set{' '}
            <code className="text-yellow-400">NEXT_PUBLIC_EMAILJS_SERVICE_ID</code>,{' '}
            <code className="text-yellow-400">NEXT_PUBLIC_EMAILJS_APPLY_TEMPLATE_ID</code>, and{' '}
            <code className="text-yellow-400">NEXT_PUBLIC_EMAILJS_PUBLIC_KEY</code>.
            Applications still get saved either way.
          </div>
        )}

        <form onSubmit={handleSubmit}
          className="space-y-5">
          <div>
            <label className="block text-sm
              font-medium text-gray-300 mb-1.5">
              Full name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm(
                f => ({ ...f, name: e.target.value })
              )}
              className="w-full bg-[#161029] border
                border-gray-700 rounded-xl px-4 py-3
                text-white focus:border-yellow-400
                focus:outline-none"
              placeholder="John Smith"
            />
          </div>

          <div>
            <label className="block text-sm
              font-medium text-gray-300 mb-1.5">
              Email address
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm(
                f => ({ ...f, email: e.target.value })
              )}
              className="w-full bg-[#161029] border
                border-gray-700 rounded-xl px-4 py-3
                text-white focus:border-yellow-400
                focus:outline-none"
              placeholder="john@company.com"
            />
          </div>

          <div>
            <label className="block text-sm
              font-medium text-gray-300 mb-1.5">
              Your wallet address
              <span className="text-gray-500 ml-1
                font-normal">
                (rewards will be sent here)
              </span>
            </label>
            <input
              type="text"
              required
              value={form.wallet}
              onChange={e => setForm(
                f => ({...f, wallet: e.target.value})
              )}
              className="w-full bg-[#161029] border
                border-gray-700 rounded-xl px-4 py-3
                text-white font-mono text-sm
                focus:border-yellow-400 focus:outline-none"
              placeholder="5Grwva...or 0x..."
            />
          </div>

          <div>
            <label className="block text-sm
              font-medium text-gray-300 mb-1.5">
              Country
            </label>
            <select
              required
              value={form.country}
              onChange={e => setForm(
                f => ({...f, country: e.target.value})
              )}
              className="w-full bg-[#161029] border
                border-gray-700 rounded-xl px-4 py-3
                text-white focus:border-yellow-400
                focus:outline-none"
            >
              <option value="">Select country</option>
              {COUNTRY_NAMES.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm
              font-medium text-gray-300 mb-1.5">
              Web3 / crypto experience
            </label>
            <select
              value={form.experience}
              onChange={e => setForm(
                f => ({...f,
                  experience: e.target.value})
              )}
              className="w-full bg-[#161029] border
                border-gray-700 rounded-xl px-4 py-3
                text-white focus:border-yellow-400
                focus:outline-none"
            >
              <option value="">Select level</option>
              <option value="beginner">
                Beginner — new to crypto
              </option>
              <option value="intermediate">
                Intermediate — use DeFi/NFTs
              </option>
              <option value="advanced">
                Advanced — run nodes before
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm
              font-medium text-gray-300 mb-1.5">
              Why do you want to run a validator?
            </label>
            <textarea
              rows={4}
              value={form.reason}
              onChange={e => setForm(
                f => ({...f, reason: e.target.value})
              )}
              className="w-full bg-[#161029] border
                border-gray-700 rounded-xl px-4 py-3
                text-white focus:border-yellow-400
                focus:outline-none resize-none"
              placeholder="Tell us about your
                interest in Awarizon..."
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border
              border-red-500/30 rounded-lg p-4
              text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-yellow-400
              text-black font-bold py-4 rounded-xl
              hover:bg-yellow-300 disabled:opacity-50
              transition-colors text-lg"
          >
            {submitting
              ? 'Submitting...'
              : 'Submit Application'}
          </button>
        </form>
      </div>
    </main>
  )
}
