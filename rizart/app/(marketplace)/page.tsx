'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import CollectionCarousel from '@/components/CollectionCarousel'
import NFTCard from '@/components/NFTCard'
import { NFTCardSkeleton } from '@/components/Skeleton'
import { INDEXER } from '@/lib/constants'

type Tab = 'all' | 'trending' | 'new' | 'hot' | 'gaming' | 'pfps' | 'art'

const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'trending', label: 'Trending' },
  { value: 'new', label: 'New' },
  { value: 'hot', label: 'Hot' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'pfps', label: 'PFPs' },
  { value: 'art', label: 'Art' },
]

// The indexer doesn't tag NFTs by genre yet, so these tabs can't pull
// real data — show an honest placeholder instead of silently reusing
// the "All" feed under a misleading label.
const UNTAGGED: Tab[] = ['gaming', 'pfps', 'art']

export default function Home() {
  const [carousel, setCarousel] = useState<any[]>([])
  const [pool, setPool] = useState<any[]>([])
  const [newIds, setNewIds] = useState<string[]>([])
  const [hotIds, setHotIds] = useState<string[]>([])
  const [trendingCollectionIds, setTrendingCollectionIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [rankingsRes, collectionsRes, eventsRes] = await Promise.all([
          fetch(`${INDEXER}/nft/rankings?limit=10`)
            .then(r => r.json())
            .catch(() => ({ rankings: [] })),
          fetch(`${INDEXER}/nft/collections?limit=20`)
            .then(r => r.json())
            .catch(() => ({ collections: [] })),
          fetch(`${INDEXER}/nft/events?limit=100`)
            .then(r => r.json())
            .catch(() => ({ events: [] })),
        ])

        const rankings = rankingsRes.rankings ?? []
        setCarousel(rankings.slice(0, 5))
        setTrendingCollectionIds(rankings.map((r: any) => r.collectionId))

        const collections = collectionsRes.collections ?? []
        const itemLists = await Promise.all(
          collections.map((c: any) =>
            fetch(`${INDEXER}/nft/collections/${c.collectionId}/items?limit=20`)
              .then(r => r.json())
              .then((res: any) =>
                (res.items ?? []).map((it: any) => ({ ...it, collectionId: c.collectionId })),
              )
              .catch(() => []),
          ),
        )
        setPool(itemLists.flat())

        const events = eventsRes.events ?? []
        const eventKey = (e: any) => `${e.collectionId}-${e.itemId}`
        setNewIds(
          events
            .filter((e: any) => e.eventType === 'mint')
            .sort((a: any, b: any) => b.blockNumber - a.blockNumber)
            .map(eventKey),
        )
        setHotIds(
          events
            .filter((e: any) => e.eventType === 'sale' || e.eventType === 'list')
            .sort((a: any, b: any) => b.blockNumber - a.blockNumber)
            .map(eventKey),
        )
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const feed = useMemo(() => {
    const itemKey = (it: any) => `${it.collectionId}-${it.itemId}`

    if (tab === 'all') return pool
    if (tab === 'trending') return pool.filter(it => trendingCollectionIds.includes(it.collectionId))

    if (tab === 'new') {
      const rank = new Map(newIds.map((k, i) => [k, i]))
      return pool
        .filter(it => rank.has(itemKey(it)))
        .sort((a, b) => rank.get(itemKey(a))! - rank.get(itemKey(b))!)
    }

    if (tab === 'hot') {
      const rank = new Map(hotIds.map((k, i) => [k, i]))
      return pool
        .filter(it => rank.has(itemKey(it)))
        .sort((a, b) => rank.get(itemKey(a))! - rank.get(itemKey(b))!)
    }

    return []
  }, [tab, pool, trendingCollectionIds, newIds, hotIds])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {loading && carousel.length === 0 ? (
        <div className="h-72 sm:h-96 rounded-2xl skeleton mb-10" />
      ) : (
        <CollectionCarousel slides={carousel} />
      )}

      <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`
              flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all
              ${
                tab === t.value
                  ? 'bg-yellow-400 text-black'
                  : 'bg-rz-surface border border-rz-border text-[#888] hover:text-white'
              }
            `}
          >
            {t.label}
          </button>
        ))}
      </div>

      {UNTAGGED.includes(tab) ? (
        <div className="text-center py-24 border border-dashed border-rz-border rounded-2xl">
          <p className="text-5xl mb-4">🏷️</p>
          <p className="text-[#888]">Category tagging isn&apos;t live yet — check back soon.</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array(10)
            .fill(0)
            .map((_, i) => (
              <NFTCardSkeleton key={i} />
            ))}
        </div>
      ) : feed.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🎨</p>
          <h2 className="text-2xl font-black mb-4">Nothing here yet</h2>
          <p className="text-[#888] mb-8">
            {tab === 'all' ? 'No NFTs have been minted yet.' : 'Nothing in this category yet.'}
          </p>
          <Link
            href="/studio"
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-8 py-4 rounded-2xl transition-all shadow-yellow"
          >
            Create the First NFT →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {feed.map((item: any) => (
            <NFTCard
              key={`${item.collectionId}-${item.itemId}`}
              collectionId={item.collectionId}
              itemId={item.itemId}
              name={item.name}
              imageUrl={item.imageUrl}
              price={item.price}
              listed={item.listed}
            />
          ))}
        </div>
      )}
    </div>
  )
}
