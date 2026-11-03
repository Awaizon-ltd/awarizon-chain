'use client'
import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { INDEXER, fmt } from '@/lib/constants'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${INDEXER}/nft/search?q=${encodeURIComponent(q)}`).then(r =>
        r.json(),
      )
      setResults(res)
    } catch {}
    setLoading(false)
  }, [])

  const onChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 400)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black mb-8">Search</h1>

      <div className="relative mb-8">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888]"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          value={query}
          onChange={e => onChange(e.target.value)}
          placeholder="Search collections and NFTs..."
          autoFocus
          className="w-full bg-rz-surface border border-rz-border rounded-2xl pl-12 pr-4 py-4 text-white placeholder-[#555] focus:outline-none focus:border-yellow-400/50 text-base transition-colors"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {results && (
        <div className="space-y-6">
          {results.collections?.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-[#888] uppercase tracking-wider mb-3">
                Collections
              </h2>
              <div className="space-y-2">
                {results.collections.map((c: any) => (
                  <Link
                    key={c.collectionId}
                    href={`/collections/${c.collectionId}`}
                    className="flex items-center gap-4 p-4 glass-panel rounded-xl hover:border-yellow-400/30 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-rz-s2 overflow-hidden flex-shrink-0">
                      {c.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.imageUrl} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">
                        {c.name ?? `Collection #${c.collectionId}`}
                      </p>
                      <p className="text-[#888] text-sm">
                        {c.totalItems} items
                        {c.floorPrice && BigInt(c.floorPrice) > 0n
                          ? ` · Floor: ${fmt(BigInt(c.floorPrice))}`
                          : ''}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.items?.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-[#888] uppercase tracking-wider mb-3">NFTs</h2>
              <div className="space-y-2">
                {results.items.map((item: any) => (
                  <Link
                    key={`${item.collectionId}-${item.itemId}`}
                    href={`/nft/${item.collectionId}/${item.itemId}`}
                    className="flex items-center gap-4 p-4 glass-panel rounded-xl hover:border-yellow-400/30 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-rz-s2 overflow-hidden flex-shrink-0">
                      {item.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{item.name ?? `#${item.itemId}`}</p>
                      <p className="text-[#888] text-sm">
                        Collection #{item.collectionId}
                        {item.listed && item.price ? ` · ${fmt(BigInt(item.price))}` : ''}
                      </p>
                    </div>
                    {item.listed && (
                      <span className="text-yellow-400 text-xs font-bold border border-yellow-400/30 rounded-lg px-2 py-1 flex-shrink-0">
                        For Sale
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.collections?.length === 0 && results.items?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#888]">No results for &quot;{query}&quot;</p>
            </div>
          )}
        </div>
      )}

      {!results && !loading && (
        <div className="text-center py-12 text-[#555]">
          <p>Type to search NFTs and collections</p>
        </div>
      )}
    </div>
  )
}
