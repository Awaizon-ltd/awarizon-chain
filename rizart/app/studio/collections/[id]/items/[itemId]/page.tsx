'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWallet } from '@/lib/walletStore'
import Button from '@/components/Button'
import { inputCls } from '@/components/Field'
import { fmt, truncate, parsePlanck } from '@/lib/constants'

export default function ManageItem() {
  const { id, itemId } = useParams()
  const router = useRouter()
  const { nftSigner, address } = useWallet()
  const [item, setItem] = useState<any>(null)
  const [collection, setCollection] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [listPrice, setListPrice] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [newMetadataUri, setNewMetadataUri] = useState('')

  const colId = Number(id)
  const itmId = Number(itemId)

  const load = async () => {
    if (!nftSigner) return
    setLoading(true)
    try {
      const [it, col] = await Promise.all([
        nftSigner.items.get(colId, itmId),
        nftSigner.collections.get(colId),
      ])
      setItem(it)
      setCollection(col)
      if (it?.metadataUri) setNewMetadataUri(it.metadataUri)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount / when the item or wallet changes
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colId, itmId, nftSigner])

  const isOwner = address === item?.owner
  const isCollectionAdmin = address === collection?.owner

  const run = async (label: string, fn: () => Promise<any>) => {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await fn()
      setSuccess(label)
      await load()
    } catch (err: any) {
      setError(err.message ?? 'Transaction failed')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-8 py-10">
        <div className="h-64 skeleton rounded-2xl" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="max-w-xl mx-auto px-8 py-10 text-center text-[#888]">Item not found</div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-8 py-10">
      <p className="text-[#888] text-sm mb-1">
        <Link href="/studio" className="hover:text-white">
          My Collections
        </Link>{' '}
        /{' '}
        <Link href={`/studio/collections/${id}`} className="hover:text-white">
          #{id}
        </Link>{' '}
        / #{itemId}
      </p>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black">Manage NFT #{itemId}</h1>
        <Link
          href={`/nft/${id}/${itemId}`}
          className="bg-rz-surface border border-rz-border hover:border-[#2A2A2A] text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all"
        >
          View Public Page
        </Link>
      </div>

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-400 mb-6">
          ✓ {success}
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 mb-6">
          {error}
        </div>
      )}

      <div className="space-y-5">
        <div className="glass-panel rounded-2xl p-5 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-[#888]">Owner</span>
            <span className="font-mono">{truncate(item.owner)}</span>
          </div>
          {item.price && (
            <div className="flex justify-between">
              <span className="text-[#888]">Listed Price</span>
              <span className="text-yellow-400 font-bold">{fmt(BigInt(item.price))}</span>
            </div>
          )}
        </div>

        {isOwner && (
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <h2 className="font-bold text-sm">Marketplace</h2>
            {item.price ? (
              <Button
                variant="danger"
                fullWidth
                loading={busy}
                onClick={() => run('Delisted from sale', () => nftSigner!.market.delist(colId, itmId))}
              >
                Remove Listing
              </Button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={listPrice}
                  onChange={e => setListPrice(e.target.value)}
                  placeholder="Price in RIZ"
                  className={`${inputCls} flex-1`}
                />
                <Button
                  loading={busy}
                  disabled={!listPrice}
                  onClick={() =>
                    run('Listed for sale', () =>
                      nftSigner!.market.list(colId, itmId, parsePlanck(listPrice)),
                    )
                  }
                >
                  List
                </Button>
              </div>
            )}
          </div>
        )}

        {isOwner && (
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <h2 className="font-bold text-sm">Transfer</h2>
            <div className="flex gap-2">
              <input
                value={transferTo}
                onChange={e => setTransferTo(e.target.value)}
                placeholder="Recipient address"
                className={`${inputCls} flex-1`}
              />
              <Button
                loading={busy}
                disabled={!transferTo}
                onClick={() =>
                  run('Transferred', async () => {
                    await nftSigner!.items.transfer(colId, itmId, transferTo)
                    router.push(`/studio/collections/${id}`)
                  })
                }
              >
                Transfer
              </Button>
            </div>
          </div>
        )}

        {isCollectionAdmin && (
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <h2 className="font-bold text-sm">Update Metadata URI</h2>
            <p className="text-xs text-[#555]">
              Collection admin only. Points the item at a different off-chain metadata URI.
            </p>
            <div className="flex gap-2">
              <input
                value={newMetadataUri}
                onChange={e => setNewMetadataUri(e.target.value)}
                placeholder="https://..."
                className={`${inputCls} flex-1`}
              />
              <Button
                loading={busy}
                disabled={!newMetadataUri}
                onClick={() =>
                  run('Metadata updated', () =>
                    nftSigner!.items.setMetadata(colId, itmId, newMetadataUri),
                  )
                }
              >
                Update
              </Button>
            </div>
          </div>
        )}

        {isOwner && (
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <h2 className="font-bold text-sm text-red-400">Danger Zone</h2>
            <p className="text-xs text-[#555]">
              Burning permanently destroys this NFT. This cannot be undone.
            </p>
            <Button
              variant="danger"
              fullWidth
              loading={busy}
              onClick={() =>
                run('Burned', async () => {
                  await nftSigner!.items.burn(colId, itmId)
                  router.push(`/studio/collections/${id}`)
                })
              }
            >
              Burn NFT
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
