import type {
  AwarizonContext, AwarizonAppConfig
} from './types'

const DEFAULT_RPC = 'wss://rpc.awarizon.com'

// Detect campaign context from all sources.
// Priority:
//   1. Manual override (config.context)
//   2. window.injectedWeb3['awarizon'] (wallet injection)
//   3. window.AwarizonBridge (WebView)
//   4. URL parameters (web/deep link)
//   5. null (user not from inbox)
export async function detectContext(
  config: AwarizonAppConfig
): Promise<AwarizonContext | null> {

  // 1. Manual override (testing/development)
  if (config.context?.address &&
      config.context?.campaignId &&
      config.context?.recordId) {
    return {
      address: config.context.address,
      campaignId: config.context.campaignId,
      recordId: config.context.recordId,
      rpc: config.context.rpc ??
           config.rpc ?? DEFAULT_RPC,
      rizName: config.context.rizName,
    }
  }

  // 2. Awarizon wallet injection — most secure, since signing stays
  // with the wallet instead of a bridge/URL-supplied address.
  if (typeof window !== 'undefined' && window.injectedWeb3?.['awarizon']) {
    try {
      const provider = window.injectedWeb3['awarizon']
      const ext = await provider.enable('AwarizonApp')
      const inboxCtx = ext.awarizon?.getInboxContext?.()

      if (inboxCtx?.campaignId && inboxCtx?.recordId) {
        const accounts = await ext.accounts.get()
        if (accounts.length > 0) {
          return {
            address: accounts[0].address,
            campaignId: inboxCtx.campaignId,
            recordId: inboxCtx.recordId,
            rpc: config.rpc ?? DEFAULT_RPC,
            rizName: ext.awarizon?.getIdentity?.()?.rizName ?? undefined,
          }
        }
      }
    } catch {
      // Wallet injection present but enable()/accounts.get() failed —
      // fall through to the other detection methods.
    }
  }

  // 3. WebView bridge (injected by wallet)
  if (typeof window !== 'undefined' &&
      window.AwarizonBridge) {
    const bridge = window.AwarizonBridge
    if (bridge.address &&
        bridge.campaignId &&
        bridge.recordId) {
      return {
        address: bridge.address,
        campaignId: bridge.campaignId,
        recordId: bridge.recordId,
        rpc: bridge.rpc ?? config.rpc
             ?? DEFAULT_RPC,
        rizName: bridge.rizName,
      }
    }
  }

  // 4. URL parameters (web app / deep link)
  const ctx = parseUrlContext(
    config.paramPrefix ?? 'riz'
  )
  if (ctx) {
    return {
      ...ctx,
      rpc: ctx.rpc ?? config.rpc ?? DEFAULT_RPC,
    }
  }

  // 5. Not from inbox
  return null
}

// Parse context from URL parameters. Supports both query string
// and hash params, e.g. ?riz_address=5Grw...&riz_campaign=0x...
function parseUrlContext(
  prefix: string
): AwarizonContext | null {
  if (typeof window === 'undefined') return null

  const params = new URLSearchParams(
    window.location.search
  )

  // Also try hash params (for SPA deep links)
  const hashParams = new URLSearchParams(
    window.location.hash.replace(/^#\/?/, '')
  )

  const get = (key: string): string | null =>
    params.get(`${prefix}_${key}`) ??
    hashParams.get(`${prefix}_${key}`) ??
    null

  const address = get('address')
  const campaignId = get('campaign')
  const recordId = get('record')

  if (!address || !campaignId || !recordId) {
    return null
  }

  return {
    address,
    campaignId,
    recordId,
    rpc: get('rpc') ?? DEFAULT_RPC,
    rizName: get('name') ?? undefined,
  }
}

// Generate a deep link URL for your app — put this in your
// campaign manifest as the app_url field.
export function buildDeepLink(
  baseUrl: string,
  context: AwarizonContext,
  prefix = 'riz'
): string {
  const url = new URL(baseUrl)
  url.searchParams.set(
    `${prefix}_address`, context.address
  )
  url.searchParams.set(
    `${prefix}_campaign`, context.campaignId
  )
  url.searchParams.set(
    `${prefix}_record`, context.recordId
  )
  return url.toString()
}

// ── Region detection ─────────────────────────
// Maps device locale to Awarizon region code
// geography.rs enum:
//   1=NorthAmerica 2=SouthAmerica 3=Europe
//   4=Africa 5=MiddleEast 6=SouthAsia
//   7=EastAsia 8=SoutheastAsia 9=Oceania
//   10=CentralAsia

const COUNTRY_TO_REGION: Record<string, number> = {
  // 1 — North America
  US: 1, CA: 1, MX: 1,
  // 2 — South America
  BR: 2, AR: 2, CL: 2, CO: 2, PE: 2,
  VE: 2, EC: 2, BO: 2, PY: 2, UY: 2,
  // 3 — Europe
  GB: 3, DE: 3, FR: 3, IT: 3, ES: 3,
  NL: 3, BE: 3, CH: 3, SE: 3, NO: 3,
  DK: 3, FI: 3, PL: 3, PT: 3, IE: 3,
  AT: 3, GR: 3, CZ: 3, RO: 3, HU: 3, UA: 3,
  // 4 — Africa
  NG: 4, GH: 4, KE: 4, ZA: 4, EG: 4,
  ET: 4, TZ: 4, UG: 4, DZ: 4, MA: 4,
  AO: 4, CM: 4, CI: 4, SN: 4, ZM: 4,
  ZW: 4, MZ: 4, RW: 4,
  // 5 — Middle East
  SA: 5, AE: 5, IL: 5, TR: 5, IQ: 5,
  IR: 5, QA: 5, KW: 5, OM: 5, JO: 5,
  LB: 5, SY: 5, YE: 5, BH: 5,
  // 6 — South Asia
  IN: 6, PK: 6, BD: 6, LK: 6, NP: 6,
  BT: 6, MV: 6, AF: 6,
  // 7 — East Asia
  CN: 7, JP: 7, KR: 7, TW: 7,
  HK: 7, MO: 7, MN: 7,
  // 8 — Southeast Asia
  ID: 8, PH: 8, VN: 8, TH: 8, MY: 8,
  SG: 8, MM: 8, KH: 8, LA: 8, BN: 8, TL: 8,
  // 9 — Oceania
  AU: 9, NZ: 9, PG: 9, FJ: 9,
  // 10 — Central Asia
  KZ: 10, UZ: 10, TM: 10, KG: 10, TJ: 10,
}

// Detect region code from device locale.
// Returns 1 (North America) as fallback.
export function detectRegionCode(): number {
  try {
    const locale = Intl.DateTimeFormat()
      .resolvedOptions().locale
    const match = locale.match(/-([A-Z]{2})$/i)
    const country = match?.[1]?.toUpperCase()
    return country ? (COUNTRY_TO_REGION[country] ?? 1) : 1
  } catch {
    return 1
  }
}
