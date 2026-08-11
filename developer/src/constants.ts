export const RPC_ENDPOINT = 'wss://rpc.awarizon.com'
export const INDEXER_ENDPOINT = 'https://index.awarizon.com'
export const EXPLORER_URL = 'https://rizscan.awarizon.com'
export const SITE_URL = 'https://developer.awarizon.com'
export const CHAIN_NAME = 'Awarizon Testnet'
export const PLANCK = 1_000_000_000_000n

// Unsigned upload preset — safe to expose client-side, Cloudinary
// enforces the upload rules (folder, size, format) server-side based
// on how the preset itself is configured in the dashboard.
export const CLOUDINARY_CLOUD_NAME = 'dgt6b36fq'
export const CLOUDINARY_UPLOAD_PRESET = 'awarizon'

// Minimum staked_riz before a developer's status flips Unverified ->
// Verified — required for register_manifest and create_campaign, both
// of which hard-reject with DeveloperNotVerified below this. Not
// exposed as an on-chain constant (no #[pallet::constant] on
// VerificationStakeThreshold), so this must be kept in sync by hand
// with runtime/src/configs/mod.rs.
export const MIN_DEVELOPER_STAKE_RIZ = 10_000

// App categories — must match AppCategory exactly
// (pallets/awarizon-types/src/lib.rs)
export const APP_CATEGORIES = [
  'DeFi',
  'Gaming',
  'Social',
  'Productivity',
  'Infrastructure',
  'DigitalAssets',
  'DeveloperTools',
  'Education',
]

// AppCategory::to_id() (pallets/awarizon-types/src/lib.rs) — 1-indexed,
// not 0-indexed. This is the numeric code the indexer's wallet_index
// table and /targeting/* endpoints expect for category filters.
export const CATEGORY_CODE: Record<string, number> = Object.fromEntries(
  APP_CATEGORIES.map((name, i) => [name, i + 1])
)

// App listing metadata — not chain-defined (see manifestApi.ts), just this
// portal's own convention for what an app-listing manifest can declare.
export const APP_PLATFORMS = ['ios', 'android', 'web']
export const AGE_RATINGS = ['3+', '7+', '13+', '16+', '18+']

// Region codes from geography.rs
export const REGIONS = [
  { code: 0x01, name: 'North America' },
  { code: 0x02, name: 'South America' },
  { code: 0x03, name: 'Europe' },
  { code: 0x04, name: 'Africa' },
  { code: 0x05, name: 'Middle East' },
  { code: 0x06, name: 'South Asia' },
  { code: 0x07, name: 'East Asia' },
  { code: 0x08, name: 'Southeast Asia' },
  { code: 0x09, name: 'Oceania' },
  { code: 0x0A, name: 'Central Asia' },
]
