import { INDEXER, fmt } from '@/lib/constants'
import Image from 'next/image'
import Link from 'next/link'

async function getRankings() {
  try {
    const res = await fetch(`${INDEXER}/nft/rankings?limit=50`, { next: { revalidate: 60 } })
    return await res.json()
  } catch {
    return { rankings: [] }
  }
}

export default async function Rankings() {
  const data = await getRankings()
  const rankings = data.rankings ?? []

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black mb-2">Rankings</h1>
      <p className="text-[#888] text-sm mb-8">Top collections by trading volume</p>

      {rankings.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-5xl mb-4">🏆</p>
          <p className="text-[#888]">No collections ranked yet</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-rz-border text-xs text-[#888] font-semibold uppercase tracking-wider">
            <span className="col-span-1">#</span>
            <span className="col-span-5">Collection</span>
            <span className="col-span-2 text-right">Volume</span>
            <span className="col-span-2 text-right">Floor</span>
            <span className="col-span-2 text-right">Items</span>
          </div>

          {rankings.map((r: any, i: number) => (
            <Link
              key={r.collectionId}
              href={`/collections/${r.collectionId}`}
              className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-rz-border last:border-0 hover:bg-rz-s2 transition-all items-center"
            >
              <span className="col-span-1 text-[#555] font-bold">{i + 1}</span>

              <div className="col-span-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rz-s3 overflow-hidden flex-shrink-0">
                  {r.imageUrl && (
                    <Image src={r.imageUrl} alt="" width={40} height={40} className="object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">
                    {r.name ?? `Collection #${r.collectionId}`}
                  </p>
                  <p className="text-[#888] text-xs">{r.uniqueOwners ?? 0} owners</p>
                </div>
              </div>

              <p className="col-span-2 text-right font-bold text-sm text-yellow-400">
                {r.totalVolume && BigInt(r.totalVolume) > 0n ? fmt(BigInt(r.totalVolume)) : '—'}
              </p>

              <p className="col-span-2 text-right text-sm">
                {r.floorPrice && BigInt(r.floorPrice) > 0n ? fmt(BigInt(r.floorPrice)) : '—'}
              </p>

              <p className="col-span-2 text-right text-sm text-[#888]">
                {r.totalItems?.toLocaleString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
