'use client'

import { useState } from 'react'
import { ChevronDown, Check, Copy, LogOut } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import ConnectModal from './ConnectModal'
import Button from '../ui/Button'

function truncate(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function WalletButton() {
  const { connected, address, name, walletName, disconnect } =
    useWalletStore()
  const [showModal, setShowModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!connected || !address) {
    return (
      <>
        <Button onClick={() => setShowModal(true)}>
          Connect Wallet
        </Button>
        <ConnectModal
          open={showModal}
          onClose={() => setShowModal(false)}
        />
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
        className="flex items-center gap-2
          bg-dev-surface border border-dev-border
          hover:border-yellow-400/30 rounded-xl
          px-3 py-2 transition-all"
      >
        <div className="w-6 h-6 rounded-full
          bg-yellow-400 flex items-center
          justify-center flex-shrink-0">
          <span className="text-black font-black
            text-xs">
            {(name || address).slice(0, 1)
              .toUpperCase()}
          </span>
        </div>
        <span className="text-sm font-mono
          text-white hidden sm:block">
          {name || truncate(address)}
        </span>
        {walletName === 'awarizon' && (
          <span className="text-[10px] font-mono
            text-yellow-400 bg-yellow-400/10
            px-1.5 py-0.5 rounded-md">
            Awarizon
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-[#888]" />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-12
          glass rounded-xl p-2 w-48 z-50">
          <p className="px-3 py-2 text-xs
            text-[#888] font-mono">
            {truncate(address)}
          </p>
          <hr className="border-dev-border my-1" />
          <button
            onClick={copy}
            className="w-full flex items-center gap-2
              text-left px-3 py-2
              text-sm hover:bg-dev-surface2 rounded-lg"
          >
            {copied
              ? <Check className="w-3.5 h-3.5" />
              : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Address'}
          </button>
          <button
            onClick={() => {
              disconnect()
              setShowMenu(false)
            }}
            className="w-full flex items-center gap-2
              text-left px-3 py-2
              text-sm text-red-400
              hover:bg-dev-surface2 rounded-lg"
          >
            <LogOut className="w-3.5 h-3.5" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
