'use client'
import { useEffect, useState } from 'react'
import { useChain } from '../../hooks/useChain'
import type { ValidatorInfo } from 'awarizon.js'

export default function LeaderboardPage() {
  const { provider } = useChain()
  const [validators, setValidators] =
    useState<ValidatorInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!provider) return
    loadValidators()
  }, [provider])

  const loadValidators = async () => {
    if (!provider) return
    try {
      const list = await provider.validators.list()
      // Sort by performance (uptime + finality + blocks)
      const sorted = list.sort((a, b) => {
        const scoreA = a.uptimeBps +
          a.finalityBps + a.blocksBps
        const scoreB = b.uptimeBps +
          b.finalityBps + b.blocksBps
        return scoreB - scoreA
      })
      setValidators(sorted)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen
      text-white py-24">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-4xl font-black mb-2">
          Validator leaderboard
        </h1>
        <p className="text-gray-400 mb-8">
          {validators.length} active validators
          securing the Awarizon network
        </p>

        {loading ? (
          <div className="text-center text-gray-500
            py-20">
            Loading validators...
          </div>
        ) : (
          <div className="bg-[#161029] border
            border-gray-800 rounded-2xl
            overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-6
              px-6 py-3 border-b border-gray-800
              text-xs text-gray-500
              uppercase tracking-wider">
              <span>Rank</span>
              <span className="col-span-2">
                Validator
              </span>
              <span>Uptime</span>
              <span>Commission</span>
              <span>Total Stake</span>
            </div>

            {/* Rows */}
            {validators.map((v, i) => {
              const totalStake = parseFloat(
                v.selfStake.replace(/,/g, '')
              ) + parseFloat(
                v.delegatedStake.replace(/,/g, '')
              )
              return (
                <div key={v.address} id={v.address}
                  className="grid grid-cols-6
                  px-6 py-4 border-b border-gray-800
                  last:border-0 hover:bg-gray-800/30
                  transition-colors items-center">
                  <span className={`font-bold
                    ${i === 0
                      ? 'text-yellow-400'
                      : i === 1
                      ? 'text-gray-300'
                      : i === 2
                      ? 'text-amber-600'
                      : 'text-gray-500'}`}>
                    #{i + 1}
                  </span>
                  <span className="col-span-2
                    font-mono text-sm text-gray-300">
                    {v.address.slice(0, 8)}...
                    {v.address.slice(-6)}
                  </span>
                  <span className={`font-mono
                    text-sm
                    ${v.uptimeBps > 9500
                      ? 'text-green-400'
                      : v.uptimeBps > 8000
                      ? 'text-yellow-400'
                      : 'text-red-400'}`}>
                    {(v.uptimeBps / 100).toFixed(1)}%
                  </span>
                  <span className="text-sm">
                    {v.commission}%
                  </span>
                  <span className="text-sm
                    font-mono">
                    {totalStake.toLocaleString()} RIZ
                  </span>
                </div>
              )
            })}
            {validators.length === 0 && (
              <div className="px-6 py-16 text-center text-gray-500 text-sm">
                No active validators yet.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
