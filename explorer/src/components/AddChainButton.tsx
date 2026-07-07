import { useState } from 'react'
import { Wallet, Check, X, Copy, Loader2 } from 'lucide-react'
import { useAddChain } from '../hooks/useAddChain'

interface AddChainButtonProps {
  /** 'banner' = sits on the dark header image; 'card' = sits on a themed bg-awz-surface card. */
  variant?: 'banner' | 'card'
  /** Hide the inline RPC-copy icon, e.g. when the parent already shows the RPC endpoint. */
  showCopyRpc?: boolean
}

export function AddChainButton({ variant = 'card', showCopyRpc = true }: AddChainButtonProps) {
  const { addChain, copyRpc, isPending, isSuccess, isError, error } = useAddChain()
  const [rpcCopied, setRpcCopied] = useState(false)

  async function handleCopyRpc() {
    await copyRpc()
    setRpcCopied(true)
    setTimeout(() => setRpcCopied(false), 2000)
  }

  const secondaryCls = variant === 'banner'
    ? 'bg-white/10 border border-white/20 text-white/70 hover:text-white hover:border-awz-gold/50'
    : 'bg-awz-bg border border-awz-border text-awz-muted hover:text-awz-gold hover:border-awz-gold/50'

  const tooltipCls = variant === 'banner'
    ? 'bg-black/90 border border-white/15 text-awz-red'
    : 'bg-awz-surface border border-awz-red/30 text-awz-red'

  return (
    <div className="relative flex items-center gap-2">
      <button
        onClick={addChain}
        disabled={isPending}
        title="Add Awarizon Testnet to your wallet"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
          isSuccess
            ? 'bg-green-500/15 text-green-400 border border-green-500/30'
            : isError
            ? 'bg-awz-red/15 text-awz-red border border-awz-red/30'
            : 'bg-awz-gold text-black hover:bg-awz-gold-dim'
        }`}
      >
        {isPending && <Loader2 size={13} className="animate-spin" />}
        {isSuccess && <Check size={13} />}
        {isError && <X size={13} />}
        {!isPending && !isSuccess && !isError && <Wallet size={13} />}
        {isSuccess ? 'Added' : isError ? 'Failed' : isPending ? 'Adding…' : 'Add to Wallet'}
      </button>

      {showCopyRpc && (
        <button
          onClick={handleCopyRpc}
          title="Copy RPC endpoint"
          className={`flex items-center px-2.5 py-1.5 rounded-lg font-mono text-[11px] transition-all ${secondaryCls}`}
        >
          {rpcCopied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      )}

      {isError && error && (
        <div className={`absolute top-full mt-2 right-0 z-50 rounded-lg p-3 text-xs font-mono max-w-xs shadow-xl ${tooltipCls}`}>
          {error}
          <div className="mt-2 text-awz-muted">
            Try:{' '}
            <a href="https://talisman.xyz" target="_blank" rel="noopener noreferrer" className="text-awz-gold hover:underline">
              Talisman
            </a>
            {' or '}
            <a href="https://subwallet.app" target="_blank" rel="noopener noreferrer" className="text-awz-gold hover:underline">
              SubWallet
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
