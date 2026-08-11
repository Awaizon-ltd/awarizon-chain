'use client'
import Link from 'next/link'
import { useCollectionWizard } from '@/lib/collectionWizardStore'
import Field, { inputCls } from '@/components/Field'

export default function CollectionMintSettings() {
  const wizard = useCollectionWizard()

  return (
    <div className="space-y-5">
      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <Field label="Max Supply *" hint="How many items this collection can ever contain">
          <input
            type="number"
            min={1}
            value={wizard.maxSupply}
            onChange={e => wizard.set({ maxSupply: e.target.value })}
            placeholder="e.g. 10000"
            className={inputCls}
          />
        </Field>

        <Field label="Mint Type *" hint="Who is allowed to mint items into this collection">
          <div className="flex gap-2 bg-rz-s2 border border-rz-border rounded-xl p-1 w-fit">
            {(['Public', 'Issuer'] as const).map(t => (
              <button
                key={t}
                onClick={() => wizard.set({ mintType: t })}
                className={`
                  px-4 py-2 rounded-lg text-sm font-semibold transition-all
                  ${
                    wizard.mintType === t
                      ? 'bg-yellow-400 text-black'
                      : 'text-[#888] hover:text-white'
                  }
                `}
              >
                {t === 'Public' ? 'Public — anyone can mint' : 'Issuer only'}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Mint Price (RIZ, optional)" hint="Leave empty for free minting">
          <input
            type="number"
            min={0}
            step="0.0001"
            value={wizard.mintPrice}
            onChange={e => wizard.set({ mintPrice: e.target.value })}
            placeholder="e.g. 5"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="font-bold text-sm mb-1">Mint Window (optional)</h2>
          <p className="text-xs text-[#555]">
            Restrict minting to a specific time range. Enforced on-chain — converted to block
            numbers when you deploy, based on the chain&apos;s current block. Leave blank for no
            restriction.
          </p>
        </div>

        <Field label="Mint Starts">
          <input
            type="datetime-local"
            value={wizard.mintStartAt}
            onChange={e => wizard.set({ mintStartAt: e.target.value })}
            className={inputCls}
          />
        </Field>

        <Field label="Mint Ends">
          <input
            type="datetime-local"
            value={wizard.mintEndAt}
            onChange={e => wizard.set({ mintEndAt: e.target.value })}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="flex gap-2">
        <Link
          href="/studio/collections/new"
          className="flex-1 text-center bg-rz-surface border border-rz-border hover:border-[#2A2A2A] text-white font-bold text-sm px-4 py-3 rounded-xl transition-all"
        >
          ← Back
        </Link>
        <Link
          href="/studio/collections/new/review"
          className="flex-1 text-center bg-rz-surface border border-rz-border hover:border-[#2A2A2A] text-white font-bold text-sm px-4 py-3 rounded-xl transition-all"
        >
          Next: Review →
        </Link>
      </div>
    </div>
  )
}
