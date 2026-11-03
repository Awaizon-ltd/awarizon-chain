import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { AddChainButton } from './AddChainButton'
import { AWARIZON_CHAIN } from '../lib/chainMeta'

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const display = value.length > 20 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value

  return (
    <div className="flex items-center justify-between py-2 border-b border-awz-border/40 last:border-0">
      <span className="text-awz-muted text-[10px] uppercase tracking-widest font-mono">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-awz-text text-xs font-mono" title={value}>{display}</span>
        <button onClick={handleCopy} className="text-awz-muted/50 hover:text-awz-gold transition-colors" title="Copy">
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  )
}

// Was Talisman/SubWallet/Polkadot{.js}/Nova (Substrate extensions) —
// accounts are H160/ECDSA now, so any EVM wallet works; MetaMask is the
// one explicitly supported via the "Add to Wallet" button above.
const WALLETS = [
  { name: 'MetaMask', url: 'https://metamask.io' },
]

export function NetworkInfoCard() {
  return (
    <div className="bg-awz-surface border border-awz-border rounded-xl p-5 flex flex-col shadow-lg">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-awz-muted text-[10px] uppercase tracking-widest font-mono mb-1">Network</p>
          <h3 className="text-awz-text font-bold text-lg font-mono">{AWARIZON_CHAIN.chainName}</h3>
        </div>
        <AddChainButton variant="card" showCopyRpc={false} />
      </div>

      <div className="flex flex-col">
        <CopyField label="RPC Endpoint" value={AWARIZON_CHAIN.rpcUrl} />
        <CopyField label="Chain ID" value={String(AWARIZON_CHAIN.chainId)} />
        <CopyField label="Token" value={`${AWARIZON_CHAIN.tokenSymbol} (${AWARIZON_CHAIN.tokenDecimals} decimals)`} />
      </div>

      <div className="mt-4 pt-4 border-t border-awz-border/40">
        <p className="text-awz-muted text-[10px] uppercase tracking-widest font-mono mb-2.5">Supported Wallets</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {WALLETS.map((wallet) => (
            <a
              key={wallet.name}
              href={wallet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-awz-muted hover:text-awz-gold transition-colors underline underline-offset-2"
            >
              {wallet.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
