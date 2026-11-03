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

export async function saveTokenMetadata(
  token: TokenMetadata
): Promise<void> {
  const res = await fetch('/api/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(token),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.error ?? `Failed to save token metadata (${res.status})`)
  }
}

export async function fetchTokenList(): Promise<TokenMetadata[]> {
  try {
    const res = await fetch('/api/tokens')
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}
