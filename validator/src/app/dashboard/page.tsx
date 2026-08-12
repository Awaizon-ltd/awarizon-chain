'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { isAddress } from 'awarizon.js'
import { useWallet } from '../../hooks/useWallet'
import { useValidator } from '../../hooks/useValidator'
import WalletConnect from '../../components/wallet/WalletConnect'
import PerformanceBar from '../../components/validator/PerformanceBar'
import StatusBadge from '../../components/validator/StatusBadge'

export default function DashboardPage() {
  const { connected, address, signer } = useWallet()
  const { validator, loading, refetch } = useValidator(address)

  const [rewardDest, setRewardDest] = useState<string | null>(null)
  const [destInput, setDestInput] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [settingDest, setSettingDest] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (!signer || !address) { setRewardDest(null); return }
    let cancelled = false
    signer.validators.getRewardDestination(address)
      .then(dest => { if (!cancelled) setRewardDest(dest) })
      .catch(console.error)
    return () => { cancelled = true }
  }, [signer, address, validator])

  const runAction = async (fn: () => Promise<unknown>, setBusy: (b: boolean) => void) => {
    setBusy(true)
    setActionError('')
    try {
      await fn()
      refetch()
    } catch (err: any) {
      setActionError(err.message ?? 'Transaction failed')
    }
    setBusy(false)
  }

  const handleClaim = () => {
    if (!signer) return
    runAction(() => signer.validators.claimValidatorReward(), setClaiming)
  }

  const handleSetDestination = () => {
    if (!signer) return
    if (!isAddress(destInput)) {
      setActionError('Enter a valid Awarizon address')
      return
    }
    runAction(async () => {
      await signer.validators.setRewardDestination(destInput)
      setDestInput('')
      const dest = await signer.validators.getRewardDestination(address!)
      setRewardDest(dest)
    }, setSettingDest)
  }

  const handleClearDestination = () => {
    if (!signer) return
    runAction(async () => {
      await signer.validators.clearRewardDestination()
      setRewardDest(null)
    }, setSettingDest)
  }

  if (!connected) {
    return (
      <div className="min-h-screen
        flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">
            Connect your wallet
          </h2>
          <p className="text-gray-400 mb-6">
            Connect to view your validator dashboard
          </p>
          <div className="flex justify-center">
            <WalletConnect />
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen
        flex items-center justify-center">
        <div className="text-gray-400">
          Loading...
        </div>
      </div>
    )
  }

  if (!validator) {
    return (
      <div className="min-h-screen
        flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">
            No validator found
          </h2>
          <p className="text-gray-400 mb-6">
            This wallet is not registered as
            a validator yet.
          </p>
          <a href="/self-hosted/register"
            className="bg-yellow-400 text-black
            font-bold py-3 px-8 rounded-xl
            hover:bg-yellow-300">
            Register Validator
          </a>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen
      text-white py-24">
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="flex items-center
          justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black">
              My Validator
            </h1>
            <p className="font-mono text-sm
              text-gray-500 mt-1">
              {address}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard/earnings"
              className="text-sm text-yellow-400 hover:underline">
              Earnings →
            </Link>
            <StatusBadge isActive={validator.isActive} />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2
          md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Self Stake',
              value: validator.selfStake,
              unit: 'RIZ',
            },
            {
              label: 'Delegated',
              value: validator.delegatedStake,
              unit: 'RIZ',
            },
            {
              label: 'Commission',
              value: `${validator.commission}%`,
              unit: '',
            },
            {
              label: 'Pending Reward',
              value: validator.pendingValidatorReward,
              unit: 'RIZ',
              highlight: true,
            },
          ].map(stat => (
            <div key={stat.label}
              className={`bg-[#161029] rounded-xl
              p-5 border
              ${stat.highlight
                ? 'border-yellow-400/30'
                : 'border-gray-800'}`}>
              <p className="text-sm text-gray-400
                mb-1">
                {stat.label}
              </p>
              <p className={`text-2xl font-black
                ${stat.highlight
                  ? 'text-yellow-400'
                  : 'text-white'}`}>
                {stat.value}
                {stat.unit && (
                  <span className="text-sm
                    font-normal text-gray-500 ml-1">
                    {stat.unit}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>

        {/* Performance */}
        <div className="grid md:grid-cols-2
          gap-6 mb-8">
          <div className="bg-[#161029] border
            border-gray-800 rounded-xl p-6">
            <h2 className="font-bold mb-5">
              Performance
            </h2>
            <PerformanceBar label="Uptime" bps={validator.uptimeBps} color="bg-green-500" />
            <PerformanceBar label="Finality" bps={validator.finalityBps} color="bg-blue-500" />
            <PerformanceBar label="Blocks" bps={validator.blocksBps} color="bg-purple-500" />
          </div>

          {/* Reward destination */}
          <div className="bg-[#161029] border
            border-gray-800 rounded-xl p-6">
            <h2 className="font-bold mb-5">
              Reward destination
            </h2>
            {rewardDest ? (
              <div>
                <p className="text-sm
                  text-gray-400 mb-2">
                  Rewards are sent to:
                </p>
                <p className="font-mono text-sm
                  text-yellow-400 break-all
                  bg-yellow-400/10 px-3 py-2
                  rounded-lg mb-4">
                  {rewardDest}
                </p>
                <button
                  onClick={handleClearDestination}
                  disabled={settingDest}
                  className="text-sm
                  text-red-400 hover:text-red-300
                  disabled:opacity-50">
                  {settingDest ? 'Clearing...' : 'Clear destination'}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm
                  text-gray-400 mb-4">
                  Rewards go to your own wallet.
                  Set a destination to route
                  rewards to another address.
                </p>
                <input
                  type="text"
                  value={destInput}
                  onChange={e => setDestInput(e.target.value)}
                  placeholder="5Grwva... or 0x..."
                  className="w-full
                    border border-gray-700 rounded-lg
                    px-3 py-2.5 text-sm font-mono
                    text-white focus:border-yellow-400
                    focus:outline-none mb-3"
                />
                <button
                  onClick={handleSetDestination}
                  disabled={!destInput || settingDest}
                  className="w-full
                  bg-yellow-400 text-black
                  font-bold py-2.5 rounded-lg
                  hover:bg-yellow-300 disabled:opacity-50 text-sm">
                  {settingDest ? 'Setting...' : 'Set Destination'}
                </button>
              </div>
            )}
          </div>
        </div>

        {actionError && (
          <div className="bg-red-500/10 border
            border-red-500/30 rounded-lg p-4
            text-red-400 text-sm mb-8">
            {actionError}
          </div>
        )}

        {/* Actions */}
        <div className="bg-[#161029] border
          border-gray-800 rounded-xl p-6">
          <h2 className="font-bold mb-5">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleClaim}
              disabled={claiming || validator.pendingValidatorReward.startsWith('0.0000')}
              className="bg-yellow-400
              text-black font-bold py-3 px-6
              rounded-xl hover:bg-yellow-300
              disabled:opacity-50 transition-colors">
              {claiming
                ? 'Claiming...'
                : `Claim Rewards (${validator.pendingValidatorReward})`}
            </button>
            <Link href="/dashboard/manage">
              <button className="border
                border-gray-600 text-white font-medium
                py-3 px-6 rounded-xl hover:bg-gray-800
                transition-colors">
                Update Commission
              </button>
            </Link>
            <button
              disabled
              title="Deregistration isn't supported on-chain yet"
              className="border
              border-red-500/30 text-red-400
              font-medium py-3 px-6 rounded-xl
              opacity-40 cursor-not-allowed">
              Deregister Validator
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
