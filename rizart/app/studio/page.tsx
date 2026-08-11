'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useWallet } from '@/lib/walletStore'
import { INDEXER, fmt } from '@/lib/constants'

export default function StudioDashboard() {
  const { address } = useWallet()
  const [collections, setCollections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!address) return
      setLoading(true)
      try {
        const res = await fetch(`${INDEXER}/nft/collections?limit=100`).then(r => r.json())
        const mine = (res.collections ?? []).filter((c: any) => c.owner === address)
        setCollections(mine)
      } catch {}
      setLoading(false)
    }
    load()
  }, [address])

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black">My Collections</h1>
          <p className="text-[#888] text-sm mt-1">Collections you own on Awarizon</p>
        </div>
        <Link
          href="/studio/collections/new"
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-yellow"
        >
          + New Collection
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="nft-card overflow-hidden">
                <div className="h-32 skeleton" />
                <div className="p-4 space-y-2">
                  <div className="h-5 skeleton rounded w-2/3" />
                  <div className="h-3 skeleton rounded w-1/2" />
                </div>
              </div>
            ))}
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-rz-border rounded-2xl">
          <p className="text-5xl mb-4">🎨</p>
          <h2 className="text-xl font-black mb-2">No collections yet</h2>
          <p className="text-[#888] mb-8">Launch your first collection to start minting NFTs.</p>
          <Link
            href="/studio/collections/new"
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-6 py-3 rounded-xl transition-all shadow-yellow"
          >
            Create Collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((c: any) => (
            <Link
              key={c.collectionId}
              href={`/studio/collections/${c.collectionId}`}
              className="nft-card block overflow-hidden p-5"
            >
              <p className="font-bold truncate mb-4">{c.name ?? `Collection #${c.collectionId}`}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[#888] text-xs mb-0.5">Items</p>
                  <p className="font-bold text-sm">{c.totalItems?.toLocaleString() ?? 0}</p>
                </div>
                <div>
                  <p className="text-[#888] text-xs mb-0.5">Floor</p>
                  <p className="font-bold text-sm text-yellow-400">
                    {c.floorPrice ? fmt(BigInt(c.floorPrice)) : '—'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
