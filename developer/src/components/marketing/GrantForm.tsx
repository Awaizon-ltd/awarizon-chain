'use client'

import { useState } from 'react'
import emailjs from '@emailjs/browser'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import Button from '../ui/Button'

const CATEGORIES = [
  'Tooling & SDKs',
  'DeFi & DEX',
  'Gaming',
  'Infrastructure',
  'Education & Content',
  'Other',
]

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY

const emailjsConfigured = Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY)

const inputClass = `w-full bg-dev-surface2 border border-dev-border
  rounded-xl px-4 py-3 text-sm text-white placeholder-[#444]
  focus:outline-none focus:border-yellow-400/50 transition-colors`

const labelClass = 'block text-sm font-semibold mb-2'

type FormState = {
  name: string
  email: string
  projectName: string
  projectUrl: string
  category: string
  amount: string
  wallet: string
  description: string
  impact: string
}

const initialState: FormState = {
  name: '',
  email: '',
  projectName: '',
  projectUrl: '',
  category: CATEGORIES[0],
  amount: '',
  wallet: '',
  description: '',
  impact: '',
}

export default function GrantForm() {
  const [form, setForm] = useState<FormState>(initialState)
  const [status, setStatus] =
    useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const update = (field: keyof FormState, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailjsConfigured) return

    setStatus('submitting')
    setError(null)

    try {
      await emailjs.send(
        SERVICE_ID!,
        TEMPLATE_ID!,
        {
          from_name: form.name,
          from_email: form.email,
          project_name: form.projectName,
          project_url: form.projectUrl,
          category: form.category,
          amount: form.amount,
          wallet: form.wallet,
          description: form.description,
          impact: form.impact,
        },
        { publicKey: PUBLIC_KEY! },
      )
      setStatus('success')
      setForm(initialState)
    } catch (err: any) {
      setStatus('error')
      setError(err?.text ?? err?.message ?? 'Failed to submit application.')
    }
  }

  if (status === 'success') {
    return (
      <div className="glass rounded-2xl p-10 text-center max-w-xl mx-auto">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
        <h2 className="text-xl font-bold mb-2">Application received</h2>
        <p className="text-[#999] text-sm leading-relaxed">
          Thanks for applying — the Awarizon ecosystem team reviews
          grant applications on a rolling basis and will reach out at
          the email address you provided.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto
      glass rounded-2xl p-6 sm:p-10 space-y-6">

      {!emailjsConfigured && (
        <div className="flex items-start gap-3 rounded-xl
          border border-yellow-400/20 bg-yellow-400/5 p-4">
          <AlertTriangle className="w-4 h-4 text-yellow-400
            flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#999] leading-relaxed">
            Grant submissions aren&apos;t configured yet — set
            <code className="text-yellow-400"> NEXT_PUBLIC_EMAILJS_SERVICE_ID</code>,
            <code className="text-yellow-400"> NEXT_PUBLIC_EMAILJS_TEMPLATE_ID</code>, and
            <code className="text-yellow-400"> NEXT_PUBLIC_EMAILJS_PUBLIC_KEY</code> in
            your environment to enable this form.
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Full name</label>
          <input required type="text" className={inputClass}
            value={form.name}
            onChange={e => update('name', e.target.value)}
            placeholder="Ada Lovelace" />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input required type="email" className={inputClass}
            value={form.email}
            onChange={e => update('email', e.target.value)}
            placeholder="you@project.com" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Project / team name</label>
          <input required type="text" className={inputClass}
            value={form.projectName}
            onChange={e => update('projectName', e.target.value)}
            placeholder="Your project" />
        </div>
        <div>
          <label className={labelClass}>Website / repo (optional)</label>
          <input type="url" className={inputClass}
            value={form.projectUrl}
            onChange={e => update('projectUrl', e.target.value)}
            placeholder="https://" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Category</label>
          <select className={inputClass}
            value={form.category}
            onChange={e => update('category', e.target.value)}>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Requested amount</label>
          <input required type="text" className={inputClass}
            value={form.amount}
            onChange={e => update('amount', e.target.value)}
            placeholder="e.g. 5,000 RIZ" />
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Awarizon wallet or .riz name (optional)
        </label>
        <input type="text" className={inputClass}
          value={form.wallet}
          onChange={e => update('wallet', e.target.value)}
          placeholder="harry.riz or 5F..." />
      </div>

      <div>
        <label className={labelClass}>What are you building?</label>
        <textarea required rows={4} className={inputClass}
          value={form.description}
          onChange={e => update('description', e.target.value)}
          placeholder="Describe your project, its current stage, and what the grant would fund." />
      </div>

      <div>
        <label className={labelClass}>
          How does this benefit the Awarizon ecosystem?
        </label>
        <textarea required rows={4} className={inputClass}
          value={form.impact}
          onChange={e => update('impact', e.target.value)}
          placeholder="Who benefits, and how does it grow the network?" />
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <Button
        size="lg"
        fullWidth
        loading={status === 'submitting'}
        disabled={!emailjsConfigured || status === 'submitting'}
      >
        Submit Application
      </Button>
    </form>
  )
}
