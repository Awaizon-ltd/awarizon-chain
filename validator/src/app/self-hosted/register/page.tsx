'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useWallet } from '../../../hooks/useWallet'
import WalletConnect from '../../../components/wallet/WalletConnect'
import { MIN_STAKE, REGIONS, COUNTRIES } from '../../../lib/constants'

export default function RegisterValidatorPage() {
  const { connected, address, signer } = useWallet()
  const [selfStake, setSelfStake] = useState(String(MIN_STAKE))
  const [regionCode, setRegionCode] = useState(REGIONS[0].code)
  const [countryCode, setCountryCode] = useState(COUNTRIES[0].code)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const stakeNum = Number(selfStake)
  const stakeValid = Number.isFinite(stakeNum) && stakeNum >= MIN_STAKE

  const handleRegister = async () => {
    if (!signer) return
    setSubmitting(true)
    setError('')
    try {
      await signer.validators.register({
        selfStake: stakeNum,
        regionCode,
        countryCode,
      })
      setDone(true)
    } catch (err: any) {
      // register_validator rejects with ValidatorAlreadyRegistered,
      // InsufficientStake, RegionCapExceeded, or CountryCapExceeded —
      // awarizon.js surfaces these as readable messages via parseChainError.
      setError(err.message ?? 'Registration failed')
    }
    setSubmitting(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]
        flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold mb-4">
            Validator registered!
          </h1>
          <p className="text-gray-400 mb-8">
            Your node is now an active validator on the Awarizon chain.
            It starts earning from the current epoch.
          </p>
          <Link href="/dashboard"
            className="inline-block bg-yellow-400 text-black
            font-bold py-3 px-8 rounded-xl hover:bg-yellow-300
            transition-colors">
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white py-24">
      <div className="max-w-lg mx-auto px-6">
        <h1 className="text-4xl font-black mb-2">
          Register your validator
        </h1>
        <p className="text-gray-400 mb-10">
          Reserves your self-stake and adds your node to the active
          validator set. Make sure your node is already running and
          synced before you register.
        </p>

        <div className="space-y-6">
          {/* Wallet */}
          <div className="bg-[#111118] border border-gray-800
            rounded-xl p-6">
            <h2 className="font-bold mb-4">Validator wallet</h2>
            {connected && address ? (
              <p className="font-mono text-sm text-yellow-400 break-all">
                {address}
              </p>
            ) : (
              <WalletConnect />
            )}
            <p className="text-xs text-gray-500 mt-3">
              This must be the account controlling the node you just set up —
              the self-stake bond is reserved from its balance.
            </p>
          </div>

          {/* Stake */}
          <div className="bg-[#111118] border border-gray-800
            rounded-xl p-6">
            <h2 className="font-bold mb-4">Self-stake</h2>
            <input
              type="number"
              min={MIN_STAKE}
              value={selfStake}
              onChange={e => setSelfStake(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-gray-700
                rounded-lg px-4 py-3 text-white font-mono
                focus:border-yellow-400 focus:outline-none"
            />
            <p className={`text-xs mt-2 ${stakeValid ? 'text-gray-500' : 'text-red-400'}`}>
              Minimum {MIN_STAKE.toLocaleString()} RIZ, reserved (not spent) from your balance.
            </p>
          </div>

          {/* Region / Country */}
          <div className="bg-[#111118] border border-gray-800
            rounded-xl p-6 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium
                text-gray-300 mb-1.5">Region</label>
              <select
                value={regionCode}
                onChange={e => setRegionCode(Number(e.target.value))}
                className="w-full bg-[#0a0a0f] border border-gray-700
                  rounded-lg px-3 py-2.5 text-sm text-white
                  focus:border-yellow-400 focus:outline-none"
              >
                {REGIONS.map(r => (
                  <option key={r.code} value={r.code}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium
                text-gray-300 mb-1.5">Country</label>
              <select
                value={countryCode}
                onChange={e => setCountryCode(Number(e.target.value))}
                className="w-full bg-[#0a0a0f] border border-gray-700
                  rounded-lg px-3 py-2.5 text-sm text-white
                  focus:border-yellow-400 focus:outline-none"
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <p className="col-span-2 text-xs text-gray-500">
              Region/country caps keep validator geography distributed —
              registration fails if either cap is already full.
            </p>
          </div>

          <button
            onClick={handleRegister}
            disabled={!connected || !stakeValid || submitting}
            className="w-full bg-yellow-400 text-black font-bold
              py-4 rounded-xl hover:bg-yellow-300
              disabled:opacity-50 transition-colors text-lg"
          >
            {submitting ? 'Registering...' : 'Register Validator On Chain'}
          </button>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30
              rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
