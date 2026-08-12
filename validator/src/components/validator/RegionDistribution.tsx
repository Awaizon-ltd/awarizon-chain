'use client'
import { useEffect, useState } from 'react'
import { useChain } from '../../hooks/useChain'
import { REGIONS } from '../../lib/constants'

interface RegionCount {
  code: number
  name: string
  count: number
}

// Real per-region validator counts, grouped client-side from
// validators.list() — takes the visual slot a metrics site would give
// a world map, but Awarizon validators only carry a region/country
// *code* on-chain (pallets/awarizon-types/src/geography.rs), no literal
// geo coordinates, so a bar breakdown is what the real data supports
// rather than an invented pin-map.
export default function RegionDistribution() {
  const { provider } = useChain()
  const [regions, setRegions] = useState<RegionCount[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!provider) return
    let cancelled = false
    provider.validators.list()
      .then(list => {
        if (cancelled) return
        const counts = new Map<number, number>()
        for (const v of list) {
          counts.set(v.regionCode, (counts.get(v.regionCode) ?? 0) + 1)
        }
        const rows = REGIONS
          .map(r => ({ code: r.code, name: r.name, count: counts.get(r.code) ?? 0 }))
          .filter(r => r.count > 0)
          .sort((a, b) => b.count - a.count)
        setRegions(rows)
        setTotal(list.length)
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [provider])

  const max = Math.max(1, ...regions.map(r => r.count))

  return (
    <div className="bg-[#161029] border border-gray-800 rounded-2xl p-8">
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="text-2xl font-bold">Validators by Region</h2>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-8 text-sm">Loading...</div>
      ) : regions.length === 0 ? (
        <div className="text-center text-gray-500 py-8 text-sm">
          No validators registered yet.
        </div>
      ) : (
        <div className="space-y-4">
          {regions.map(r => (
            <div key={r.code}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-300">{r.name}</span>
                <span className="font-mono text-gray-500">{r.count}</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full"
                  style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
