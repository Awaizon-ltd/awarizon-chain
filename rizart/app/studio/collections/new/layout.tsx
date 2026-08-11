'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useWallet } from '@/lib/walletStore'
import { useCollectionWizard, isCollectionWizardComplete } from '@/lib/collectionWizardStore'
import { prepareCollectionMetadata, uploadImage } from '@/lib/upload'
import { datetimeToBlock } from '@/lib/blockTime'
import { parsePlanck } from '@/lib/constants'

const STEPS = [
  { href: '/studio/collections/new', label: 'Basic Info' },
  { href: '/studio/collections/new/mint-settings', label: 'Mint Settings' },
  { href: '/studio/collections/new/review', label: 'Review' },
]

export default function NewCollectionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { nftSigner, api } = useWallet()
  const wizard = useCollectionWizard()
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canDeploy = isCollectionWizardComplete(wizard) && !deploying

  const handleDeploy = async () => {
    if (!nftSigner || !api || !canDeploy) return
    if (wizard.itemsMetadataMode !== 'manifest' && !wizard.imageFile) return
    setDeploying(true)
    setError(null)
    try {
      // Manifest mode: the creator's own file already covers name/description/
      // items, so it becomes the collection's on-chain metadataUri directly —
      // no Cloudinary upload at all. Manual and baseUri modes both build+host
      // collection branding on Cloudinary ourselves (baseUri mode also tucks
      // its base_uri/base_uri_suffix into that same JSON for the mint page
      // to read back later).
      const metadataUri =
        wizard.itemsMetadataMode === 'manifest'
          ? wizard.itemsMetadataUri.trim()
          : await (async () => {
              const imageUrl = await uploadImage(wizard.imageFile!)
              const bannerUrl = wizard.bannerFile ? await uploadImage(wizard.bannerFile) : undefined
              return prepareCollectionMetadata(
                imageUrl,
                wizard.name,
                wizard.description,
                wizard.externalUrl,
                bannerUrl,
                wizard.itemsMetadataMode === 'baseUri' ? wizard.baseUri.trim() : undefined,
                wizard.itemsMetadataMode === 'baseUri' ? wizard.baseUriSuffix.trim() : undefined,
              )
            })()

      const mintStartBlock = wizard.mintStartAt
        ? await datetimeToBlock(api, wizard.mintStartAt)
        : undefined
      const mintEndBlock = wizard.mintEndAt ? await datetimeToBlock(api, wizard.mintEndAt) : undefined

      const { collectionId } = await nftSigner.collections.create({
        mintType: wizard.mintType,
        maxSupply: Number(wizard.maxSupply),
        mintPrice: wizard.mintPrice ? parsePlanck(wizard.mintPrice) : undefined,
        mintStartBlock,
        mintEndBlock,
      })

      await nftSigner.collections.setMetadata(collectionId, metadataUri)

      wizard.reset()
      router.push(`/studio/collections/${collectionId}`)
    } catch (err: any) {
      setError(err.message ?? 'Failed to deploy collection')
    } finally {
      setDeploying(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10 pb-28 sm:pb-10">
      <h1 className="text-2xl font-black mb-1">New Collection</h1>
      <p className="text-[#888] text-sm mb-6">Launch a new NFT collection on Awarizon</p>

      <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-hide">
        {STEPS.map((step, i) => (
          <Link
            key={step.href}
            href={step.href}
            className={`
              flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all
              ${
                pathname === step.href
                  ? 'bg-yellow-400 text-black'
                  : 'bg-rz-surface border border-rz-border text-[#888] hover:text-white'
              }
            `}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                pathname === step.href ? 'bg-black/20' : 'bg-rz-s2'
              }`}
            >
              {i + 1}
            </span>
            {step.label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 mb-6">
          {error}
        </div>
      )}

      {children}

      {/* Floating deploy button — bottom-right on desktop, full-width bottom bar on mobile */}
      <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:right-6 z-40 p-4 sm:p-0 bg-rz-bg/90 backdrop-blur-xl border-t border-rz-border sm:bg-transparent sm:backdrop-blur-none sm:border-0">
        <button
          onClick={handleDeploy}
          disabled={!canDeploy}
          className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm px-8 py-3.5 rounded-xl transition-all shadow-yellow-lg"
        >
          {deploying ? 'Deploying...' : 'Deploy Collection'}
        </button>
      </div>
    </div>
  )
}
