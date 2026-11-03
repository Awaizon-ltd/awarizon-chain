'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useWallet } from '@/lib/walletStore'
import NFTCard from '@/components/NFTCard'
import { NFTCardSkeleton } from '@/components/Skeleton'
import { INDEXER, fmt, truncate } from '@/lib/constants'

export default function CollectionDetail() {
  const { id } = useParams()
  const { nftSigner, address } = useWallet()
  const [collection, setCollection] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'listed'>('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [col, itemsRes] = await Promise.all([
          fetch(`${INDEXER}/nft/collections/${id}`).then(r => r.json()),
          fetch(
            `${INDEXER}/nft/collections/${id}/items` +
              `?listed=${filter === 'listed'}&limit=50`,
          ).then(r => r.json()),
        ])
        setCollection(col)
        setItems(itemsRes.items ?? [])
      } catch {}
      setLoading(false)
    }
    load()
  }, [id, filter])

  const handleBuy = async (itemId: number, price: string) => {
    if (!nftSigner) return
    await nftSigner.market.buy(Number(id), itemId, BigInt(price))
    const res = await fetch(
      `${INDEXER}/nft/collections/${id}/items` + `?listed=${filter === 'listed'}&limit=50`,
    ).then(r => r.json())
    setItems(res.items ?? [])
  }

  if (!loading && !collection) {
    return (
      <div className="text-center py-24">
        <p className="text-[#888]">Collection not found</p>
      </div>
    )
  }

  return (
    <div>
      <div className="h-48 bg-rz-surface relative overflow-hidden">
        {(collection?.bannerUrl || collection?.imageUrl) && (
          <Image
            src={collection.bannerUrl || collection.imageUrl}
            alt=""
            fill
            className="object-cover opacity-40"
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent, #000)' }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row gap-6 -mt-12 mb-8 relative z-10">
          <div className="w-24 h-24 rounded-2xl border-4 border-rz-bg bg-rz-s2 overflow-hidden flex-shrink-0">
            {collection?.imageUrl ? (
              <Image
                src={collection.imageUrl}
                alt=""
                width={96}
                height={96}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">🎨</div>
            )}
          </div>

          <div className="flex-1 pt-14 sm:pt-0 sm:mt-14">
            <h1 className="text-3xl font-black mb-2">{collection?.name ?? `Collection #${id}`}</h1>
            {collection?.owner && (
              <p className="text-[#888] text-sm mb-4">
                by{' '}
                <Link
                  href={`/profile/${collection.owner}`}
                  className="text-yellow-400 hover:text-yellow-300"
                >
                  {truncate(collection.owner)}
                </Link>
              </p>
            )}

            <div className="flex flex-wrap gap-6">
              {[
                { label: 'Items', value: collection?.totalItems?.toLocaleString() ?? '0' },
                { label: 'Listed', value: collection?.listedItems?.toLocaleString() ?? '0' },
                {
                  label: 'Floor',
                  value: collection?.floorPrice ? fmt(BigInt(collection.floorPrice)) : '—',
                },
                {
                  label: 'Volume',
                  value:
                    collection?.totalVolume && BigInt(collection.totalVolume) > 0n
                      ? fmt(BigInt(collection.totalVolume))
                      : '—',
                },
              ].map(stat => (
                <div key={stat.label}>
                  <p className="text-[#888] text-xs">{stat.label}</p>
                  <p className="font-bold text-lg">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {address === collection?.owner && (
            <div className="flex gap-2 sm:mt-14">
              <Link
                href={`/studio/collections/${id}/mint`}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-yellow"
              >
                + Mint NFT
              </Link>
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-6 bg-rz-surface border border-rz-border rounded-xl p-1 w-fit">
          {(['all', 'listed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all
                ${filter === f ? 'bg-yellow-400 text-black' : 'text-[#888] hover:text-white'}
              `}
            >
              {f === 'all' ? 'All Items' : 'For Sale'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-16">
          {loading
            ? Array(10)
                .fill(0)
                .map((_, i) => <NFTCardSkeleton key={i} />)
            : items.map(item => (
                <NFTCard
                  key={item.itemId}
                  collectionId={Number(id)}
                  itemId={item.itemId}
                  name={item.name}
                  imageUrl={item.imageUrl}
                  price={item.price}
                  listed={item.listed}
                  onBuy={
                    item.listed && item.price && nftSigner && address !== item.owner
                      ? () => handleBuy(item.itemId, item.price)
                      : undefined
                  }
                />
              ))}
        </div>

        {!loading && items.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[#888]">
              {filter === 'listed' ? 'No items listed for sale' : 'No items in this collection yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
