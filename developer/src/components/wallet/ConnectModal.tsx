'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { isAwarizonAvailable } from 'awarizon.js'
import { useWalletStore } from '../../store/walletStore'

interface Props {
  open: boolean
  onClose: () => void
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="2" fill="white" />
      <rect x="13" y="3" width="8" height="8" rx="2" fill="white" />
      <rect x="3" y="13" width="8" height="8" rx="2" fill="white" />
      <rect x="13" y="13" width="8" height="8" rx="2" fill="white" />
    </svg>
  )
}

function AwarizonWalletOption({
  onConnect,
  connecting,
}: {
  onConnect: () => void
  connecting: boolean
}) {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    setAvailable(isAwarizonAvailable())
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#888]">Awarizon Wallet</span>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${available ? 'bg-green-400' : 'bg-[#444]'}`} />
          <span className={available ? 'text-green-400' : 'text-[#444]'}>
            {available ? 'Detected' : 'Not detected'}
          </span>
        </div>
      </div>

      <button
        onClick={onConnect}
        disabled={!available || connecting}
        className="w-full flex items-center justify-center gap-3 p-3 rounded-xl border transition-all
          disabled:opacity-40 disabled:cursor-not-allowed
          border-yellow-400/30 hover:border-yellow-400/60 hover:bg-yellow-400/5
          text-sm font-semibold"
      >
        <img src="/logo.png" alt="Awarizon" className="w-6 h-6 flex-shrink-0" />
        {connecting
          ? 'Connecting...'
          : available
            ? 'Connect Awarizon Wallet'
            : 'Open from Awarizon Wallet'
        }
      </button>

      {!available && (
        <p className="text-xs text-[#444] text-center">
          Open this page from your Awarizon wallet inbox or install the extension
        </p>
      )}
    </div>
  )
}

export default function ConnectModal({
  open, onClose
}: Props) {
  const { connectAwarizon, connectExtension,
          connecting, error } = useWalletStore()

  if (!open) return null

  const handleAwarizon = async () => {
    await connectAwarizon()
    if (!useWalletStore.getState().error) onClose()
  }

  const handleExtension = async () => {
    await connectExtension()
    if (!useWalletStore.getState().error) onClose()
  }

  // Portaled to <body> — Header uses backdrop-blur, which creates a new
  // containing block for `position: fixed` descendants, so a nested
  // fixed-inset modal would center against the 64px header bar instead
  // of the viewport if rendered in place.
  return createPortal((
    <div className="fixed inset-0 z-50
      flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="absolute inset-0
        bg-black/70 backdrop-blur-sm" />

      <div
        className="relative glass rounded-2xl
          w-full max-w-sm p-6 z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center
          justify-between mb-6">
          <h2 className="font-bold text-lg">
            Connect Wallet
          </h2>
          <button onClick={onClose}
            className="text-[#888] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleExtension}
            disabled={connecting}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-dev-border
              hover:border-yellow-400 hover:bg-dev-surface2 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-[#E6007A] flex items-center justify-center flex-shrink-0">
              <GridIcon />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">Browser Extension</p>
              <p className="text-[#888] text-xs">Talisman, SubWallet, Polkadot.js</p>
            </div>
          </button>

          <AwarizonWalletOption onConnect={handleAwarizon} connecting={connecting} />
        </div>

        {error && (
          <p className="text-red-400 text-sm
            text-center mt-3">
            {error}
          </p>
        )}
      </div>
    </div>
  ), document.body)
}
