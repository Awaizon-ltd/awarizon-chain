import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { Provider as ChainProvider } from '../Provider'
import { Signer } from '../Signer'
import { Wallet } from '../Wallet'
import { AwarizonError } from '../errors'

interface ContextValue {
  // The connected provider (read-only access)
  // Always available once connected
  provider: ChainProvider | null

  // The connected signer (read + write access)
  // Only available after wallet is connected
  signer: Signer | null

  // Connection state
  connected: boolean
  connecting: boolean
  error: string | null

  // Current address (if signer connected)
  address: string | null

  // Connect a wallet — takes a Wallet instance
  // Developer creates the Wallet however they want:
  //   Wallet.createRandom()
  //   Wallet.fromMnemonic(phrase)
  //   Wallet.fromEncryptedJson(json, password)
  // Then passes it here
  connectWallet: (wallet: Wallet) => Promise<void>

  // Disconnect wallet (keeps chain connection)
  disconnectWallet: () => void

  // Disconnect everything
  disconnect: () => Promise<void>
}

const Ctx = createContext<ContextValue | null>(null)

interface Props {
  children: ReactNode
  endpoint?: string
  // Optional: connect immediately with a wallet
  wallet?: Wallet
}

export function AwarizonProvider({
  children,
  endpoint,
  wallet: initialWallet,
}: Props) {
  const ep = endpoint ?? 'wss://rpc.awarizon.com'

  const [provider, setProvider] =
    useState<ChainProvider | null>(null)
  const [signer, setSigner] =
    useState<Signer | null>(null)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Connect to chain on mount (read-only)
  useEffect(() => {
    let p: ChainProvider | null = null

    async function init() {
      try {
        p = await ChainProvider.connect(ep)
        setProvider(p)
        setConnected(true)

        // If initial wallet provided, connect it
        if (initialWallet) {
          const s = await initialWallet.connect(ep)
          setSigner(s)
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to connect'
        )
      } finally {
        setConnecting(false)
      }
    }

    init()
    return () => { p?.disconnect() }
  }, [ep])

  const connectWallet = useCallback(
    async (wallet: Wallet) => {
      try {
        const s = await wallet.connect(ep)
        setSigner(s)
      } catch (err) {
        throw AwarizonError.fromChain(err)
      }
    },
    [ep]
  )

  const disconnectWallet = useCallback(() => {
    setSigner(null)
  }, [])

  const disconnect = useCallback(async () => {
    setSigner(null)
    await provider?.disconnect()
    setProvider(null)
    setConnected(false)
  }, [provider])

  const value = useMemo(() => ({
    provider,
    signer,
    connected,
    connecting,
    error,
    address: signer?.address ?? null,
    connectWallet,
    disconnectWallet,
    disconnect,
  }), [
    provider, signer, connected, connecting,
    error, connectWallet, disconnectWallet, disconnect,
  ])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAwarizonContext() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error(
    'useAwarizon must be inside <AwarizonProvider>'
  )
  return ctx
}
