'use client'
import { create } from 'zustand'

interface CollectionWizardFields {
  name: string
  description: string
  imageFile: File | null
  imagePreview: string
  /** Optional wide banner shown behind the collection header — separate from the square logo/image. */
  bannerFile: File | null
  bannerPreview: string
  externalUrl: string
  /**
   * How this collection's metadata (and its items') is sourced.
   * 'manual' — Studio builds+hosts the collection's own metadata JSON on
   * Cloudinary from the fields below; items are provided one at a time as
   * they're minted (uploaded to Cloudinary or pasted in).
   * 'manifest' — creator already hosts ONE JSON file covering the whole
   * collection (name/description + every item keyed by id, e.g. a
   * 9,999-item PFP drop) — that URI becomes the collection's on-chain
   * metadataUri directly, no Cloudinary involved at all. Studio mints items
   * by looking each one up inside it, no per-item input needed.
   * 'baseUri' — creator has a folder of one file per item id (the standard
   * shape most generative-art tooling already outputs — no reshaping into a
   * combined file needed). Collection branding still goes through Cloudinary
   * like 'manual' (it's cheap, just 1-2 images); each item's metadataUri is
   * derived as `baseUri + id + baseUriSuffix` at mint time.
   */
  itemsMetadataMode: 'manual' | 'manifest' | 'baseUri'
  /** Only used when itemsMetadataMode === 'manifest'. */
  itemsMetadataUri: string
  /** Only used when itemsMetadataMode === 'baseUri'. */
  baseUri: string
  /** Only used when itemsMetadataMode === 'baseUri' — e.g. '' or '.json'. */
  baseUriSuffix: string
  maxSupply: string
  mintType: 'Public' | 'Issuer'
  mintPrice: string
  /** datetime-local input value, e.g. "2026-08-01T12:00" — optional advanced field */
  mintStartAt: string
  /** datetime-local input value — optional advanced field */
  mintEndAt: string
}

interface CollectionWizardState extends CollectionWizardFields {
  set: (patch: Partial<CollectionWizardFields>) => void
  reset: () => void
}

const initial: CollectionWizardFields = {
  name: '',
  description: '',
  imageFile: null,
  imagePreview: '',
  bannerFile: null,
  bannerPreview: '',
  externalUrl: '',
  itemsMetadataMode: 'manual',
  itemsMetadataUri: '',
  baseUri: '',
  baseUriSuffix: '',
  maxSupply: '',
  mintType: 'Public',
  mintPrice: '',
  mintStartAt: '',
  mintEndAt: '',
}

export const useCollectionWizard = create<CollectionWizardState>(set => ({
  ...initial,
  set: patch => set(patch),
  reset: () => set(initial),
}))

/**
 * Required fields per the collection-creation spec. In manifest mode the
 * shared file supplies name/description/items itself, so none of Basic
 * Info's Cloudinary-upload fields apply — only the manifest URI (plus the
 * on-chain mint settings, which are independent of metadata source) matter.
 */
export function isCollectionWizardComplete(s: CollectionWizardFields): boolean {
  if (!s.maxSupply.trim() || Number(s.maxSupply) <= 0 || !s.mintType) return false

  if (s.itemsMetadataMode === 'manifest') {
    return !!s.itemsMetadataUri.trim()
  }

  const brandingComplete = !!(
    s.name.trim() &&
    s.description.trim() &&
    s.imageFile &&
    s.externalUrl.trim()
  )
  if (s.itemsMetadataMode === 'baseUri') {
    return brandingComplete && !!s.baseUri.trim()
  }
  return brandingComplete
}
