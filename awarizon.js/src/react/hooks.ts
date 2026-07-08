import { useAwarizonContext } from './Provider'

export function useAwarizon() {
  const ctx = useAwarizonContext()

  // Use signer if available (has write access)
  // Fall back to provider (read-only)
  const active = ctx.signer ?? ctx.provider

  return {
    // Connection
    connected: ctx.connected,
    connecting: ctx.connecting,
    error: ctx.error,

    // Wallet state
    address: ctx.address,
    signed: ctx.signer !== null,

    // Wallet actions
    connectWallet: ctx.connectWallet,
    disconnectWallet: ctx.disconnectWallet,

    // All modules
    // Uses signer modules if wallet connected
    // Uses provider modules if read-only
    wallet:     active?.wallet     ?? null,
    inbox:      active?.inbox      ?? null,
    identity:   active?.identity   ?? null,
    links:      active?.links      ?? null,
    developer:  active?.developer  ?? null,
    apps:       active?.apps       ?? null,
    campaigns:  active?.campaigns  ?? null,
    assets:     active?.assets     ?? null,
    nfts:       active?.nfts       ?? null,
    validators: active?.validators ?? null,
    network:    active?.network    ?? null,
  }
}
