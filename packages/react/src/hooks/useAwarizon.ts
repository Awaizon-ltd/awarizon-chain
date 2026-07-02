import { useAwarizonContext } from '../context/AwarizonContext'

export function useAwarizon() {
  const ctx = useAwarizonContext()

  return {
    // Connection
    connected: ctx.connected,
    connecting: ctx.connecting,
    connectionError: ctx.connectionError,

    // Wallet state
    address: ctx.address,
    hasStoredWallet: ctx.hasStoredWallet,
    walletLocked: ctx.walletLocked,
    isReady: ctx.connected && !ctx.walletLocked,

    // Wallet actions
    createWallet: ctx.createWallet,
    importWallet: ctx.importWallet,
    unlockWallet: ctx.unlockWallet,
    lockWallet: ctx.lockWallet,
    deleteWallet: ctx.deleteWallet,
    exportWallet: ctx.exportWallet,
  }
}
