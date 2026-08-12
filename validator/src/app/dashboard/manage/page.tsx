'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useWallet } from '../../../hooks/useWallet'
import { useValidator } from '../../../hooks/useValidator'
import WalletConnect from '../../../components/wallet/WalletConnect'
import { MAX_COMMISSION } from '../../../lib/constants'

export default function ManageValidatorPage() {
  const { connected, address, signer } = useWallet()
  const { validator, loading, refetch } = useValidator(address)
  const [commission, setCommission] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (validator) setCommission(validator.commission)
  }, [validator])

  const handleSave = async () => {
    if (!signer) return
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await signer.validators.setCommission(commission)
      setSaved(true)
      refetch()
    } catch (err: any) {
      setError(err.message ?? 'Failed to update commission')
    }
    setSaving(false)
  }

  if (!connected) {
    return (
      <div className="min-h-screen
        flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect your wallet</h2>
          <p className="text-gray-400 mb-6">
            Connect to manage your validator settings
          </p>
          <div className="flex justify-center"><WalletConnect /></div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen
        flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!validator) {
    return (
      <div className="min-h-screen
        flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No validator found</h2>
          <p className="text-gray-400 mb-6">
            This wallet is not registered as a validator yet.
          </p>
          <Link href="/self-hosted/register"
            className="bg-yellow-400 text-black font-bold py-3 px-8
            rounded-xl hover:bg-yellow-300">
            Register Validator
          </Link>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen text-white py-24">
      <div className="max-w-lg mx-auto px-6">
        <Link href="/dashboard"
          className="text-sm text-gray-500 hover:text-white
          transition-colors mb-4 inline-block">
          ← Back to dashboard
        </Link>
        <h1 className="text-4xl font-black mb-2">Manage validator</h1>
        <p className="text-gray-400 mb-10">
          Changes apply from the next epoch.
        </p>

        <div className="bg-[#161029] border border-gray-800
          rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">Commission</h2>
            <span className="font-mono text-2xl text-yellow-400">
              {commission}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={MAX_COMMISSION}
            value={commission}
            onChange={e => setCommission(Number(e.target.value))}
            className="w-full accent-yellow-400"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>{MAX_COMMISSION}% max</span>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Share of each delegator's reward you keep. Currently{' '}
            {validator.commission}% on-chain.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30
            rounded-lg p-4 text-red-400 text-sm mb-6">
            {error}
          </div>
        )}
        {saved && !error && (
          <div className="bg-green-500/10 border border-green-500/30
            rounded-lg p-4 text-green-400 text-sm mb-6">
            Commission updated on-chain.
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || commission === validator.commission}
          className="w-full bg-yellow-400 text-black font-bold
            py-4 rounded-xl hover:bg-yellow-300
            disabled:opacity-50 transition-colors text-lg"
        >
          {saving ? 'Saving...' : 'Save Commission'}
        </button>
      </div>
    </main>
  )
}
