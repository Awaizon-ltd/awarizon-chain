'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Copy, LogOut, X } from 'lucide-react'
import { useWallet } from '../../hooks/useWallet'
import Button from '../ui/Button'

function truncate(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
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

function ConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { connectAwarizon, connectExtension, connecting, error } = useWallet()
  const [awarizonAvailable, setAwarizonAvailable] = useState(false)

  useEffect(() => {
    if (!open) return
    import('awarizon.js').then(({ isAwarizonAvailable }) => {
      setAwarizonAvailable(isAwarizonAvailable())
    })
  }, [open])

  if (!open) return null

  const handleAwarizon = async () => {
    await connectAwarizon()
    if (!useWallet.getState().error) onClose()
  }

  const handleExtension = async () => {
    await connectExtension()
    if (!useWallet.getState().error) onClose()
  }

  // Portaled to <body> so it centers on the viewport rather than the
  // Header's own backdrop-blur containing block.
  return createPortal((
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative bg-[#161029] border border-gray-800
          rounded-2xl w-full max-w-sm p-6 z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-lg">Connect Wallet</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleExtension}
            disabled={connecting}
            className="w-full flex items-center gap-4 p-4 rounded-xl
              border border-gray-800 hover:border-yellow-400
              hover:bg-gray-900 transition-colors disabled:opacity-40"
          >
            <div className="w-10 h-10 rounded-xl bg-[#E6007A]
              flex items-center justify-center flex-shrink-0">
              <GridIcon />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">Browser Extension</p>
              <p className="text-gray-500 text-xs">Talisman, SubWallet, Polkadot.js</p>
            </div>
          </button>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Awarizon Wallet</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${awarizonAvailable ? 'bg-green-400' : 'bg-gray-700'}`} />
                <span className={awarizonAvailable ? 'text-green-400' : 'text-gray-600'}>
                  {awarizonAvailable ? 'Detected' : 'Not detected'}
                </span>
              </div>
            </div>
            <button
              onClick={handleAwarizon}
              disabled={!awarizonAvailable || connecting}
              className="w-full flex items-center justify-center gap-3 p-3
                rounded-xl border transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed
                border-yellow-400/30 hover:border-yellow-400/60
                hover:bg-yellow-400/5 text-sm font-semibold"
            >
              {connecting
                ? 'Connecting...'
                : awarizonAvailable
                  ? 'Connect Awarizon Wallet'
                  : 'Open from Awarizon Wallet'}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center mt-3">{error}</p>
        )}
      </div>
    </div>
  ), document.body)
}

export default function WalletConnect() {
  const { connected, address, name, walletName, disconnect } = useWallet()
  const [showModal, setShowModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!connected || !address) {
    return (
      <>
        <Button onClick={() => setShowModal(true)}>Connect Wallet</Button>
        <ConnectModal open={showModal} onClose={() => setShowModal(false)} />
      </>
    )
  }

  const copy = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 bg-[#161029] border border-gray-800
          hover:border-yellow-400/30 rounded-xl px-3 py-2 transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-yellow-400
          flex items-center justify-center flex-shrink-0">
          <span className="text-black font-black text-xs">
            {(name || address).slice(0, 1).toUpperCase()}
          </span>
        </div>
        <span className="text-sm font-mono text-white hidden sm:block">
          {name || truncate(address)}
        </span>
        {walletName === 'awarizon' && (
          <span className="text-[10px] font-mono text-yellow-400
            bg-yellow-400/10 px-1.5 py-0.5 rounded-md">
            Awarizon
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-12 bg-[#161029] border
          border-gray-800 rounded-xl p-2 w-48 z-50">
          <p className="px-3 py-2 text-xs text-gray-500 font-mono">
            {truncate(address)}
          </p>
          <hr className="border-gray-800 my-1" />
          <button
            onClick={copy}
            className="w-full flex items-center gap-2 text-left px-3 py-2
              text-sm hover:bg-gray-900 rounded-lg"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Address'}
          </button>
          <button
            onClick={() => { disconnect(); setShowMenu(false) }}
            className="w-full flex items-center gap-2 text-left px-3 py-2
              text-sm text-red-400 hover:bg-gray-900 rounded-lg"
          >
            <LogOut className="w-3.5 h-3.5" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
