'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useWallet } from '@/lib/walletStore'
import { fetchMetadata, resolveUri, prepareQuickItemMetadata } from '@/lib/upload'
import Field, { inputCls } from '@/components/Field'
import Button from '@/components/Button'

type Mode = 'manual' | 'manifest' | 'baseUri'

function ItemPreview({ image, name, attributes }: { image?: string; name?: string; attributes?: any[] }) {
  return (
    <div className="flex gap-4 items-start bg-rz-s2 border border-rz-border rounded-xl p-4">
      {image && (
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-rz-s3 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied host, not a Next/Image-allowlisted domain */}
          <img src={resolveUri(image)} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="min-w-0">
        <p className="font-bold text-sm truncate">{name ?? 'Untitled'}</p>
        {Array.isArray(attributes) && attributes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {attributes.map((a: any, i: number) => (
              <span
                key={i}
                className="text-[10px] bg-rz-s3 border border-rz-border rounded px-1.5 py-0.5 text-[#aaa]"
              >
                {a.trait_type}: {a.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MintNFT() {
  const { id } = useParams()
  const router = useRouter()
  const { nftSigner } = useWallet()
  const colId = Number(id)

  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('manual')
  const [manifest, setManifest] = useState<Record<string, any> | null>(null) // 'manifest' mode
  const [collectionMetadataUri, setCollectionMetadataUri] = useState<string | null>(null) // 'manifest' mode
  const [baseUri, setBaseUri] = useState('') // 'baseUri' mode
  const [baseUriSuffix, setBaseUriSuffix] = useState('') // 'baseUri' mode
  const [existingIds, setExistingIds] = useState<number[]>([])
  const [maxSupply, setMaxSupply] = useState<number | undefined>()
  const [loadError, setLoadError] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [deploying, setDeploying] = useState(false)

  // Manual mode
  const [subMode, setSubMode] = useState<'upload' | 'uri'>('upload')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [manualUri, setManualUri] = useState('')
  const [manualPreview, setManualPreview] = useState<any>(null)
  const [manualPreviewLoading, setManualPreviewLoading] = useState(false)
  const [manualPreviewError, setManualPreviewError] = useState<string | null>(null)

  // Numbered-drop modes (manifest / baseUri) — next-item preview + bulk range
  const [nextPreview, setNextPreview] = useState<any>(null)
  const [nextPreviewLoading, setNextPreviewLoading] = useState(false)
  const [rangeTo, setRangeTo] = useState('')
  const [rangeProgress, setRangeProgress] = useState<{ done: number; total: number } | null>(null)
  const [rangeFailures, setRangeFailures] = useState<number[]>([])

  const load = async () => {
    if (!nftSigner) return
    setLoading(true)
    setLoadError(false)
    try {
      const [collection, items] = await Promise.all([
        nftSigner.collections.get(colId),
        nftSigner.items.getByCollection(colId),
      ])
      setExistingIds(items.map((i: any) => i.itemId))
      setMaxSupply(collection?.maxSupply)

      if (collection?.metadataUri) {
        const colMeta = await fetchMetadata(collection.metadataUri)
        if (colMeta?.items && typeof colMeta.items === 'object') {
          // Combined manifest: the collection's own metadataUri IS the
          // shared file, with an `items` map keyed by id inside it.
          setMode('manifest')
          setCollectionMetadataUri(collection.metadataUri)
          setManifest(colMeta.items)
        } else if (typeof colMeta?.base_uri === 'string' && colMeta.base_uri.trim()) {
          // Base URI: each item is its own file at `base_uri + id + suffix`.
          setMode('baseUri')
          setBaseUri(colMeta.base_uri.trim())
          setBaseUriSuffix(typeof colMeta.base_uri_suffix === 'string' ? colMeta.base_uri_suffix : '')
        } else {
          setMode('manual')
        }
      }
    } catch {
      setLoadError(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount / when the collection or wallet changes
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colId, nftSigner])

  const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 0
  const full = maxSupply != null && existingIds.length >= maxSupply
  const numbered = mode === 'manifest' || mode === 'baseUri'

  /** What gets minted as an item's on-chain metadataUri for the numbered-drop modes. */
  const uriForId = (itemId: number): string | null => {
    if (mode === 'manifest') return collectionMetadataUri
    if (mode === 'baseUri') return `${baseUri}${itemId}${baseUriSuffix}`
    return null
  }

  // Live-fetch the next item's preview for 'baseUri' mode (each id is its
  // own file); 'manifest' mode just looks the id up in the already-fetched map.
  useEffect(() => {
    if (mode !== 'baseUri' || !baseUri) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off the fetch below; the fetch itself is the async side effect
    setNextPreviewLoading(true)
    fetchMetadata(`${baseUri}${nextId}${baseUriSuffix}`).then(data => {
      if (!cancelled) {
        setNextPreview(data)
        setNextPreviewLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [mode, baseUri, baseUriSuffix, nextId])

  const currentPreview = mode === 'manifest' ? manifest?.[String(nextId)] : nextPreview

  // ── Numbered-drop modes: mint next ──────────────────────────
  const handleMintNext = async () => {
    const uri = uriForId(nextId)
    if (!nftSigner || !uri || full || deploying) return
    setDeploying(true)
    setError(null)
    try {
      await nftSigner.items.mint(colId, nextId, uri)
      await load()
    } catch (err: any) {
      setError(err.message ?? 'Mint failed')
    } finally {
      setDeploying(false)
    }
  }

  // ── Numbered-drop modes: mint a range in one batch ──────────────────────────
  const handleMintRange = async () => {
    if (!nftSigner || deploying) return
    const to = Number(rangeTo)
    if (!Number.isFinite(to) || to < nextId) return
    const cappedTo = maxSupply != null ? Math.min(to, maxSupply - 1) : to
    const ids = []
    for (let i = nextId; i <= cappedTo; i++) if (!existingIds.includes(i)) ids.push(i)
    if (ids.length === 0) return

    setDeploying(true)
    setError(null)
    setRangeFailures([])
    setRangeProgress({ done: 0, total: ids.length })
    const failures: number[] = []
    for (let i = 0; i < ids.length; i++) {
      const uri = uriForId(ids[i])
      try {
        if (!uri) throw new Error('No metadata URI for this item')
        await nftSigner.items.mint(colId, ids[i], uri)
      } catch {
        failures.push(ids[i])
      }
      setRangeProgress({ done: i + 1, total: ids.length })
    }
    setRangeFailures(failures)
    await load()
    setDeploying(false)
    if (failures.length > 0) {
      setError(`${failures.length} of ${ids.length} mints failed: #${failures.join(', #')}`)
    }
  }

  // ── Manual mode: preview a pasted URI ──────────────────────────
  const handleManualPreview = async () => {
    const uri = manualUri.trim()
    if (!uri) return
    setManualPreviewLoading(true)
    setManualPreviewError(null)
    setManualPreview(null)
    const data = await fetchMetadata(uri)
    if (!data) setManualPreviewError('Could not fetch or parse metadata JSON from that URI')
    else setManualPreview(data)
    setManualPreviewLoading(false)
  }

  // ── Manual mode: mint (either uploaded image or pasted URI) ──────────────────────────
  const canMintManual =
    subMode === 'upload' ? !!(name.trim() && imageFile) : !!manualUri.trim()

  const handleMintManual = async () => {
    if (!nftSigner || !canMintManual || full || deploying) return
    setDeploying(true)
    setError(null)
    try {
      const metadataUri =
        subMode === 'upload'
          ? await prepareQuickItemMetadata(imageFile!, name.trim(), description.trim())
          : manualUri.trim()

      await nftSigner.items.mint(colId, nextId, metadataUri)
      router.push(`/studio/collections/${colId}`)
    } catch (err: any) {
      setError(err.message ?? 'Mint failed')
    } finally {
      setDeploying(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-8 py-10">
        <div className="h-48 skeleton rounded-2xl" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto px-8 py-10 text-center text-[#888]">
        Couldn&apos;t load this collection.
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-8 py-10 pb-28 sm:pb-10">
      <p className="text-[#888] text-sm mb-1">
        <Link href="/studio" className="hover:text-white">
          My Collections
        </Link>{' '}
        /{' '}
        <Link href={`/studio/collections/${id}`} className="hover:text-white">
          #{id}
        </Link>{' '}
        / Mint
      </p>
      <h1 className="text-2xl font-black mb-1">Mint NFT</h1>
      <p className="text-[#888] text-sm mb-6">
        {numbered
          ? 'This collection derives NFTs automatically — no input needed.'
          : 'Upload an image and give it a name — we handle the rest.'}
      </p>

      {full && (
        <p className="bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-sm rounded-xl p-4 mb-4">
          This collection has reached its max supply ({maxSupply}) — nothing left to mint.
        </p>
      )}

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {numbered ? (
        <div className="space-y-5">
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <p className="text-sm text-[#888]">
              Next item: <span className="text-white font-bold">#{nextId}</span>
            </p>
            {mode === 'baseUri' && nextPreviewLoading ? (
              <div className="h-20 skeleton rounded-xl" />
            ) : currentPreview ? (
              <ItemPreview
                image={currentPreview.image}
                name={currentPreview.name}
                attributes={currentPreview.attributes}
              />
            ) : (
              <p className="text-xs text-[#555]">
                No entry for #{nextId} found yet — you can still mint it, it&apos;ll resolve
                once the entry exists.
              </p>
            )}
            <Button fullWidth loading={deploying} disabled={full} onClick={handleMintNext}>
              Mint #{nextId}
            </Button>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <h2 className="font-bold text-sm">Mint a range</h2>
            <p className="text-xs text-[#555]">
              Mints every id from #{nextId} up to the one you set below, skipping any already
              minted. Each item is a separate transaction, signed one after another.
            </p>
            <div className="flex gap-2 items-center">
              <span className={`${inputCls} flex-shrink-0 w-auto opacity-60`}>#{nextId}</span>
              <span className="text-[#555]">to</span>
              <input
                type="number"
                min={nextId}
                value={rangeTo}
                onChange={e => setRangeTo(e.target.value)}
                placeholder={maxSupply != null ? String(maxSupply - 1) : '#'}
                className={`${inputCls} flex-1`}
              />
            </div>
            {rangeProgress && (
              <p className="text-xs text-yellow-400">
                Minting {rangeProgress.done} / {rangeProgress.total}...
              </p>
            )}
            {!deploying && rangeFailures.length > 0 && (
              <p className="text-xs text-red-400">Failed: #{rangeFailures.join(', #')}</p>
            )}
            <Button
              fullWidth
              variant="secondary"
              loading={deploying}
              disabled={full || !rangeTo.trim()}
              onClick={handleMintRange}
            >
              Mint Range
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setSubMode('upload')}
              className={`flex-1 text-sm font-semibold py-2.5 rounded-xl transition-all ${
                subMode === 'upload'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-rz-surface border border-rz-border text-[#888] hover:text-white'
              }`}
            >
              Upload Image
            </button>
            <button
              onClick={() => setSubMode('uri')}
              className={`flex-1 text-sm font-semibold py-2.5 rounded-xl transition-all ${
                subMode === 'uri'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-rz-surface border border-rz-border text-[#888] hover:text-white'
              }`}
            >
              Paste Metadata URI
            </button>
          </div>

          {subMode === 'upload' ? (
            <div className="glass-panel rounded-2xl p-6 space-y-5">
              <Field label="Image *">
                {imagePreview ? (
                  <div className="relative aspect-square max-w-xs mx-auto rounded-xl overflow-hidden bg-rz-s2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => {
                        setImageFile(null)
                        setImagePreview('')
                      }}
                      className="absolute top-2 right-2 bg-black/60 text-white w-8 h-8 rounded-full"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="block border-2 border-dashed border-rz-border hover:border-yellow-400/50 rounded-xl p-8 text-center cursor-pointer transition-all">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setImageFile(file)
                        setImagePreview(URL.createObjectURL(file))
                      }}
                    />
                    <p className="text-4xl mb-2">🖼</p>
                    <p className="text-[#888] text-sm">Click to upload image</p>
                    <p className="text-[#555] text-xs mt-1">PNG, JPG, GIF, SVG</p>
                  </label>
                )}
              </Field>

              <Field label="Name *">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="My NFT #1"
                  className={inputCls}
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe your NFT... (optional)"
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </Field>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-6 space-y-5">
              <Field
                label="Metadata URI *"
                hint="e.g. ipfs://bafy... or https://... — must resolve to a JSON object with name/image/attributes"
              >
                <div className="flex gap-2">
                  <input
                    value={manualUri}
                    onChange={e => setManualUri(e.target.value)}
                    placeholder="ipfs://... or https://..."
                    className={`${inputCls} flex-1`}
                  />
                  <Button
                    variant="secondary"
                    loading={manualPreviewLoading}
                    disabled={!manualUri.trim()}
                    onClick={handleManualPreview}
                  >
                    Preview
                  </Button>
                </div>
              </Field>

              {manualPreviewError && <p className="text-red-400 text-sm">{manualPreviewError}</p>}
              {manualPreview && (
                <ItemPreview
                  image={manualPreview.image}
                  name={manualPreview.name}
                  attributes={manualPreview.attributes}
                />
              )}
            </div>
          )}
        </div>
      )}

      {!numbered && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 z-40 p-4 sm:p-0 bg-rz-bg/90 backdrop-blur-xl border-t border-rz-border sm:bg-transparent sm:backdrop-blur-none sm:border-0">
          <button
            onClick={handleMintManual}
            disabled={!canMintManual || full || deploying}
            className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm px-8 py-3.5 rounded-xl transition-all shadow-yellow-lg"
          >
            {deploying ? 'Minting...' : 'Mint NFT'}
          </button>
        </div>
      )}
    </div>
  )
}
