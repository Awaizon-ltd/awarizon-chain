export const RPC_ENDPOINT =
  'wss://rpc.awarizon.com'
export const INDEXER_ENDPOINT =
  'https://index.awarizon.com'
// Solana-token-list-style aggregation of every token's logo/website,
// served by the developer portal (developer/src/app/api/assetlist.json).
export const ASSETLIST_URL =
  import.meta.env.VITE_ASSETLIST_URL ??
  'https://developer.awarizon.com/api/assetlist.json'
export const CHAIN_NAME = 'Awarizon Testnet'
export const TOKEN_SYMBOL = 'RIZ'
export const TOKEN_DECIMALS = 12
export const GENESIS_HASH =
  '0xaa202ce58be21cbb1959cdd28c52248203a47fd1fe53a74ad5139f5318101ca5'

// RIZ in planck
export const PLANCK = 1_000_000_000_000n
export const ONE_RIZ = PLANCK

// Slippage presets in basis points
export const SLIPPAGE_PRESETS = [
  { label: '0.1%', bps: 10 },
  { label: '0.5%', bps: 50 },
  { label: '1%', bps: 100 },
]
export const DEFAULT_SLIPPAGE_BPS = 50

// Deadline in blocks (~5 minutes at 3s/block)
export const DEFAULT_DEADLINE_BLOCKS = 100

// Colors
export const COLORS = {
  primary:    '#8B5CF6', // purple-500
  primaryDark:'#7C3AED', // purple-600
  primaryGlow:'rgba(139,92,246,0.3)',
  accent:     '#A78BFA', // purple-400
  bg:         '#0D0D0F',
  surface:    '#13131A',
  surface2:   '#1A1A27',
  border:     '#2D2D3D',
  borderLight:'#3D3D55',
  text:       '#FFFFFF',
  textSecondary: '#9999BB',
  textTertiary:  '#555577',
  green:      '#10B981',
  red:        '#EF4444',
  yellow:     '#F59E0B',
}
