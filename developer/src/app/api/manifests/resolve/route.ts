import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb } from '../../../../lib/mongodb'

// POST /api/manifests/resolve { ids: string[] } -> { [id]: manifest }
//
// Apps.tsx / CreateCampaign.tsx list registered apps, each carrying a
// metadata_uri read from chain. The naive approach — fetch(metadataUri)
// for every app — breaks the instant that URL's host is unreachable
// (see route.ts: metadata_uri used to be built from the registering
// browser's own origin, so plenty of already-registered apps point at
// dead localhost addresses forever, since the chain never updates).
//
// But every URL this portal has ever generated has the same shape,
// `{host}/api/manifests/{mongoId}` — the id is the only part that
// actually matters, and it's still valid even when the host isn't. This
// endpoint lets the id be resolved directly against our own database in
// one batched call instead of one HTTP round-trip per app, per host.
//
// Same public, cross-origin data feed as [id]/route.ts — see its CORS
// comment. A third-party app resolving several manifests at once should
// be able to hit this from its own browser frontend too, not just
// server-side.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  const { ids } = await request.json()
  if (!Array.isArray(ids) || !ids.length) {
    return NextResponse.json({}, { headers: CORS_HEADERS })
  }

  const objectIds = ids
    .filter((id): id is string => typeof id === 'string' && ObjectId.isValid(id))
    .map(id => new ObjectId(id))
  if (!objectIds.length) {
    return NextResponse.json({}, { headers: CORS_HEADERS })
  }

  const db = await getDb()
  const docs = await db.collection('manifests')
    .find({ _id: { $in: objectIds } })
    .toArray()

  const byId: Record<string, unknown> = {}
  for (const doc of docs) {
    const { _id, createdAt, ...manifest } = doc
    byId[_id.toString()] = manifest
  }
  return NextResponse.json(byId, { headers: CORS_HEADERS })
}
