import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../constants'

// Unsigned client-side upload — Cloudinary enforces the rules
// (folder, size/format limits) via the preset itself, so no API
// secret is needed in the browser.
async function upload(file: File, resourceType: 'image' | 'video'): Promise<string> {
  const body = new FormData()
  body.append('file', file)
  body.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    { method: 'POST', body }
  )

  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(
      detail?.error?.message ?? `${resourceType} upload to Cloudinary failed`
    )
  }

  const json = await res.json()
  return json.secure_url as string
}

export function uploadImage(file: File): Promise<string> {
  return upload(file, 'image')
}

export function uploadVideo(file: File): Promise<string> {
  return upload(file, 'video')
}

// Kept as an alias — icon is just an image upload, but the name made
// the call site read clearly before banner/screenshots existed too.
export const uploadIcon = uploadImage
