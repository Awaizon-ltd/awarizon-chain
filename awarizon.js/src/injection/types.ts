// Standard Polkadot injected wallet interface — compatible with
// @polkadot/extension-inject, so any dApp already wired up for
// Talisman/SubWallet/Polkadot.js can pick up Awarizon for free.

export interface InjectedAccount {
  address: string
  name?: string
  type?: string
  genesisHash?: string | null
}

export interface InjectedAccounts {
  get: () => Promise<InjectedAccount[]>
  subscribe: (cb: (accounts: InjectedAccount[]) => void) => () => void
}

export interface SignerResult {
  id: number
  signature: string
}

export interface SignRawParams {
  address: string
  data: string
  type: 'bytes' | 'payload'
}

export interface SignPayloadParams {
  address: string
  blockHash: string
  blockNumber: string
  era: string
  genesisHash: string
  method: string
  nonce: string
  signedExtensions: string[]
  specVersion: string
  tip: string
  transactionVersion: string
  version: number
}

export interface InjectedSigner {
  signRaw?: (raw: SignRawParams) => Promise<SignerResult>
  signPayload?: (payload: SignPayloadParams) => Promise<SignerResult>
}

export interface InjectedExtension {
  accounts: InjectedAccounts
  signer: InjectedSigner
  name: string
  version: string
}

// Awarizon-specific extensions, beyond the standard Polkadot interface.
export interface AwarizonInboxContext {
  // Campaign that delivered the current app.
  campaignId: string
  // Delivery record ID for this session.
  recordId: string
}

export interface AwarizonIdentity {
  // .riz name if registered.
  rizName: string | null
}

export interface AwarizonExtensions {
  // Returns null if the app wasn't opened from an inbox delivery.
  getInboxContext: () => AwarizonInboxContext | null
  getIdentity: () => AwarizonIdentity
}

export interface AwarizonInjectedExtension extends InjectedExtension {
  awarizon: AwarizonExtensions
}

// Config the wallet passes in when injecting itself into a page.
export interface AwarizonProviderConfig {
  // SS58 address of the connected account.
  address: string
  rizName?: string
  inboxContext?: AwarizonInboxContext
  genesisHash: string
  // Signing callbacks — implemented by the wallet itself.
  signRaw: (data: string) => Promise<string>
  signPayload: (payload: SignPayloadParams) => Promise<string>
  // Whether the wallet should show an approval UI before enabling.
  // Enforced by the wallet's own `enable()` implementation, not here.
  approvalRequired?: boolean
}

// The shape every injected wallet registers under window.injectedWeb3,
// per the standard Polkadot extension-inject convention.
export interface InjectedWeb3 {
  [walletName: string]: {
    version: string
    enable: (appName: string) => Promise<AwarizonInjectedExtension>
  }
}

declare global {
  interface Window {
    injectedWeb3?: InjectedWeb3
  }
}
