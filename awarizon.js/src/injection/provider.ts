import type {
  AwarizonProviderConfig,
  AwarizonInjectedExtension,
  InjectedAccount,
  SignerResult,
} from './types'

const PROVIDER_NAME = 'awarizon'
const PROVIDER_VERSION = '1.0.0'

// Inject the Awarizon wallet into the current page so dApps can
// discover it via window.injectedWeb3, same as any other
// extension-inject wallet. Call this from:
//   - the mobile wallet, before a campaign WebView loads
//   - a browser extension's content script
//
// Example (mobile wallet WebView):
//   injectAwarizonProvider({
//     address: userAddress,
//     rizName: 'alice.riz',
//     inboxContext: { campaignId: '0x210...', recordId: '0xabc...' },
//     genesisHash: AWARIZON_GENESIS,
//     signRaw: async (data) => wallet.sign(data),
//     signPayload: async (p) => wallet.signPayload(p),
//   })
export function injectAwarizonProvider(
  config: AwarizonProviderConfig
): void {
  if (typeof window === 'undefined') return

  if (!window.injectedWeb3) {
    window.injectedWeb3 = {}
  }

  const account: InjectedAccount = {
    address: config.address,
    name: config.rizName ?? 'Awarizon Wallet',
    type: 'sr25519',
    genesisHash: config.genesisHash,
  }

  const subscribers = new Set<(accounts: InjectedAccount[]) => void>()

  const extension: AwarizonInjectedExtension = {
    name: PROVIDER_NAME,
    version: PROVIDER_VERSION,

    accounts: {
      get: async () => [account],
      subscribe: (cb) => {
        subscribers.add(cb)
        cb([account])
        return () => subscribers.delete(cb)
      },
    },

    signer: {
      signRaw: async ({ data }): Promise<SignerResult> => {
        const signature = await config.signRaw(data)
        return { id: 1, signature }
      },
      signPayload: async (payload): Promise<SignerResult> => {
        const signature = await config.signPayload(payload)
        return { id: 1, signature }
      },
    },

    awarizon: {
      getInboxContext: () => config.inboxContext ?? null,
      getIdentity: () => ({ rizName: config.rizName ?? null }),
    },
  }

  window.injectedWeb3[PROVIDER_NAME] = {
    version: PROVIDER_VERSION,
    // config.approvalRequired is a hint for the wallet's own native
    // UI, shown (if at all) before injectAwarizonProvider() is ever
    // called — there's no approval step left to gate here.
    enable: async (_appName: string) => extension,
  }
}

// Remove the injection — call on WebView unmount or extension unload.
export function removeAwarizonProvider(): void {
  if (typeof window === 'undefined') return
  if (window.injectedWeb3?.[PROVIDER_NAME]) {
    delete window.injectedWeb3[PROVIDER_NAME]
  }
}
