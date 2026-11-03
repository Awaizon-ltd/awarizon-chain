export function NFTCardSkeleton() {
  return (
    <div className="nft-card overflow-hidden">
      <div className="aspect-square skeleton" />
      <div className="p-4 space-y-2">
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="h-3 skeleton rounded w-1/2" />
      </div>
    </div>
  )
}

export function CollectionCardSkeleton() {
  return (
    <div className="nft-card overflow-hidden">
      <div className="h-32 skeleton" />
      <div className="p-4 pt-10 space-y-3">
        <div className="h-5 skeleton rounded w-2/3" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-8 skeleton rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
