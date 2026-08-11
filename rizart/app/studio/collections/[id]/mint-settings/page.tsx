'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useWallet } from '@/lib/walletStore'
import Field, { inputCls } from '@/components/Field'
import Button from '@/components/Button'
import { PLANCK } from '@/lib/constants'
import { datetimeToBlock, blockToDatetimeLocal } from '@/lib/blockTime'

export default function MintSettingsPage() {
  const { id } = useParams()
  const { nftSigner, api, address } = useWallet()
  const [collection, setCollection] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [maxSupply, setMaxSupply] = useState('')
  const [mintType, setMintType] = useState<'Public' | 'Issuer'>('Public')
  const [mintPrice, setMintPrice] = useState('')
  const [mintStartAt, setMintStartAt] = useState('')
  const [mintEndAt, setMintEndAt] = useState('')

  useEffect(() => {
    async function load() {
      if (!nftSigner || !api) return
      setLoading(true)
      try {
        const col = await nftSigner.collections.get(Number(id))
        setCollection(col)
        if (col) {
          setMaxSupply(col.maxSupply ? String(col.maxSupply) : '')
          const ms = col.mintSettings
          if (ms) {
            if (ms.mintType === 'Public' || ms.mintType === 'Issuer') setMintType(ms.mintType)
            if (ms.price) setMintPrice((Number(BigInt(ms.price)) / Number(PLANCK)).toString())
            if (ms.startBlock) setMintStartAt(await blockToDatetimeLocal(api, ms.startBlock))
            if (ms.endBlock) setMintEndAt(await blockToDatetimeLocal(api, ms.endBlock))
          }
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [id, nftSigner, api])

  const isOwner = address === collection?.owner

  const handleSave = async () => {
    if (!nftSigner || !api || !isOwner) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const mintStartBlock = mintStartAt ? await datetimeToBlock(api, mintStartAt) : undefined
      const mintEndBlock = mintEndAt ? await datetimeToBlock(api, mintEndAt) : undefined

      await nftSigner.collections.updateMintSettings(Number(id), {
        mintType,
        mintPrice: mintPrice ? BigInt(Math.round(Number(mintPrice) * Number(PLANCK))) : undefined,
        mintStartBlock,
        mintEndBlock,
      })

      if (maxSupply && Number(maxSupply) !== collection?.maxSupply) {
        await nftSigner.collections.setMaxSupply(Number(id), Number(maxSupply))
      }

      setSuccess('Mint settings updated on-chain.')
    } catch (err: any) {
      setError(err.message ?? 'Failed to update mint settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-8 py-10">
        <div className="h-40 skeleton rounded-2xl" />
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="max-w-2xl mx-auto px-8 py-10 text-center text-[#888]">
        Collection not found
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <p className="text-[#888] text-sm mb-1">
        <Link href="/studio" className="hover:text-white">
          My Collections
        </Link>{' '}
        /{' '}
        <Link href={`/studio/collections/${id}`} className="hover:text-white">
          {collection.name ?? `#${id}`}
        </Link>{' '}
        / Mint Settings
      </p>
      <h1 className="text-2xl font-black mb-1">Mint Settings</h1>
      <p className="text-[#888] text-sm mb-8">
        Manage pricing and the mint window — enforced on-chain by pallet-nfts.
      </p>

      {!isOwner && (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4 text-yellow-400 text-sm mb-6">
          Only the collection owner can change these settings.
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-400 mb-6">
          ✓ {success}
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 mb-6">
          {error}
        </div>
      )}

      <fieldset disabled={!isOwner} className="space-y-5 disabled:opacity-60">
        <div className="glass-panel rounded-2xl p-6 space-y-5">
          <Field label="Max Supply">
            <input
              type="number"
              min={1}
              value={maxSupply}
              onChange={e => setMaxSupply(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Mint Type">
            <div className="flex gap-2 bg-rz-s2 border border-rz-border rounded-xl p-1 w-fit">
              {(['Public', 'Issuer'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setMintType(t)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-semibold transition-all
                    ${mintType === t ? 'bg-yellow-400 text-black' : 'text-[#888] hover:text-white'}
                  `}
                >
                  {t === 'Public' ? 'Public — anyone can mint' : 'Issuer only'}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Mint Price (RIZ)" hint="Leave empty for free minting">
            <input
              type="number"
              min={0}
              step="0.0001"
              value={mintPrice}
              onChange={e => setMintPrice(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="glass-panel rounded-2xl p-6 space-y-5">
          <h2 className="font-bold text-sm">Mint Window (optional)</h2>
          <Field label="Mint Starts">
            <input
              type="datetime-local"
              value={mintStartAt}
              onChange={e => setMintStartAt(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Mint Ends">
            <input
              type="datetime-local"
              value={mintEndAt}
              onChange={e => setMintEndAt(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <Button fullWidth size="lg" loading={saving} onClick={handleSave}>
          Save Mint Settings
        </Button>
      </fieldset>
    </div>
  )
}
