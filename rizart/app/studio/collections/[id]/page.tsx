'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useWallet } from '@/lib/walletStore'
import NFTCard from '@/components/NFTCard'
import { NFTCardSkeleton } from '@/components/Skeleton'
import { INDEXER, fmt } from '@/lib/constants'

export default function ManageCollection() {
  const { id } = useParams()
  const { address } = useWallet()
  const [collection, setCollection] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [col, itemsRes] = await Promise.all([
          fetch(`${INDEXER}/nft/collections/${id}`).then(r => r.json()),
          fetch(`${INDEXER}/nft/collections/${id}/items?limit=100`).then(r => r.json()),
        ])
        setCollection(col)
        setItems(itemsRes.items ?? [])
      } catch {}
      setLoading(false)
    }
    load()
  }, [id])

  const isOwner = address === collection?.owner

  if (!loading && !collection) {
    return (
      <div className="max-w-6xl mx-auto px-8 py-10 text-center">
        <p className="text-[#888]">Collection not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[#888] text-sm mb-1">
            <Link href="/studio" className="hover:text-white">
              My Collections
            </Link>{' '}
            / #{id}
          </p>
          <h1 className="text-2xl font-black">{collection?.name ?? `Collection #${id}`}</h1>
          {!isOwner && !loading && (
            <p className="text-yellow-400 text-xs mt-1">
              You are viewing this collection — it is not owned by your connected wallet.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/collections/${id}`}
            className="bg-rz-surface border border-rz-border hover:border-[#2A2A2A] text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all"
          >
            View Public Page
          </Link>
          <Link
            href={`/studio/collections/${id}/mint-settings`}
            className="bg-rz-surface border border-rz-border hover:border-[#2A2A2A] text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all"
          >
            Mint Settings
          </Link>
          <Link
            href={`/studio/collections/${id}/mint`}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-yellow"
          >
            + Mint NFT
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
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
          <div key={stat.label} className="glass-panel rounded-xl p-4">
            <p className="text-[#888] text-xs mb-1">{stat.label}</p>
            <p className="font-bold text-lg">{stat.value}</p>
          </div>
        ))}
      </div>

      <h2 className="font-bold text-lg mb-4">Items</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {loading
          ? Array(10)
              .fill(0)
              .map((_, i) => <NFTCardSkeleton key={i} />)
          : items.map(item => (
              <div key={item.itemId} className="relative">
                {isOwner && (
                  <Link
                    href={`/studio/collections/${id}/items/${item.itemId}`}
                    className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-black/90 transition-all"
                  >
                    Manage
                  </Link>
                )}
                <NFTCard
                  collectionId={Number(id)}
                  itemId={item.itemId}
                  name={item.name}
                  imageUrl={item.imageUrl}
                  price={item.price}
                  listed={item.listed}
                />
              </div>
            ))}
      </div>

      {!loading && items.length === 0 && (
        <div className="text-center py-16 border border-dashed border-rz-border rounded-2xl mt-4">
          <p className="text-[#888] mb-6">No items minted into this collection yet</p>
          <Link
            href={`/studio/collections/${id}/mint`}
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-6 py-3 rounded-xl transition-all shadow-yellow"
          >
            Mint First NFT
          </Link>
        </div>
      )}
    </div>
  )
}
