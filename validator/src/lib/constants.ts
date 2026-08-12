export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_URL || 'wss://rpc.awarizon.com'
export const INDEXER_URL =
  process.env.NEXT_PUBLIC_INDEXER_URL || 'https://index.awarizon.com'
export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://rizscan.awarizon.com'

export const CHAIN_NAME = 'Awarizon Testnet'
export const SITE_URL = 'https://validator.awarizon.com'

// pallets/awarizon-consensus/src/lib.rs — MinValidatorStake / MAX_COMMISSION
export const MIN_STAKE = 100_000 // RIZ
export const MAX_COMMISSION = 20 // %
export const DEFAULT_COMMISSION = 10 // % — set on register_validator

export const MANAGED_SLOTS_TOTAL = 51
// Launch pricing — MANAGED_YEARLY_FEE_ETH is the actual charge; List
// is shown struck through next to it as the reference/bonus price.
export const MANAGED_YEARLY_FEE_ETH_LIST = 0.5
export const MANAGED_YEARLY_FEE_ETH = 0.1
export const MANAGED_YEARLY_FEE_DISCOUNT_PCT = Math.round(
  (1 - MANAGED_YEARLY_FEE_ETH / MANAGED_YEARLY_FEE_ETH_LIST) * 100
)

export const SPEC = {
  name: CHAIN_NAME,
  rpc: RPC_ENDPOINT,
  explorer: EXPLORER_URL,
  dex: 'https://dex.awarizon.com',
}

export const NODE_REQUIREMENTS = {
  cpu: '4 cores',
  ram: '16 GB',
  storage: '200 GB SSD',
  network: '500 Mbps',
  os: 'Ubuntu 22.04 LTS',
  bandwidth: '1 TB/month',
}

export const RECOMMENDED_PROVIDERS = [
  { name: 'Hetzner', url: 'https://hetzner.com',
    price: '~$15/mo', recommended: true },
  { name: 'Contabo', url: 'https://contabo.com',
    price: '~$12/mo', recommended: false },
  { name: 'DigitalOcean', url: 'https://digitalocean.com',
    price: '~$48/mo', recommended: false },
  { name: 'Vultr', url: 'https://vultr.com',
    price: '~$24/mo', recommended: false },
]

// Region codes — pallets/awarizon-types/src/geography.rs
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

// Sibling apps in the same Awarizon workspace — real, live services, not
// placeholders (see memory/project_awarizon_apps_map.md).
export const ECOSYSTEM_APPS = [
  { name: 'Explorer', url: EXPLORER_URL, desc: 'Blocks, extrinsics, accounts' },
  { name: 'DEX', url: SPEC.dex, desc: 'RIZ / token AMM swaps' },
  { name: 'Developer', url: 'https://developer.awarizon.com', desc: 'Build & distribute apps' },
  { name: 'Faucet', url: 'https://faucet.awarizon.com', desc: 'Testnet RIZ' },
  { name: 'RizArt', url: 'https://rizart.awarizon.com', desc: 'NFT marketplace' },
]

// Plain country names for the managed-apply form (just an applicant's
// country of residence — no on-chain meaning, unlike COUNTRIES below).
export const COUNTRY_NAMES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola',
  'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus',
  'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia',
  'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada',
  'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China',
  'Colombia', 'Comoros', 'Congo (DRC)', 'Congo (Republic)', 'Costa Rica',
  "Côte d'Ivoire", 'Croatia', 'Cuba', 'Cyprus', 'Czechia',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador',
  'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia',
  'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana',
  'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau',
  'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland',
  'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
  'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait',
  'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho',
  'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali',
  'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro',
  'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru',
  'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger',
  'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea',
  'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Rwanda', 'Samoa',
  'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia',
  'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia',
  'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan',
  'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden',
  'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania',
  'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago',
  'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda',
  'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay',
  'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
  'Yemen', 'Zambia', 'Zimbabwe',
]

// Country codes are a much larger ISO-3166-numeric-style table on chain;
// this portal only needs a representative subset for the registration
// form (register_validator takes a raw u8, so anything 0-255 is valid —
// operators outside this list can still type a code manually).
export const COUNTRIES = [
  { code: 1, name: 'United States' },
  { code: 2, name: 'Canada' },
  { code: 3, name: 'United Kingdom' },
  { code: 4, name: 'Germany' },
  { code: 5, name: 'France' },
  { code: 6, name: 'Nigeria' },
  { code: 7, name: 'South Africa' },
  { code: 8, name: 'India' },
  { code: 9, name: 'Singapore' },
  { code: 10, name: 'Japan' },
  { code: 11, name: 'Brazil' },
  { code: 12, name: 'Australia' },
]
