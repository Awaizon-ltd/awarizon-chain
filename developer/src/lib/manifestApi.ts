// The chain's metadata_uri is a fully opaque bounded string — nothing
// on-chain defines or validates a manifest schema (verified against
// pallets/awarizon-types/src/lib.rs). This shape is this app's own
// convention: whatever the manifest_uri points to, an app-listing UI
// (this portal's Apps page, or eventually a wallet's inbox) needs
// these fields to render something to a user.
//
// Deliberately excludes "campaign" — a campaign's promotional copy
// (title/callToAction/rewardDescription) belongs to a *campaign*, and
// one app can back several campaigns with different messaging, so it
// doesn't belong on the app's own listing. See CreateCampaign.tsx.
export interface AppManifestData {
  name: string
  description: string
  shortDescription: string
  category: string
  developer: string
  developerName: string

  media: {
    icon: string
    banner?: string
    screenshots?: string[]
    previewVideo?: string
  }

  app: {
    url: string
    platform: string[]
  }

  metadata: {
    version: string
    tags: string[]
    language: string
    ageRating: string
  }
}

export async function saveManifest(
  manifest: AppManifestData
): Promise<{ id: string; url: string }> {
  const res = await fetch('/api/manifests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(manifest),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.error ?? `Failed to save manifest (${res.status})`)
  }
  return res.json()
}

export async function fetchManifest(
  url: string
): Promise<AppManifestData | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// Every metadata_uri this portal has ever generated has the shape
// `{host}/api/manifests/{mongoId}` (see api/manifests/route.ts) — the
// id is what actually identifies the manifest, and stays valid even
// when the host doesn't (e.g. a metadata_uri minted under a dev
// machine's address that's no longer reachable). Host-agnostic on
// purpose, so it still matches regardless of which origin was live
// when a given app got registered.
const MANIFEST_ID_RE = /\/api\/manifests\/([a-f0-9]{24})(?:[/?#]|$)/i

export function extractManifestId(uri: string): string | null {
  return uri.match(MANIFEST_ID_RE)?.[1] ?? null
}

// Batched, DB-first resolution for a list of on-chain metadata_uri
// values. Anything recognizable as one of our own manifest URLs is
// read straight out of Mongo in a single request, regardless of
// whether its host is actually reachable. Anything else (a
// third-party-hosted manifest) falls back to a real fetch, same as
// fetchManifest(). Returns a map keyed by the original uri so callers
// can zip it back onto their on-chain app list.
export async function fetchManifests(
  uris: string[]
): Promise<Record<string, AppManifestData | null>> {
  const ids = Array.from(new Set(
    uris.map(extractManifestId).filter((id): id is string => Boolean(id))
  ))

  let byId: Record<string, AppManifestData> = {}
  if (ids.length) {
    try {
      const res = await fetch('/api/manifests/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (res.ok) byId = await res.json()
    } catch {
      // Falls through — every uri just goes through the fetch fallback below.
    }
  }

  const result: Record<string, AppManifestData | null> = {}
  const remaining: string[] = []
  for (const uri of uris) {
    const id = extractManifestId(uri)
    if (id && byId[id]) {
      result[uri] = byId[id]
    } else {
      remaining.push(uri)
    }
  }

  const fetched = await Promise.all(remaining.map(fetchManifest))
  remaining.forEach((uri, i) => { result[uri] = fetched[i] })

  return result
}
