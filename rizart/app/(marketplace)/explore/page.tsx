'use client'
import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useWallet } from '@/lib/walletStore'
import NFTCard from '@/components/NFTCard'
import { NFTCardSkeleton } from '@/components/Skeleton'
import { INDEXER } from '@/lib/constants'

function ExploreContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { nftSigner } = useWallet()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const listedOnly = searchParams.get('listed') === 'true'

  const load = useCallback(
    async (reset = false) => {
      setLoading(true)
      try {
        const offset = reset ? 0 : page * 20
        const res = await fetch(`${INDEXER}/nft/collections?limit=100`).then(r => r.json())

        const allItems: any[] = []
        for (const col of res.collections ?? []) {
          const itemRes = await fetch(
            `${INDEXER}/nft/collections/` +
              `${col.collectionId}/items` +
              `?listed=${listedOnly}` +
              `&limit=20&offset=${offset}`,
          ).then(r => r.json())

          for (const item of itemRes.items ?? []) {
            allItems.push({ ...item, collectionName: col.name })
          }
        }

        if (reset) {
          setItems(allItems)
        } else {
          setItems(prev => [...prev, ...allItems])
        }
        setHasMore(allItems.length === 20)
        if (!reset) setPage(p => p + 1)
      } catch {}
      setLoading(false)
    },
    [page, listedOnly],
  )

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- refetch-on-filter-change is the intended pattern */
    setPage(0)
    load(true)
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-runs only on filter change
  }, [listedOnly])

  const handleBuy = async (collectionId: number, itemId: number, price: string) => {
    if (!nftSigner) return
    await nftSigner.market.buy(collectionId, itemId, BigInt(price))
    load(true)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black">Explore</h1>

        <div className="flex gap-2 bg-rz-surface border border-rz-border rounded-xl p-1">
          {[
            { label: 'All', listed: false },
            { label: 'For Sale', listed: true },
          ].map(tab => (
            <button
              key={tab.label}
              onClick={() => router.push(`/explore${tab.listed ? '?listed=true' : ''}`)}
              className={`
                px-4 py-2 rounded-lg text-sm font-semibold transition-all
                ${
                  listedOnly === tab.listed
                    ? 'bg-yellow-400 text-black'
                    : 'text-[#888] hover:text-white'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {loading && items.length === 0
          ? Array(10)
              .fill(0)
              .map((_, i) => <NFTCardSkeleton key={i} />)
          : items.map(item => (
              <NFTCard
                key={`${item.collectionId}-${item.itemId}`}
                collectionId={item.collectionId}
                itemId={item.itemId}
                name={item.name}
                imageUrl={item.imageUrl}
                price={item.price}
                listed={item.listed}
                onBuy={
                  item.listed && item.price && nftSigner
                    ? () => handleBuy(item.collectionId, item.itemId, item.price)
                    : undefined
                }
              />
            ))}
      </div>

      {!loading && items.length === 0 && (
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🔍</p>
          <p className="text-[#888]">
            {listedOnly ? 'No NFTs listed for sale yet' : 'No NFTs minted yet'}
          </p>
        </div>
      )}

      {hasMore && !loading && items.length > 0 && (
        <div className="text-center mt-8">
          <button
            onClick={() => load(false)}
            className="bg-rz-surface border border-rz-border hover:border-[#2A2A2A] text-white font-bold px-8 py-3 rounded-xl transition-all"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  )
}

export default function Explore() {
  return (
    <Suspense fallback={null}>
      <ExploreContent />
    </Suspense>
  )
}
