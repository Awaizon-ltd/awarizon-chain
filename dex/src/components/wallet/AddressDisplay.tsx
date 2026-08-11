import { useState } from 'react'
import { useWalletStore, type WalletAccount }
  from '../../store/walletStore'
import Avatar from '../Avatar'

interface Props {
  account: WalletAccount
}

function truncate(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function AddressDisplay({
  account
}: Props) {
  const { disconnect } = useWalletStore()
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(account.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2
          bg-dex-surface border border-dex-border
          hover:border-purple-500 rounded-xl
          px-3 py-2 transition-all"
      >
        <Avatar address={account.address} size={24} />
        <span className="text-sm font-mono
          text-white hidden sm:block">
          {account.rizName
            ?? account.name
            ?? truncate(account.address)
          }
        </span>
        {account.type === 'awarizon' && (
          <span className="text-[10px] font-mono
            text-purple-400 bg-purple-500/10
            px-1.5 py-0.5 rounded-md">
            Awarizon
          </span>
        )}
        <span className="text-[#9999BB] text-xs">
          ▾
        </span>
      </button>

      {showMenu && (
        <div className="absolute right-0 top-12
          glass rounded-xl p-2 w-48 z-50">
          <button
            onClick={copy}
            className="w-full text-left px-3 py-2
              text-sm hover:bg-dex-surface2 rounded-lg
              transition-all"
          >
            {copied ? '✓ Copied!' : 'Copy Address'}
          </button>
          <button
            onClick={() => {
              disconnect()
              setShowMenu(false)
            }}
            className="w-full text-left px-3 py-2
              text-sm text-red-400
              hover:bg-dex-surface2 rounded-lg
              transition-all"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
