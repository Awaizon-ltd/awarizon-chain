import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb } from '../../../../lib/mongodb'

// GET /api/manifests/:id -> raw manifest JSON, no wrapper. This is
// the URL registered on-chain as metadata_uri, so whatever fetches it
// (this portal's Apps grid, a wallet's inbox, or any third-party app
// wanting to read a listing) gets the manifest fields directly.
//
// Public data feed meant to be fetched cross-origin (a dApp's own
// frontend, a wallet's in-app browser, ...) — same reasoning as
// assetlist.json's CORS headers. Without them the browser blocks those
// reads entirely even though the data itself has no auth requirement.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: 'Invalid manifest id' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const db = await getDb()
  const doc = await db.collection('manifests').findOne({ _id: new ObjectId(id) })
  if (!doc) {
    return NextResponse.json(
      { error: 'Manifest not found' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const { _id, createdAt, ...manifest } = doc
  return NextResponse.json(manifest, { headers: CORS_HEADERS })
}
