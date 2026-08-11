'use client'
import Link from 'next/link'
import { useCollectionWizard } from '@/lib/collectionWizardStore'
import Field, { inputCls } from '@/components/Field'

export default function CollectionBasicInfo() {
  const wizard = useCollectionWizard()

  return (
    <div className="space-y-5">
      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <Field
          label="NFT Metadata *"
          hint="How this collection's info and its NFTs get their name/image/attributes"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => wizard.set({ itemsMetadataMode: 'manual' })}
              className={`text-left p-4 rounded-xl border transition-all ${
                wizard.itemsMetadataMode === 'manual'
                  ? 'border-yellow-400 bg-yellow-400/10'
                  : 'border-rz-border bg-rz-s2 hover:border-[#2A2A2A]'
              }`}
            >
              <p className="font-bold text-sm mb-1">Set up here</p>
              <p className="text-[#888] text-xs">
                Each NFT gets its image/metadata one at a time as you mint it. Best for smaller
                drops or 1-of-1 pieces.
              </p>
            </button>
            <button
              type="button"
              onClick={() => wizard.set({ itemsMetadataMode: 'baseUri' })}
              className={`text-left p-4 rounded-xl border transition-all ${
                wizard.itemsMetadataMode === 'baseUri'
                  ? 'border-yellow-400 bg-yellow-400/10'
                  : 'border-rz-border bg-rz-s2 hover:border-[#2A2A2A]'
              }`}
            >
              <p className="font-bold text-sm mb-1">Base URI (numbered drop)</p>
              <p className="text-[#888] text-xs">
                You have a folder with one file per NFT id — the standard shape most generative
                art tools already output. No reshaping needed.
              </p>
            </button>
            <button
              type="button"
              onClick={() => wizard.set({ itemsMetadataMode: 'manifest' })}
              className={`text-left p-4 rounded-xl border transition-all ${
                wizard.itemsMetadataMode === 'manifest'
                  ? 'border-yellow-400 bg-yellow-400/10'
                  : 'border-rz-border bg-rz-s2 hover:border-[#2A2A2A]'
              }`}
            >
              <p className="font-bold text-sm mb-1">One shared file (numbered drop)</p>
              <p className="text-[#888] text-xs">
                You have ONE combined JSON file covering the whole collection — name,
                description, and every NFT keyed by number.
              </p>
            </button>
          </div>

          {wizard.itemsMetadataMode === 'manifest' && (
            <input
              value={wizard.itemsMetadataUri}
              onChange={e => wizard.set({ itemsMetadataUri: e.target.value })}
              placeholder="ipfs://... or https://... (your collection + items file)"
              className={`${inputCls} mt-3`}
            />
          )}

          {wizard.itemsMetadataMode === 'baseUri' && (
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              <input
                value={wizard.baseUri}
                onChange={e => wizard.set({ baseUri: e.target.value })}
                placeholder="ipfs://bafy.../ (base URI, one file per id)"
                className={`${inputCls} flex-1`}
              />
              <input
                value={wizard.baseUriSuffix}
                onChange={e => wizard.set({ baseUriSuffix: e.target.value })}
                placeholder="Suffix (optional, e.g. .json)"
                className={`${inputCls} sm:w-48`}
              />
            </div>
          )}
        </Field>

        {(wizard.itemsMetadataMode === 'manual' || wizard.itemsMetadataMode === 'baseUri') && (
          <>
            <Field label="Collection Name *">
              <input
                value={wizard.name}
                onChange={e => wizard.set({ name: e.target.value })}
                placeholder="My Collection"
                className={inputCls}
              />
            </Field>

            <Field label="Description *">
              <textarea
                value={wizard.description}
                onChange={e => wizard.set({ description: e.target.value })}
                placeholder="Describe your collection..."
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </Field>

            <Field
              label="Collection Image *"
              hint="Square logo shown on cards and the collection avatar"
            >
              {wizard.imagePreview ? (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-rz-s2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={wizard.imagePreview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => wizard.set({ imageFile: null, imagePreview: '' })}
                    className="absolute top-1 right-1 bg-black/60 text-white w-6 h-6 rounded-full text-xs"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label className="block border-2 border-dashed border-rz-border hover:border-yellow-400/50 rounded-xl p-6 text-center cursor-pointer transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      wizard.set({ imageFile: file, imagePreview: URL.createObjectURL(file) })
                    }}
                  />
                  <p className="text-3xl mb-1">🎨</p>
                  <p className="text-[#888] text-sm">Click to upload image</p>
                </label>
              )}
            </Field>

            <Field label="Banner Image" hint="Optional wide banner shown behind the collection header">
              {wizard.bannerPreview ? (
                <div className="relative w-full h-24 rounded-xl overflow-hidden bg-rz-s2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={wizard.bannerPreview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => wizard.set({ bannerFile: null, bannerPreview: '' })}
                    className="absolute top-1 right-1 bg-black/60 text-white w-6 h-6 rounded-full text-xs"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label className="block border-2 border-dashed border-rz-border hover:border-yellow-400/50 rounded-xl p-6 text-center cursor-pointer transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      wizard.set({ bannerFile: file, bannerPreview: URL.createObjectURL(file) })
                    }}
                  />
                  <p className="text-3xl mb-1">🖼</p>
                  <p className="text-[#888] text-sm">Click to upload banner</p>
                </label>
              )}
            </Field>

            <Field label="External URL *" hint="A link to your project's website">
              <input
                value={wizard.externalUrl}
                onChange={e => wizard.set({ externalUrl: e.target.value })}
                placeholder="https://yourwebsite.com"
                className={inputCls}
              />
            </Field>
          </>
        )}
      </div>

      <Link
        href="/studio/collections/new/mint-settings"
        className="block text-center bg-rz-surface border border-rz-border hover:border-[#2A2A2A] text-white font-bold text-sm px-4 py-3 rounded-xl transition-all"
      >
        Next: Mint Settings →
      </Link>
    </div>
  )
}
