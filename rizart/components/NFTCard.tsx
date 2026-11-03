'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { fmt } from '@/lib/constants'

interface NFTCardProps {
  collectionId: number
  itemId: number
  name?: string
  imageUrl?: string
  owner?: string
  price?: string
  listed?: boolean
  onBuy?: () => void
}

export default function NFTCard({
  collectionId,
  itemId,
  name,
  imageUrl,
  price,
  listed,
  onBuy,
}: NFTCardProps) {
  const [imgError, setImgError] = useState(false)
  const [buying, setBuying] = useState(false)

  const handleBuy = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!onBuy || buying) return
    setBuying(true)
    try {
      await onBuy()
    } finally {
      setBuying(false)
    }
  }

  return (
    <Link href={`/nft/${collectionId}/${itemId}`} className="nft-card block overflow-hidden group">
      <div className="aspect-square bg-rz-s2 overflow-hidden relative">
        {imageUrl && !imgError ? (
          <Image
            src={imageUrl}
            alt={name ?? `#${itemId}`}
            fill
            className="object-cover group-hover:scale-105 transition-all duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-[#333]">
            🖼
          </div>
        )}

        {listed && (
          <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-lg">
            For Sale
          </div>
        )}
      </div>

      <div className="p-4">
        <p className="font-bold text-sm truncate mb-1">{name ?? `#${itemId}`}</p>

        <div className="flex items-center justify-between">
          {listed && price ? (
            <>
              <div>
                <p className="text-[#888] text-xs">Price</p>
                <p className="text-yellow-400 font-bold text-sm">{fmt(BigInt(price))}</p>
              </div>
              {onBuy && (
                <button
                  onClick={handleBuy}
                  disabled={buying}
                  className="bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-black font-bold text-xs px-3 py-1.5 rounded-lg transition-all"
                >
                  {buying ? '...' : 'Buy'}
                </button>
              )}
            </>
          ) : (
            <p className="text-[#555] text-xs">#{itemId}</p>
          )}
        </div>
      </div>
    </Link>
  )
}
