'use client'
import Link from 'next/link'
import { useCollectionWizard, isCollectionWizardComplete } from '@/lib/collectionWizardStore'

export default function CollectionReview() {
  const wizard = useCollectionWizard()
  const complete = isCollectionWizardComplete(wizard)

  const isManifest = wizard.itemsMetadataMode === 'manifest'
  const isBaseUri = wizard.itemsMetadataMode === 'baseUri'
  const hasBranding = !isManifest

  const rows: { label: string; value: string; missing?: boolean }[] = isManifest
    ? [
        {
          label: 'NFT Metadata',
          value: wizard.itemsMetadataUri || '—',
          missing: !wizard.itemsMetadataUri.trim(),
        },
      ]
    : [
        { label: 'Name', value: wizard.name || '—', missing: !wizard.name },
        { label: 'Description', value: wizard.description || '—', missing: !wizard.description },
        { label: 'Image', value: wizard.imageFile?.name ?? '—', missing: !wizard.imageFile },
        { label: 'Banner', value: wizard.bannerFile?.name ?? 'None' },
        { label: 'External URL', value: wizard.externalUrl || '—', missing: !wizard.externalUrl },
      ]

  if (isBaseUri) {
    rows.push({
      label: 'Item Base URI',
      value: wizard.baseUri
        ? `${wizard.baseUri}{id}${wizard.baseUriSuffix}`
        : '—',
      missing: !wizard.baseUri.trim(),
    })
  }

  rows.push(
    {
      label: 'Max Supply',
      value: wizard.maxSupply || '—',
      missing: !wizard.maxSupply || Number(wizard.maxSupply) <= 0,
    },
    { label: 'Mint Type', value: wizard.mintType },
    { label: 'Mint Price', value: wizard.mintPrice ? `${wizard.mintPrice} RIZ` : 'Free' },
    { label: 'Mint Starts', value: wizard.mintStartAt || 'No restriction' },
    { label: 'Mint Ends', value: wizard.mintEndAt || 'No restriction' },
  )

  return (
    <div className="space-y-5">
      {hasBranding && wizard.bannerPreview && (
        <div className="w-full h-24 rounded-xl overflow-hidden bg-rz-s2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={wizard.bannerPreview} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      {hasBranding && wizard.imagePreview && (
        <div className="w-24 h-24 rounded-xl overflow-hidden bg-rz-s2 mx-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={wizard.imagePreview} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="glass-panel rounded-2xl overflow-hidden">
        {rows.map(row => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 px-5 py-3 border-b border-rz-border last:border-0"
          >
            <span className="text-[#888] text-sm flex-shrink-0">{row.label}</span>
            <span
              className={`text-sm text-right truncate ${row.missing ? 'text-red-400' : 'text-white'}`}
            >
              {row.missing ? 'Required — missing' : row.value}
            </span>
          </div>
        ))}
      </div>

      {!complete && (
        <p className="text-center text-sm text-[#888]">
          Fill in every required field across Basic Info and Mint Settings to deploy.
        </p>
      )}
      {complete && (
        <p className="text-center text-sm text-yellow-400">
          Everything looks good — hit Deploy Collection below.
        </p>
      )}

      <Link
        href="/studio/collections/new/mint-settings"
        className="block text-center bg-rz-surface border border-rz-border hover:border-[#2A2A2A] text-white font-bold text-sm px-4 py-3 rounded-xl transition-all"
      >
        ← Back to Mint Settings
      </Link>
    </div>
  )
}
