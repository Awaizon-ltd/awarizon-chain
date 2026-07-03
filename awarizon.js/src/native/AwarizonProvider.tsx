import React, { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { createClient } from '../client'
import { AwarizonClientContext } from '../react/context'
import { createNativeStorage } from './storage'
import type { Awarizon } from '../core/Awarizon'
import type { WalletConfig } from '../adapters/resolve'

export interface NativeAwarizonProviderProps {
  children: ReactNode
  endpoint?: string
  network?: string
  wallet?: string | WalletConfig
  autoConnect?: boolean
}

// Native storage is initialized once globally for this provider
const nativeStorage = createNativeStorage()
void nativeStorage // used by future wallet persistence hooks

export function AwarizonProvider({
  children,
  endpoint,
  network,
  wallet,
  autoConnect = false,
}: NativeAwarizonProviderProps) {
  const [instance, setInstance] = useState<Awarizon | null>(null)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(true)
  const [address, setAddress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const instanceRef = useRef<Awarizon | null>(null)

  const connect = useCallback(
    async (walletConfig?: string | WalletConfig) => {
      setConnecting(true)
      setError(null)
      try {
        if (instanceRef.current) {
          await instanceRef.current.connect(walletConfig)
          setAddress(instanceRef.current.address)
          setConnected(instanceRef.current.hasWallet)
        } else {
          const client = await createClient({ endpoint, network, wallet: walletConfig })
          instanceRef.current = client
          setInstance(client)
          setConnected(client.isConnected)
          setAddress(client.address)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed')
      } finally {
        setConnecting(false)
      }
    },
    [endpoint, network]
  )

  const disconnect = useCallback(async () => {
    await instanceRef.current?.disconnect()
    instanceRef.current = null
    setInstance(null)
    setConnected(false)
    setAddress(null)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const client = await createClient({ endpoint, network })
        if (cancelled) { client.disconnect(); return }

        instanceRef.current = client
        setInstance(client)
        setConnected(client.isConnected)

        if (autoConnect && wallet) {
          await client.connect(wallet)
          if (!cancelled) {
            setAddress(client.address)
            setConnected(client.hasWallet)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to connect to Awarizon node')
        }
      } finally {
        if (!cancelled) setConnecting(false)
      }
    }

    init()

    return () => {
      cancelled = true
      instanceRef.current?.disconnect()
      instanceRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, network])

  return (
    <AwarizonClientContext.Provider
      value={{ instance, connected, connecting, address, error, connect, disconnect }}
    >
      {children}
    </AwarizonClientContext.Provider>
  )
}
