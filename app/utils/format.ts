export function truncateAddress(address: string, start = 8, end = 4): string {
  if (!address) return ''
  if (address.length <= start + end) return address
  return `${address.slice(0, start)}...${address.slice(-end)}`
}

export function truncateHash(hash: string): string {
  if (!hash) return ''
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`
}

export function formatIdentity(rizName: string | null, address: string): string {
  if (rizName) return rizName
  return truncateAddress(address)
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function categoryColor(category: string): string {
  const map: Record<string, string> = {
    Gaming: '#9B59B6',
    DeFi: '#3498DB',
    Social: '#E74C3C',
    Productivity: '#2ECC71',
    Education: '#F39C12',
    DeveloperTools: '#1ABC9C',
    DigitalAssets: '#E67E22',
    Infrastructure: '#95A5A6',
  }
  return map[category] ?? '#666666'
}
