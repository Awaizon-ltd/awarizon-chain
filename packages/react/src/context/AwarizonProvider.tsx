import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { createCore, AwarizonKeyring } from '@awarizon/core'
import type { AwarizonCore } from '@awarizon/core'
import type { KeyringPair } from '@polkadot/keyring/types'
import { AwarizonContext } from './AwarizonContext'
import { createStorage, type StorageAdapter } from '../storage'

interface AwarizonProviderProps {
  children: ReactNode
  endpoint: string
  storage?: StorageAdapter
}

const KEY_ENCRYPTED = 'encrypted_keypair'
const KEY_ADDRESS = 'wallet_address'

export function AwarizonProvider({
  children,
  endpoint,
  storage: customStorage,
}: AwarizonProviderProps) {
  const storage = useMemo(
    () => customStorage ?? createStorage(),
    [customStorage]
  )

  const [core, setCore] = useState<AwarizonCore | null>(null)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(true)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const [address, setAddress] = useState<string | null>(null)
  const [pair, setPair] = useState<KeyringPair | null>(null)
  const [hasStoredWallet, setHasStoredWallet] = useState(false)
  const [walletLocked, setWalletLocked] = useState(true)

  const keyring = useMemo(() => new AwarizonKeyring(), [])

  // Connect to node on mount
  useEffect(() => {
    let coreInstance: AwarizonCore | null = null

    async function connect() {
      try {
        setConnecting(true)
        setConnectionError(null)
        coreInstance = await createCore({ endpoint })
        setCore(coreInstance)
        setConnected(true)
      } catch (err) {
        setConnectionError(
          err instanceof Error ? err.message : 'Failed to connect to Awarizon node'
        )
        setConnected(false)
      } finally {
        setConnecting(false)
      }
    }

    connect()
    return () => { coreInstance?.disconnect() }
  }, [endpoint])

  // Check for stored wallet on mount
  useEffect(() => {
    async function checkStoredWallet() {
      await keyring.initialize()
      const stored = await storage.load(KEY_ENCRYPTED)
      const storedAddress = await storage.load(KEY_ADDRESS)
      if (stored && storedAddress) {
        setHasStoredWallet(true)
        setAddress(storedAddress)
        setWalletLocked(true)
      }
    }
    checkStoredWallet()
  }, [storage, keyring])

  const createWallet = useCallback(
    async (password: string) => {
      await keyring.initialize()
      const wallet = keyring.generate()
      const kp = keyring.fromMnemonic(wallet.mnemonic)
      const encrypted = keyring.encrypt(kp, password)

      await storage.save(KEY_ENCRYPTED, encrypted)
      await storage.save(KEY_ADDRESS, wallet.address)

      setPair(kp)
      setAddress(wallet.address)
      setHasStoredWallet(true)
      setWalletLocked(false)

      return { mnemonic: wallet.mnemonic, address: wallet.address }
    },
    [keyring, storage]
  )

  const importWallet = useCallback(
    async (mnemonic: string, password: string) => {
      await keyring.initialize()

      if (!keyring.validate(mnemonic)) {
        throw new Error('Invalid mnemonic phrase. Check all 12 words and try again.')
      }

      const kp = keyring.fromMnemonic(mnemonic)
      const encrypted = keyring.encrypt(kp, password)

      await storage.save(KEY_ENCRYPTED, encrypted)
      await storage.save(KEY_ADDRESS, kp.address)

      setPair(kp)
      setAddress(kp.address)
      setHasStoredWallet(true)
      setWalletLocked(false)

      return { address: kp.address }
    },
    [keyring, storage]
  )

  const unlockWallet = useCallback(
    async (password: string) => {
      await keyring.initialize()
      const encrypted = await storage.load(KEY_ENCRYPTED)

      if (!encrypted) {
        throw new Error('No wallet found. Create or import a wallet first.')
      }

      const kp = keyring.decrypt(encrypted, password)
      setPair(kp)
      setAddress(kp.address)
      setWalletLocked(false)

      return { address: kp.address }
    },
    [keyring, storage]
  )

  const lockWallet = useCallback(() => {
    setPair(null)
    setWalletLocked(true)
    // Address stays set so UI can show which wallet is locked
  }, [])

  const deleteWallet = useCallback(async () => {
    await storage.remove(KEY_ENCRYPTED)
    await storage.remove(KEY_ADDRESS)
    setPair(null)
    setAddress(null)
    setHasStoredWallet(false)
    setWalletLocked(true)
  }, [storage])

  const exportWallet = useCallback(
    async (password: string) => {
      const encrypted = await storage.load(KEY_ENCRYPTED)
      if (!encrypted) throw new Error('No wallet to export.')
      // Verify password is correct by decrypting first
      keyring.decrypt(encrypted, password)
      return encrypted
    },
    [keyring, storage]
  )

  const value = useMemo(
    () => ({
      core,
      connected,
      connecting,
      connectionError,
      address,
      pair,
      hasStoredWallet,
      walletLocked,
      storage,
      createWallet,
      importWallet,
      unlockWallet,
      lockWallet,
      deleteWallet,
      exportWallet,
    }),
    [
      core, connected, connecting, connectionError,
      address, pair, hasStoredWallet, walletLocked,
      storage, createWallet, importWallet,
      unlockWallet, lockWallet, deleteWallet, exportWallet,
    ]
  )

  return (
    <AwarizonContext.Provider value={value}>
      {children}
    </AwarizonContext.Provider>
  )
}
