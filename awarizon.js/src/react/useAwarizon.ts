import { useAwarizonClientContext } from './context'

export function useAwarizon() {
  const ctx = useAwarizonClientContext()

  return {
    // Full client instance — access any module directly
    awz: ctx.instance,

    // Connection state
    connected: ctx.connected,
    connecting: ctx.connecting,
    address: ctx.address,
    error: ctx.error,

    // Actions
    connect: ctx.connect,
    disconnect: ctx.disconnect,

    // Module shortcuts — null when not yet connected
    wallet:     ctx.instance?.wallet     ?? null,
    inbox:      ctx.instance?.inbox      ?? null,
    identity:   ctx.instance?.identity   ?? null,
    links:      ctx.instance?.links      ?? null,
    developer:  ctx.instance?.developer  ?? null,
    apps:       ctx.instance?.apps       ?? null,
    campaigns:  ctx.instance?.campaigns  ?? null,
    assets:     ctx.instance?.assets     ?? null,
    nfts:       ctx.instance?.nfts       ?? null,
    validators: ctx.instance?.validators ?? null,
    network:    ctx.instance?.network    ?? null,
  }
}
