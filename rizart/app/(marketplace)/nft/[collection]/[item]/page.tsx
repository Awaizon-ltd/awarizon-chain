'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useWallet } from '@/lib/walletStore'
import Button from '@/components/Button'
import ConnectModal from '@/components/wallet/ConnectModal'
import { INDEXER, fmt, truncate, parsePlanck } from '@/lib/constants'
import { fetchMetadata } from '@/lib/upload'

export default function NFTDetail() {
  const { collection, item } = useParams()
  const { nftSigner, address } = useWallet()
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [nftItem, setNftItem] = useState<any>(null)
  const [metadata, setMetadata] = useState<any>(null)
  const [colInfo, setColInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [listing, setListing] = useState(false)
  const [listPrice, setListPrice] = useState('')
  const [showListForm, setShowListForm] = useState(false)
  const [txMsg, setTxMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const colId = Number(collection)
  const itemId = Number(item)
  const isOwner = address === nftItem?.owner

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const itemsRes = await fetch(
          `${INDEXER}/nft/collections/${colId}/items` + `?limit=100`,
        ).then(r => r.json())

        const found = itemsRes.items?.find((i: any) => i.itemId === itemId)
        setNftItem(found ?? null)

        const colRes = await fetch(`${INDEXER}/nft/collections/${colId}`).then(r => r.json())
        setColInfo(colRes)

        if (found?.metadataUri) {
          const meta = await fetchMetadata(found.metadataUri)
          setMetadata(meta)
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [colId, itemId])

  const refresh = async () => {
    const res = await fetch(`${INDEXER}/nft/collections/${colId}/items` + `?limit=100`).then(r =>
      r.json(),
    )
    const found = res.items?.find((i: any) => i.itemId === itemId)
    setNftItem(found ?? null)
  }

  const handleBuy = async () => {
    if (!nftSigner || !nftItem?.price) return
    setBuying(true)
    setError(null)
    try {
      await nftSigner.market.buy(colId, itemId, BigInt(nftItem.price))
      setTxMsg('Purchase successful! 🎉')
      await refresh()
    } catch (err: any) {
      setError(err.message ?? 'Purchase failed')
    } finally {
      setBuying(false)
    }
  }

  const handleList = async () => {
    if (!nftSigner || !listPrice) return
    setListing(true)
    setError(null)
    try {
      const price = parsePlanck(listPrice)
      await nftSigner.market.list(colId, itemId, price)
      setTxMsg('NFT listed for sale! 🎉')
      setShowListForm(false)
      setListPrice('')
      await refresh()
    } catch (err: any) {
      setError(err.message ?? 'Listing failed')
    } finally {
      setListing(false)
    }
  }

  const handleDelist = async () => {
    if (!nftSigner) return
    setListing(true)
    setError(null)
    try {
      await nftSigner.market.delist(colId, itemId)
      setTxMsg('Listing removed')
      await refresh()
    } catch (err: any) {
      setError(err.message ?? 'Failed to delist')
    } finally {
      setListing(false)
    }
  }

  const imageUrl = metadata?.image ?? nftItem?.imageUrl
  const name = metadata?.name ?? nftItem?.name ?? `#${itemId}`

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-rz-s2 rounded-2xl skeleton" />
          <div className="space-y-4">
            <div className="h-8 skeleton rounded w-3/4" />
            <div className="h-4 skeleton rounded w-1/2" />
            <div className="h-24 skeleton rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-square bg-rz-s2 rounded-2xl overflow-hidden relative">
          {imageUrl ? (
            <Image src={imageUrl} alt={name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl text-[#333]">
              🖼
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-[#888]">
            <Link href="/collections" className="hover:text-white">
              Collections
            </Link>
            <span>/</span>
            <Link href={`/collections/${colId}`} className="hover:text-yellow-400">
              {colInfo?.name ?? `#${colId}`}
            </Link>
            <span>/</span>
            <span className="text-white">#{itemId}</span>
          </div>

          <h1 className="text-3xl font-black">{name}</h1>

          {nftItem?.owner && (
            <div className="flex items-center gap-2">
              <span className="text-[#888] text-sm">Owned by</span>
              <Link
                href={`/profile/${nftItem.owner}`}
                className="text-yellow-400 text-sm font-semibold hover:text-yellow-300"
              >
                {truncate(nftItem.owner)}
              </Link>
            </div>
          )}

          {metadata?.description && (
            <p className="text-[#888] text-sm leading-relaxed">{metadata.description}</p>
          )}

          {metadata?.external_url && (
            <a
              href={metadata.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-400 text-sm hover:text-yellow-300 transition-colors w-fit"
            >
              Visit website ↗
            </a>
          )}

          <div className="glass-panel rounded-2xl p-5">
            {nftItem?.listed && nftItem?.price ? (
              <>
                <p className="text-[#888] text-sm mb-1">Current Price</p>
                <p className="text-3xl font-black text-yellow-400 mb-4">
                  {fmt(BigInt(nftItem.price))}
                </p>

                {txMsg && <p className="text-green-400 text-sm mb-3">{txMsg}</p>}
                {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

                {isOwner ? (
                  <Button variant="danger" fullWidth loading={listing} onClick={handleDelist}>
                    Remove Listing
                  </Button>
                ) : address ? (
                  <Button fullWidth loading={buying} onClick={handleBuy}>
                    Buy Now
                  </Button>
                ) : (
                  <Button fullWidth onClick={() => setShowConnectModal(true)}>
                    Connect to Buy
                  </Button>
                )}
              </>
            ) : isOwner ? (
              <>
                <p className="text-[#888] text-sm mb-4">Not listed for sale</p>

                {txMsg && <p className="text-green-400 text-sm mb-3">{txMsg}</p>}
                {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

                {showListForm ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-[#888] block mb-2">Price (RIZ)</label>
                      <input
                        type="number"
                        value={listPrice}
                        onChange={e => setListPrice(e.target.value)}
                        placeholder="e.g. 10"
                        className="w-full bg-rz-s2 border border-rz-border rounded-xl px-4 py-3 text-white placeholder-[#555] focus:outline-none focus:border-yellow-400/50"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setShowListForm(false)}>
                        Cancel
                      </Button>
                      <Button
                        fullWidth
                        loading={listing}
                        disabled={!listPrice}
                        onClick={handleList}
                      >
                        List for Sale
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button fullWidth onClick={() => setShowListForm(true)}>
                    List for Sale
                  </Button>
                )}
              </>
            ) : (
              <p className="text-[#888] text-sm">Not listed for sale</p>
            )}
          </div>

          {metadata?.attributes?.length > 0 && (
            <div>
              <h3 className="font-bold mb-3">Attributes</h3>
              <div className="grid grid-cols-2 gap-2">
                {metadata.attributes.map((attr: any, i: number) => (
                  <div
                    key={i}
                    className="glass-panel rounded-xl p-3 text-center"
                  >
                    <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-1">
                      {attr.trait_type ?? attr.key}
                    </p>
                    <p className="font-bold text-sm truncate">{attr.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass-panel rounded-2xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#888]">Collection</span>
              <Link href={`/collections/${colId}`} className="text-yellow-400 hover:text-yellow-300 font-mono">
                #{colId}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-[#888]">Item ID</span>
              <span className="font-mono">#{itemId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#888]">Blockchain</span>
              <span>Awarizon</span>
            </div>
          </div>
        </div>
      </div>
      <ConnectModal open={showConnectModal} onClose={() => setShowConnectModal(false)} />
    </div>
  )
}
