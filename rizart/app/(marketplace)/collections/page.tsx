import { INDEXER } from '@/lib/constants'
import CollectionCard from '@/components/CollectionCard'
import Link from 'next/link'

async function getCollections() {
  try {
    const res = await fetch(`${INDEXER}/nft/collections?limit=50`, {
      next: { revalidate: 30 },
    })
    return await res.json()
  } catch {
    return { collections: [], total: 0 }
  }
}

export default async function Collections() {
  const data = await getCollections()
  const collections = data.collections ?? []

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Collections</h1>
          <p className="text-[#888] text-sm mt-1">
            {data.total ?? collections.length} collections on Awarizon
          </p>
        </div>
        <Link
          href="/studio/collections/new"
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-yellow"
        >
          + Create Collection
        </Link>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-6xl mb-4">🎨</p>
          <h2 className="text-2xl font-black mb-4">No Collections Yet</h2>
          <p className="text-[#888] mb-8">Be the first to create a collection</p>
          <Link
            href="/studio/collections/new"
            className="inline-block bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-8 py-4 rounded-2xl transition-all shadow-yellow"
          >
            Create Collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {collections.map((c: any) => (
            <CollectionCard
              key={c.collectionId}
              collectionId={c.collectionId}
              name={c.name}
              imageUrl={c.imageUrl}
              bannerUrl={c.bannerUrl}
              totalItems={c.totalItems}
              floorPrice={c.floorPrice}
              totalVolume={c.totalVolume}
            />
          ))}
        </div>
      )}
    </div>
  )
}
