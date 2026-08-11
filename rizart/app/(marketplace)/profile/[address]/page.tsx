'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useWallet } from '@/lib/walletStore'
import NFTCard from '@/components/NFTCard'
import { NFTCardSkeleton } from '@/components/Skeleton'
import Avatar from '@/components/Avatar'
import { INDEXER, truncate } from '@/lib/constants'

export default function Profile() {
  const { address } = useParams()
  const { address: myAddress } = useWallet()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const isMe = myAddress === address

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`${INDEXER}/nft/owned/${address}?limit=50`).then(r => r.json())
        setItems(res.items ?? [])
      } catch {}
      setLoading(false)
    }
    load()
  }, [address])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Avatar
          address={String(address)}
          size={64}
          className="border-2 border-yellow-400/30"
        />
        <div>
          <h1 className="text-2xl font-black">{isMe ? 'My Profile' : 'Profile'}</h1>
          <p className="text-[#888] font-mono text-sm">{truncate(String(address))}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'NFTs Owned', value: items.length },
          { label: 'Listed', value: items.filter(i => i.listed).length },
          { label: 'Collections', value: new Set(items.map(i => i.collectionId)).size },
        ].map(stat => (
          <div
            key={stat.label}
            className="glass-panel rounded-xl p-4 text-center"
          >
            <p className="text-2xl font-black text-yellow-400">{stat.value}</p>
            <p className="text-[#888] text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {loading
          ? Array(8)
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
              />
            ))}
      </div>

      {!loading && items.length === 0 && (
        <div className="text-center py-24">
          <p className="text-5xl mb-4">🖼</p>
          <p className="text-[#888]">{isMe ? 'You have no NFTs yet' : 'No NFTs found'}</p>
        </div>
      )}
    </div>
  )
}
