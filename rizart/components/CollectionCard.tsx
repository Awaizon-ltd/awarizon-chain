'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { fmt } from '@/lib/constants'

interface CollectionCardProps {
  collectionId: number
  name?: string
  imageUrl?: string
  bannerUrl?: string
  totalItems: number
  floorPrice?: string
  totalVolume?: string
}

export default function CollectionCard({
  collectionId,
  name,
  imageUrl,
  bannerUrl,
  totalItems,
  floorPrice,
  totalVolume,
}: CollectionCardProps) {
  const [imgError, setImgError] = useState(false)
  const [bannerError, setBannerError] = useState(false)
  const bannerSrc = bannerUrl && !bannerError ? bannerUrl : imageUrl

  return (
    <Link
      href={`/collections/${collectionId}`}
      className="nft-card block overflow-hidden group"
    >
      <div className="h-32 bg-rz-s2 relative overflow-hidden">
        {bannerSrc && !imgError ? (
          <Image
            src={bannerSrc}
            alt={name ?? `Collection #${collectionId}`}
            fill
            className="object-cover group-hover:scale-105 transition-all duration-300 opacity-60"
            onError={() => (bannerUrl && !bannerError ? setBannerError(true) : setImgError(true))}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-yellow-400/10 to-transparent" />
        )}

        <div className="absolute bottom-0 left-4 translate-y-1/2 w-14 h-14 rounded-xl border-2 border-rz-bg overflow-hidden bg-rz-s3">
          {imageUrl && !imgError ? (
            <Image src={imageUrl} alt="" fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">🎨</div>
          )}
        </div>
      </div>

      <div className="p-4 pt-10">
        <p className="font-bold truncate mb-3">{name ?? `Collection #${collectionId}`}</p>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[#888] text-xs mb-0.5">Items</p>
            <p className="font-bold text-sm">{totalItems.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[#888] text-xs mb-0.5">Floor</p>
            <p className="font-bold text-sm text-yellow-400">
              {floorPrice ? fmt(BigInt(floorPrice)) : '—'}
            </p>
          </div>
          <div>
            <p className="text-[#888] text-xs mb-0.5">Volume</p>
            <p className="font-bold text-sm">
              {totalVolume && BigInt(totalVolume) > 0n ? fmt(BigInt(totalVolume)) : '—'}
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}
