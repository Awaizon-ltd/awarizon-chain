import { INDEXER, fmt, truncate } from '@/lib/constants'
import Link from 'next/link'

async function getActivity() {
  try {
    const res = await fetch(`${INDEXER}/nft/events?limit=50`, { next: { revalidate: 10 } })
    return await res.json()
  } catch {
    return { events: [] }
  }
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  mint: { label: 'Minted', color: 'text-green-400' },
  transfer: { label: 'Transferred', color: 'text-blue-400' },
  list: { label: 'Listed', color: 'text-yellow-400' },
  delist: { label: 'Delisted', color: 'text-[#888]' },
  sale: { label: 'Sold', color: 'text-purple-400' },
  burn: { label: 'Burned', color: 'text-red-400' },
  create: { label: 'Created', color: 'text-yellow-400' },
}

export default async function Activity() {
  const data = await getActivity()
  const events = data.events ?? []

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black mb-8">Activity</h1>

      {events.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-5xl mb-4">⏳</p>
          <p className="text-[#888]">No activity yet</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden">
          {events.map((e: any, i: number) => {
            const meta = EVENT_LABELS[e.eventType] ?? { label: e.eventType, color: 'text-white' }

            return (
              <div
                key={i}
                className="flex items-center gap-4 px-6 py-4 border-b border-rz-border last:border-0 hover:bg-rz-s2 transition-all"
              >
                <span className={`text-sm font-bold w-24 flex-shrink-0 ${meta.color}`}>
                  {meta.label}
                </span>

                <Link
                  href={
                    e.itemId !== null
                      ? `/nft/${e.collectionId}/${e.itemId}`
                      : `/collections/${e.collectionId}`
                  }
                  className="flex-1 min-w-0 hover:text-yellow-400 transition-colors"
                >
                  <p className="font-mono text-sm truncate">
                    {e.itemId !== null
                      ? `#${e.itemId} in Collection #${e.collectionId}`
                      : `Collection #${e.collectionId}`}
                  </p>
                </Link>

                {e.price && BigInt(e.price) > 0n && (
                  <span className="text-yellow-400 font-bold text-sm flex-shrink-0">
                    {fmt(BigInt(e.price))}
                  </span>
                )}

                <div className="text-right flex-shrink-0 hidden sm:block">
                  {e.fromAddress && (
                    <Link
                      href={`/profile/${e.fromAddress}`}
                      className="text-[#888] text-xs hover:text-white block"
                    >
                      from {truncate(e.fromAddress)}
                    </Link>
                  )}
                  {e.toAddress && (
                    <Link
                      href={`/profile/${e.toAddress}`}
                      className="text-[#888] text-xs hover:text-white block"
                    >
                      to {truncate(e.toAddress)}
                    </Link>
                  )}
                </div>

                <span className="text-[#555] text-xs flex-shrink-0 hidden md:block">
                  #{e.blockNumber}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
