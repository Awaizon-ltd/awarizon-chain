import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../lib/mongodb'

// Off-chain mirror of a created token's extras (logo, website,
// description) — name/symbol/decimals are also stored on-chain via
// assets.setMetadata (see lib/rawAssets.ts), duplicated here only so
// this collection is a self-contained source for /api/assetlist.json
// without re-connecting to the chain on every request.
export interface TokenMetadata {
  assetId: number
  name: string
  symbol: string
  decimals: number
  logoURI: string
  website?: string
  description?: string
  tags?: string[]
  developer: string
}

// GET /api/tokens -> every known token's off-chain metadata, used to
// merge logos into the Token Creator's "My Tokens" list and as the
// data source for /api/assetlist.json.
export async function GET() {
  const db = await getDb()
  const docs = await db.collection('tokens')
    .find({}, { projection: { _id: 0 } })
    .sort({ assetId: 1 })
    .toArray()
  return NextResponse.json(docs)
}

// POST /api/tokens -> called right after a token's on-chain create +
// setMetadata succeeds, to attach a logo and optional extras. Upserts
// by assetId, since assetId is the same unique identifier on-chain.
export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    assetId, name, symbol, decimals, logoURI,
    website, description, tags, developer,
  } = body

  if (
    assetId === undefined || !name || !symbol ||
    decimals === undefined || !logoURI || !developer
  ) {
    return NextResponse.json(
      {
        error:
          'assetId, name, symbol, decimals, logoURI, and developer ' +
          'are all required',
      },
      { status: 400 }
    )
  }

  const db = await getDb()
  await db.collection('tokens').updateOne(
    { assetId },
    {
      $set: {
        assetId, name, symbol, decimals, logoURI,
        website: website || undefined,
        description: description || undefined,
        tags: Array.isArray(tags) ? tags : undefined,
        developer,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  )

  return NextResponse.json({ ok: true })
}
