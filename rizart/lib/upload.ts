import { CLOUDINARY_CLOUD, CLOUDINARY_PRESET } from './constants'

/** Upload image file to Cloudinary. Returns secure image URL. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', CLOUDINARY_PRESET)
  form.append('folder', 'rizart/nfts')

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error('Image upload failed')
  const data = await res.json()
  return data.secure_url as string
}

/** Upload metadata JSON to Cloudinary as a raw file. Returns the URL to the JSON file. */
export async function uploadMetadata(metadata: object): Promise<string> {
  const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  const file = new File([blob], 'metadata.json', { type: 'application/json' })
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', CLOUDINARY_PRESET)
  form.append('folder', 'rizart/metadata')
  form.append('resource_type', 'raw')

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/raw/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error('Metadata upload failed')
  const data = await res.json()
  return data.secure_url as string
}

/**
 * Collection metadata — caller provides the image URL and, optionally, a
 * separate wide banner URL (`banner_image`, shown behind the collection
 * header — distinct from the square `image` logo).
 *
 * Used for both "manual" and "baseUri" collections — branding is cheap
 * (1-2 images) so it always goes through Cloudinary regardless of how items
 * get their metadata. `baseUri`/`baseUriSuffix`, when set, record the
 * standard "one file per item id" convention (`baseUri + id + baseUriSuffix`
 * is each item's own metadataUri) most generative-art tooling already
 * outputs — Studio reads these back off the collection to derive per-item
 * URIs at mint time, no reshaping into a combined file required.
 *
 * A fully "manifest" collection skips this function entirely instead — the
 * creator's own combined file (name/description + an `items` map keyed by
 * item id) becomes the collection's on-chain metadataUri directly; see the
 * indexer's metadata_resolver for how that file gets read on both the
 * collection and per-item side.
 */
export async function prepareCollectionMetadata(
  imageUrl: string,
  name: string,
  description: string,
  externalUrl?: string,
  bannerUrl?: string,
  baseUri?: string,
  baseUriSuffix?: string,
): Promise<string> {
  const metadata = {
    name,
    description,
    image: imageUrl,
    banner_image: bannerUrl ?? '',
    external_url: externalUrl ?? '',
    base_uri: baseUri ?? '',
    base_uri_suffix: baseUriSuffix ?? '',
  }
  return uploadMetadata(metadata)
}

/**
 * Standalone-item quick mint: creator just uploads one image + name/
 * description right here, we host it on Cloudinary and build the metadata
 * JSON for them. This is the ONLY path where RizArt hosts an individual
 * NFT's image/metadata itself — every other per-item mint uses a URI the
 * creator already prepared elsewhere (see `fetchMetadata`/`resolveUri`).
 */
export async function prepareQuickItemMetadata(
  imageFile: File,
  name: string,
  description?: string,
): Promise<string> {
  const imageUrl = await uploadImage(imageFile)
  const metadata = {
    name,
    description: description ?? '',
    image: imageUrl,
  }
  return uploadMetadata(metadata)
}

/** Rewrite an `ipfs://` URI to a fetchable gateway URL; leaves other URIs untouched. */
export function resolveUri(uri: string): string {
  return uri.startsWith('ipfs://') ? uri.replace('ipfs://', 'https://ipfs.io/ipfs/') : uri
}

/** Fetch metadata from a URI (NFT items bring their own — we only ever read, never pin/upload one ourselves). */
export async function fetchMetadata(uri: string): Promise<any | null> {
  try {
    const res = await fetch(resolveUri(uri))
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
