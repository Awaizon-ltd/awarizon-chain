import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../lib/mongodb'
import { SITE_URL } from '../../../constants'

// POST /api/manifests -> stores the manifest JSON built by
// RegisterAppForm and returns a same-origin URL that becomes
// metadata_uri on-chain. The chain never fetches or validates this
// content itself — see pallets/awarizon-types/src/lib.rs. Shape must
// match AppManifestData (lib/manifestApi.ts) — no "campaign" block,
// that's a separate concern (CreateCampaign.tsx).
export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    name, description, shortDescription, category,
    developer, developerName, media, app, metadata,
  } = body

  if (
    !name || !description || !shortDescription || !category ||
    !developer || !developerName
  ) {
    return NextResponse.json(
      {
        error:
          'name, description, shortDescription, category, developer, ' +
          'and developerName are all required',
      },
      { status: 400 }
    )
  }

  if (!media?.icon) {
    return NextResponse.json(
      { error: 'media.icon is required' },
      { status: 400 }
    )
  }

  if (!app?.url || !Array.isArray(app?.platform) || app.platform.length === 0) {
    return NextResponse.json(
      { error: 'app.url and at least one app.platform are required' },
      { status: 400 }
    )
  }

  const db = await getDb()
  const result = await db.collection('manifests').insertOne({
    name,
    description,
    shortDescription,
    category,
    developer,
    developerName,
    media: {
      icon: media.icon,
      banner: media.banner ?? undefined,
      screenshots: media.screenshots ?? undefined,
      previewVideo: media.previewVideo ?? undefined,
    },
    app: {
      url: app.url,
      platform: app.platform,
    },
    metadata: {
      version: metadata?.version ?? '1.0.0',
      tags: metadata?.tags ?? [],
      language: metadata?.language ?? 'en',
      ageRating: metadata?.ageRating ?? null,
    },
    createdAt: new Date(),
  })

  const id = result.insertedId.toString()
  const url = `${SITE_URL}/api/manifests/${id}`

  return NextResponse.json({ id, url })
}
