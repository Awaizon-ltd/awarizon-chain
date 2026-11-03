import { getClient } from '../api/client'
import { lookupName } from '@awarizon/sdk'

export type SearchResult =
  | { type: 'block'; value: number }
  // 0x + 64 hex chars — could be a block hash or a tx hash. Blocks.tsx
  // already resolves this ambiguity (tries as a block hash via chain RPC,
  // then the recent-tx cache, then a campaign ID).
  | { type: 'hash'; value: string }
  | { type: 'address'; value: string }
  | { type: 'name'; value: string; rizName: string }

// Resolves a free-text search query to a concrete destination. Returns null
// when nothing matches (e.g. an unregistered .riz name).
export async function resolveSearch(query: string): Promise<SearchResult | null> {
  const q = query.trim()
  if (!q) return null

  if (/^\d+$/.test(q)) return { type: 'block', value: parseInt(q, 10) }

  if (/^0x[0-9a-fA-F]{64}$/.test(q)) return { type: 'hash', value: q }

  // H160 address (was SS58, ss58Format 42, starting with '5') — accounts
  // are AccountId20/0x-hex now.
  if (/^0x[0-9a-fA-F]{40}$/.test(q)) return { type: 'address', value: q }

  // Otherwise, try it as a .riz name
  if (!q.includes(' ')) {
    try {
      const client = await getClient()
      const result = await lookupName(client.getApi(), q.replace(/\.riz$/i, ''))
      if (result?.account) {
        return { type: 'name', value: result.account, rizName: result.rizName }
      }
    } catch {}
  }

  return null
}
