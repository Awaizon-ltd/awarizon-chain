'use client'
import { useEffect, useState } from 'react'
import type { EpochRewardRecord, NetworkStats, ValidatorInfo } from 'awarizon.js'
import { useChain } from '../../hooks/useChain'
import RewardsChart from './RewardsChart'

interface Line { label: string; value: string }

function StatBlock({ title, lines, children }: {
  title: string
  lines?: Line[]
  children?: React.ReactNode
}) {
  return (
    <div className="bg-[#161029] border border-gray-800 rounded-xl p-5">
      <h3 className="font-bold mb-3">{title}</h3>
      {lines?.map(l => (
        <div key={l.label} className="flex justify-between items-baseline mb-1.5 last:mb-0">
          <span className="text-sm text-gray-400">{l.label}</span>
          <span className="font-mono text-sm text-white">{l.value}</span>
        </div>
      ))}
      {children}
    </div>
  )
}

// Sum of every active validator's self + delegated stake, formatted to
// match the "1,234 RIZ" style validators.list() already returns for
// individual fields.
function sumStake(list: ValidatorInfo[]): string {
  const total = list.reduce((acc, v) =>
    acc + parseFloat(v.selfStake.replace(/,/g, ''))
        + parseFloat(v.delegatedStake.replace(/,/g, '')), 0)
  return `${total.toLocaleString()} RIZ`
}

export default function NetworkStatGrid() {
  const { provider } = useChain()
  const [stats, setStats] = useState<NetworkStats | null>(null)
  const [block, setBlock] = useState<number | null>(null)
  const [validators, setValidators] = useState<ValidatorInfo[]>([])
  const [insurancePool, setInsurancePool] = useState<string | null>(null)
  const [yieldReserve, setYieldReserve] = useState<string | null>(null)
  const [rewardHistory, setRewardHistory] = useState<EpochRewardRecord[]>([])

  useEffect(() => {
    if (!provider) return
    let cancelled = false

    Promise.all([
      provider.network.stats(),
      provider.network.block(),
      provider.validators.list(),
      provider.validators.getInsurancePoolBalance(),
      provider.validators.getYieldReserveRemaining(),
    ]).then(async ([s, b, list, insurance, yieldRes]) => {
      if (cancelled) return
      setStats(s)
      setBlock(b)
      setValidators(list)
      setInsurancePool(insurance)
      setYieldReserve(yieldRes)

      const epochs = Array.from({ length: Math.min(8, s.currentEpoch + 1) },
        (_, i) => s.currentEpoch - i).filter(e => e >= 0)
      const records = await Promise.all(
        epochs.map(e => provider.validators.getEpochRewardHistory(e))
      )
      if (!cancelled) {
        setRewardHistory(records.filter((r): r is EpochRewardRecord => r !== null))
      }
    }).catch(console.error)

    return () => { cancelled = true }
  }, [provider])

  const n = (v: number | undefined) => v === undefined ? '—' : v.toLocaleString()

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatBlock title="Treasury" lines={[
        { label: 'Insurance Pool', value: insurancePool ?? '—' },
        { label: 'Yield Reserve', value: yieldReserve ?? '—' },
      ]} />
      <StatBlock title="Stake" lines={[
        { label: 'Active Stake', value: validators.length ? sumStake(validators) : '—' },
        { label: 'Circulating Supply', value: stats ? `${stats.circulatingSupply}` : '—' },
      ]} />
      <StatBlock title="Activity" lines={[
        { label: 'Total Extrinsics', value: n(stats?.totalExtrinsics) },
        { label: 'Active Campaigns', value: n(stats?.activeCampaigns) },
      ]} />
      <StatBlock title="Epoch" lines={[
        { label: 'Current Epoch', value: n(stats?.currentEpoch) },
        { label: 'Block Height', value: n(block ?? undefined) },
      ]} />
      <StatBlock title="Epoch Reward Pool">
        <RewardsChart history={rewardHistory} compact />
      </StatBlock>
      <StatBlock title="Validators" lines={[
        { label: 'Active Validators', value: n(validators.length) },
        { label: 'Total Wallets', value: n(stats?.totalWallets) },
      ]} />
    </div>
  )
}
