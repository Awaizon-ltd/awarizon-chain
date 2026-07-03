import React, { useState } from 'react'
import { useAwarizon } from './useAwarizon'

export interface ConnectButtonProps {
  label?: string
  connectedLabel?: string
  onError?: (error: Error) => void
  className?: string
  style?: React.CSSProperties
}

export function ConnectButton({
  label = 'Connect Wallet',
  connectedLabel,
  onError,
  className,
  style,
}: ConnectButtonProps) {
  const { connecting, connected, address, connect, disconnect } = useAwarizon()

  const [showForm, setShowForm] = useState(false)
  const [mnemonic, setMnemonic] = useState('')
  const [loading, setLoading] = useState(false)

  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    if (!mnemonic.trim()) return
    setLoading(true)
    try {
      await connect(mnemonic.trim())
      setShowForm(false)
      setMnemonic('')
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }

  if (connecting) {
    return (
      <button className={className} style={style} disabled>
        Connecting…
      </button>
    )
  }

  if (address) {
    return (
      <button className={className} style={style} onClick={() => disconnect()}>
        {connectedLabel ?? shortAddress}
      </button>
    )
  }

  if (showForm) {
    return (
      <form onSubmit={handleConnect} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
        <input
          type="password"
          placeholder="Enter mnemonic phrase…"
          value={mnemonic}
          onChange={e => setMnemonic(e.target.value)}
          autoFocus
          style={{ minWidth: 200 }}
        />
        <button type="submit" disabled={loading || !mnemonic.trim()}>
          {loading ? '…' : 'Connect'}
        </button>
        <button type="button" onClick={() => setShowForm(false)}>
          Cancel
        </button>
      </form>
    )
  }

  return (
    <button
      className={className}
      style={style}
      onClick={() => setShowForm(true)}
      disabled={!connected}
    >
      {label}
    </button>
  )
}
