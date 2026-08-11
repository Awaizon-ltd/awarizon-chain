import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../lib/mongodb'

// Same idea as Solana's early token-list project
// (github.com/solana-labs/token-list) — a single canonical JSON
// document wallets/DEXes/explorers can fetch to resolve an asset id
// to its symbol, name, decimals, and logo, instead of every consumer
// inventing its own lookup. pallet_assets has no contract-address
// concept the way an EVM/SPL mint does, so `address` here is just the
// asset id, stringified for shape-compatibility with that convention.
// Public data feed meant to be fetched cross-origin (dex.awarizon.com,
// wallets, explorers, ...) — same as Solana's token-list JSON. Without
// an explicit CORS header the browser blocks those reads entirely, and
// since callers treat a failed fetch the same as an empty list, that
// showed up as "no token logos" rather than an obvious error.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(request: NextRequest) {
  const db = await getDb()
  const docs = await db.collection('tokens')
    .find({}, { projection: { _id: 0 } })
    .sort({ assetId: 1 })
    .toArray()

  const origin = new URL(request.url).origin

  return NextResponse.json({
    name: 'Awarizon Token List',
    logoURI: `${origin}/logo.png`,
    keywords: ['awarizon', 'riz', 'pallet-assets'],
    timestamp: new Date().toISOString(),
    tokens: docs.map((t: any) => ({
      chainId: 1,
      address: String(t.assetId),
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      logoURI: t.logoURI,
      tags: t.tags ?? [],
      extensions: {
        ...(t.website ? { website: t.website } : {}),
        ...(t.description ? { description: t.description } : {}),
      },
    })),
  }, { headers: CORS_HEADERS })
}
