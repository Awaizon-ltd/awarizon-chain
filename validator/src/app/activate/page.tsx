'use client'
import { useState } from 'react'
import { useWallet } from '../../hooks/useWallet'
import WalletConnect from '../../components/wallet/WalletConnect'

export default function ActivatePage() {
  const { connected, address } = useWallet()
  const [code, setCode] = useState('')
  const [activating, setActivating] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const step = !code ? 1 : !connected ? 2 : 3

  const handleActivate = async () => {
    setActivating(true)
    setError('')
    try {
      // Backend verifies the code, then signs setRewardDestination() from
      // the managed node's own validator key — the customer never signs
      // anything here, they only supply the wallet that should receive
      // rewards.
      const res = await fetch('/api/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          rewardWallet: address,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(
          data.error || 'Activation failed'
        )
      }

      setDone(true)
    } catch (err: any) {
      setError(err.message)
    }
    setActivating(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]
        flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold mb-4">
            Validator activated!
          </h1>
          <p className="text-gray-400 mb-2">
            Your validator node is now active on
            the Awarizon blockchain.
          </p>
          <p className="text-gray-400 mb-8">
            Epoch rewards will be sent to:
          </p>
          <p className="font-mono text-sm
            text-yellow-400 bg-yellow-400/10
            px-4 py-2 rounded-lg break-all">
            {address}
          </p>
          <a href="/dashboard"
            className="mt-8 inline-block
            bg-yellow-400 text-black font-bold
            py-3 px-8 rounded-xl
            hover:bg-yellow-300 transition-colors">
            Go to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f]
      text-white py-24">
      <div className="max-w-lg mx-auto px-6">
        <h1 className="text-4xl font-black mb-2">
          Activate your validator
        </h1>
        <p className="text-gray-400 mb-10">
          Enter the activation code from your
          email and connect your wallet to
          receive rewards.
        </p>

        {/* Steps */}
        <div className="space-y-6">

          {/* Step 1 — Activation code */}
          <div className={`bg-[#111118] border
            rounded-xl p-6 transition-colors
            ${step >= 1
              ? 'border-yellow-400/40'
              : 'border-gray-800'}`}>
            <div className="flex items-center
              gap-3 mb-4">
              <div className={`w-7 h-7 rounded-full
                flex items-center justify-center
                text-sm font-bold
                ${step > 1
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-700 text-white'}`}>
                {step > 1 ? '✓' : '1'}
              </div>
              <h2 className="font-bold">
                Enter activation code
              </h2>
            </div>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="AWZ-XXXX-XXXX-XXXX"
              className="w-full bg-[#0a0a0f] border
                border-gray-700 rounded-lg px-4 py-3
                text-white font-mono tracking-wider
                focus:border-yellow-400
                focus:outline-none"
            />
          </div>

          {/* Step 2 — Connect wallet */}
          <div className={`bg-[#111118] border
            rounded-xl p-6 transition-colors
            ${step >= 2
              ? 'border-yellow-400/40'
              : 'border-gray-800 opacity-50'}`}>
            <div className="flex items-center
              gap-3 mb-4">
              <div className={`w-7 h-7 rounded-full
                flex items-center justify-center
                text-sm font-bold
                ${step > 2
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-700 text-white'}`}>
                {step > 2 ? '✓' : '2'}
              </div>
              <h2 className="font-bold">
                Connect reward wallet
              </h2>
            </div>
            {connected && address ? (
              <p className="font-mono text-sm
                text-yellow-400 break-all">
                {address}
              </p>
            ) : (
              <WalletConnect />
            )}
          </div>

          {/* Step 3 — Activate */}
          <div className={`bg-[#111118] border
            rounded-xl p-6 transition-colors
            ${step >= 3
              ? 'border-yellow-400/40'
              : 'border-gray-800 opacity-50'}`}>
            <div className="flex items-center
              gap-3 mb-4">
              <div className="w-7 h-7 rounded-full
                bg-gray-700 flex items-center
                justify-center text-sm font-bold">
                3
              </div>
              <h2 className="font-bold">
                Activate validator
              </h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              This will link your wallet as the
              reward destination for your validator
              node on the Awarizon chain.
            </p>
            <button
              onClick={handleActivate}
              disabled={
                !code || !connected || !address || activating
              }
              className="w-full bg-yellow-400
                text-black font-bold py-3 rounded-lg
                hover:bg-yellow-300 disabled:opacity-50
                transition-colors"
            >
              {activating
                ? 'Activating...'
                : 'Activate My Validator'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-500/10
            border border-red-500/30 rounded-lg
            p-4 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>
    </main>
  )
}
