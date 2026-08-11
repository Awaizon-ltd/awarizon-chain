'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { fmt } from '@/lib/constants'

interface Slide {
  collectionId: number
  name?: string
  imageUrl?: string
  bannerUrl?: string
  totalVolume?: string
  floorPrice?: string
}

export default function CollectionCarousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || slides.length <= 1) return
    const t = setInterval(() => setIndex(i => (i + 1) % slides.length), 5000)
    return () => clearInterval(t)
  }, [paused, slides.length])

  if (!slides.length) return null

  return (
    <div
      className="relative h-72 sm:h-96 rounded-2xl overflow-hidden mb-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex h-full transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((s, i) => (
          <Link
            key={s.collectionId}
            href={`/collections/${s.collectionId}`}
            className="relative h-full w-full flex-shrink-0"
          >
            {s.bannerUrl || s.imageUrl ? (
              <Image
                src={s.bannerUrl || s.imageUrl!}
                alt={s.name ?? ''}
                fill
                priority={i === 0}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-yellow-400/10 to-rz-s2" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 sm:p-10">
              <span className="inline-block bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-lg mb-3">
                #{i + 1} by volume
              </span>
              <h2 className="text-2xl sm:text-4xl font-black mb-3">
                {s.name ?? `Collection #${s.collectionId}`}
              </h2>
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-[#aaa]">Volume</p>
                  <p className="font-bold text-yellow-400">
                    {s.totalVolume ? fmt(BigInt(s.totalVolume)) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[#aaa]">Floor</p>
                  <p className="font-bold">{s.floorPrice ? fmt(BigInt(s.floorPrice)) : '—'}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button
            onClick={() => setIndex(i => (i - 1 + slides.length) % slides.length)}
            aria-label="Previous"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 transition-all"
          >
            ‹
          </button>
          <button
            onClick={() => setIndex(i => (i + 1) % slides.length)}
            aria-label="Next"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 transition-all"
          >
            ›
          </button>
          <div className="absolute bottom-4 right-4 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-6 bg-yellow-400' : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
