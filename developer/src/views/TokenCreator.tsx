'use client'

import { useRef, useState, useEffect } from 'react'
import { X, Coins, ImagePlus, ChevronDown, Copy, Check, ExternalLink } from 'lucide-react'
import { useWalletStore } from '../store/walletStore'
import Button from '../components/ui/Button'
import { setAssetMetadata, getNextAssetId, formatUnits } from '../lib/rawAssets'
import { listAssetsByOwner } from '../lib/indexer'
import { uploadImage } from '../lib/cloudinary'
import { saveTokenMetadata, fetchTokenList } from '../lib/tokenApi'
import { EXPLORER_URL } from '../constants'

// AssetsModule.mint/burn/transfer all parse amounts with awarizon.js's
// RIZ-scaled parseAmount (always 12 decimals), regardless of what an
// asset's own metadata.decimals says. Fixing decimals at 12 here keeps
// amounts entered in this form numerically correct — a different value
// would silently mis-scale every mint/transfer against this token.
const FIXED_DECIMALS = 12

interface DisplayToken {
  id: number
  name: string
  symbol: string
  decimals: number
  supply: string
  logoURI: string | null
}

export default function TokenCreator() {
  const { signer, address, injectedSigner } =
    useWalletStore()

  const [myTokens, setMyTokens] =
    useState<DisplayToken[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] =
    useState<string | null>(null)
  const [success, setSuccess] =
    useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    symbol: '',
    minBalance: '1',
    initialSupply: '',
    website: '',
    description: '',
  })

  const pickLogo = (file: File | undefined) => {
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const [mintForm, setMintForm] = useState({
    assetId: '',
    amount: '',
    to: '',
  })
  const [minting, setMinting] = useState(false)
  const [showTokenPicker, setShowTokenPicker] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  // pallet_assets has no EVM/ERC20 contract address — this chain
  // registers no precompile for it, confirmed against runtime/src.
  // The asset id is what actually identifies a token for every
  // transfer/mint call, so that's what's exposed here to copy.
  const copyAssetId = (id: number) => {
    navigator.clipboard.writeText(String(id))
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Reads through the indexer (assets table, kept in sync with
  // Created/MetadataSet/Issued/... events) instead of scanning
  // assets.asset.entries() on-chain — cheaper and works even while
  // the chain websocket connection is reconnecting. logoURI/website
  // only exist off-chain (Mongo), merged in by asset id.
  const refreshTokens = async () => {
    if (!address) return
    try {
      const [assets, metaList] = await Promise.all([
        listAssetsByOwner(address),
        fetchTokenList(),
      ])
      const metaMap = Object.fromEntries(
        metaList.map(m => [m.assetId, m])
      )
      setMyTokens(assets.map(a => ({
        id: a.assetId,
        name: a.name || metaMap[a.assetId]?.name || '',
        symbol: a.symbol || metaMap[a.assetId]?.symbol || '',
        decimals: a.decimals,
        supply: formatUnits(a.totalSupply, a.decimals),
        logoURI: metaMap[a.assetId]?.logoURI ?? null,
      })))
    } catch {}
  }

  useEffect(() => {
    async function load() {
      await refreshTokens()
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  const handleCreate = async () => {
    if (!signer || !address ||
        !form.name || !form.symbol || !logoFile) return
    setCreating(true)
    setError(null)

    let assetId: number
    try {
      // Fetched fresh here rather than reusing an id shown earlier —
      // minimizes the window where someone else could have claimed
      // it in the meantime.
      assetId = await getNextAssetId(signer.getApi())

      // 1. Register the asset class (pallet_assets.create) — no name,
      //    symbol, or decimals here, only admin + minimum balance.
      await signer.assets.create({
        assetId,
        admin: address,
        minBalance: form.minBalance || '1',
      })

      // 2. Set display metadata — a separate pallet_assets extrinsic
      //    awarizon.js's AssetsModule doesn't wrap, so it's signed
      //    directly against the raw ApiPromise here.
      await setAssetMetadata(
        signer.getApi(), assetId,
        form.name, form.symbol, FIXED_DECIMALS,
        { address, pair: signer.getPair(), injectedSigner },
      )

      // 3. Mint initial supply to self, if requested.
      if (form.initialSupply) {
        await signer.assets.mint(
          assetId, address, form.initialSupply
        )
      }
    } catch (err: any) {
      // Nothing landed on-chain (or it's ambiguous) — leave the form
      // open so the developer can see what they typed and retry.
      setError(err.message ?? 'Failed to create token')
      setCreating(false)
      return
    }

    // The token is live on-chain and irreversible from here — always
    // close and reset the form now, regardless of whether the
    // off-chain logo/listing save below succeeds. Previously the
    // whole thing shared one try/catch, so a Cloudinary/Mongo hiccup
    // after a successful on-chain create left the form stuck open
    // with no visible success, even though the token already existed.
    const created = {
      name: form.name,
      symbol: form.symbol,
      website: form.website.trim(),
      description: form.description.trim(),
      logoFile,
      initialSupply: form.initialSupply,
    }

    setSuccess(`Token "${created.symbol}" created! Asset ID: ${assetId}`)
    setShowCreate(false)
    setForm({
      name: '', symbol: '', minBalance: '1', initialSupply: '',
      website: '', description: '',
    })
    setLogoFile(null)
    setLogoPreview(null)
    setCreating(false)

    // Optimistic entry — the indexer needs a moment to catch up with
    // the block that just landed, so without this the list would
    // still look empty/stale until its next sync tick.
    setMyTokens(prev => [
      {
        id: assetId,
        name: created.name,
        symbol: created.symbol,
        decimals: FIXED_DECIMALS,
        supply: created.initialSupply || '0',
        logoURI: null,
      },
      ...prev,
    ])

    try {
      const logoURI = await uploadImage(created.logoFile)
      await saveTokenMetadata({
        assetId,
        name: created.name,
        symbol: created.symbol,
        decimals: FIXED_DECIMALS,
        logoURI,
        website: created.website || undefined,
        description: created.description || undefined,
        developer: address,
      })
      setMyTokens(prev => prev.map(t =>
        t.id === assetId ? { ...t, logoURI } : t
      ))
    } catch (err: any) {
      setError(
        `Token created on-chain (asset ${assetId}), but saving its ` +
        `logo failed: ${err.message ?? 'unknown error'}. The token ` +
        'still works without it.'
      )
    }

    // Reconciles the optimistic entry above with what the indexer
    // actually recorded (exact supply formatting, etc).
    refreshTokens()
  }

  const handleMint = async () => {
    if (!signer || !address || !mintForm.assetId ||
        !mintForm.amount) return
    setMinting(true)
    setError(null)
    try {
      const to = mintForm.to.trim() || address
      await signer.assets.mint(
        Number(mintForm.assetId), to, mintForm.amount
      )
      setSuccess(`Minted ${mintForm.amount} tokens`)
      setMintForm({ assetId: '', amount: '', to: '' })
      await refreshTokens()
    } catch (err: any) {
      setError(err.message ?? 'Mint failed')
    } finally {
      setMinting(false)
    }
  }

  const selectedMintToken = myTokens.find(
    t => String(t.id) === mintForm.assetId
  )

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row
        sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">
            Token Creator
          </h1>
          <p className="text-[#888] text-sm mt-1">
            Create and manage tokens on Awarizon
          </p>
          <a
            href="/api/assetlist.json"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-400 hover:text-yellow-300
              text-xs font-mono inline-block mt-1"
          >
            /api/assetlist.json ↗
          </a>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          fullWidth
          className="sm:w-auto"
        >
          + Create Token
        </Button>
      </div>

      {success && (
        <div className="bg-green-500/10 border
          border-green-500/30 rounded-xl p-4
          text-green-400 text-sm flex items-center
          justify-between">
          <span>{success}</span>
          <button
            onClick={() => setSuccess(null)}
            className="text-green-400 hover:text-green-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border
          border-red-500/30 rounded-xl p-4
          text-red-400 text-sm flex items-center
          justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showCreate && (
        <div className="glass rounded-xl p-5 space-y-4">
          <div className="flex items-center
            justify-between">
            <h2 className="font-bold">Create Token</h2>
            <button
              onClick={() => setShowCreate(false)}
              className="text-[#888] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="w-20 h-20 flex-shrink-0 rounded-2xl
                bg-dev-surface2 border border-dashed
                border-dev-border hover:border-yellow-400/50
                flex items-center justify-center overflow-hidden"
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview"
                  className="w-full h-full object-cover" />
              ) : (
                <ImagePlus className="w-6 h-6 text-[#555]" />
              )}
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => pickLogo(e.target.files?.[0])}
            />
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-sm text-[#888]">
                Token Logo
              </p>
              <p className="text-xs text-[#555] mt-1">
                Shown in wallets and the public token list
                (/api/assetlist.json)
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm text-[#888]
              block mb-2">
              Minimum Balance
            </label>
            <input
              type="number"
              value={form.minBalance}
              onChange={e =>
                setForm(p => ({
                  ...p, minBalance: e.target.value
                }))
              }
              className="w-full bg-dev-surface2
                border border-dev-border rounded-xl
                px-4 py-3 text-sm text-white
                focus:outline-none
                focus:border-yellow-400/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[#888]
                block mb-2">
                Name
              </label>
              <input
                value={form.name}
                onChange={e =>
                  setForm(p => ({
                    ...p, name: e.target.value
                  }))
                }
                placeholder="My Token"
                className="w-full bg-dev-surface2
                  border border-dev-border rounded-xl
                  px-4 py-3 text-sm text-white
                  placeholder-[#444]
                  focus:outline-none
                  focus:border-yellow-400/50"
              />
            </div>
            <div>
              <label className="text-sm text-[#888]
                block mb-2">
                Symbol
              </label>
              <input
                value={form.symbol}
                onChange={e =>
                  setForm(p => ({
                    ...p,
                    symbol: e.target.value.toUpperCase()
                  }))
                }
                placeholder="MTK"
                className="w-full bg-dev-surface2
                  border border-dev-border rounded-xl
                  px-4 py-3 text-sm text-white
                  placeholder-[#444]
                  focus:outline-none
                  focus:border-yellow-400/50"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-[#888]
              block mb-2">
              Initial Supply (optional, minted to you)
            </label>
            <input
              type="number"
              value={form.initialSupply}
              onChange={e =>
                setForm(p => ({
                  ...p, initialSupply: e.target.value
                }))
              }
              placeholder="e.g. 1000000"
              className="w-full bg-dev-surface2
                border border-dev-border rounded-xl
                px-4 py-3 text-sm text-white
                placeholder-[#444]
                focus:outline-none
                focus:border-yellow-400/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[#888]
                block mb-2">
                Website (optional)
              </label>
              <input
                value={form.website}
                onChange={e =>
                  setForm(p => ({
                    ...p, website: e.target.value
                  }))
                }
                placeholder="https://mytoken.com"
                className="w-full bg-dev-surface2
                  border border-dev-border rounded-xl
                  px-4 py-3 text-sm text-white
                  placeholder-[#444]
                  focus:outline-none
                  focus:border-yellow-400/50"
              />
            </div>
            <div>
              <label className="text-sm text-[#888]
                block mb-2">
                Description (optional)
              </label>
              <input
                value={form.description}
                onChange={e =>
                  setForm(p => ({
                    ...p, description: e.target.value
                  }))
                }
                placeholder="What is this token for?"
                className="w-full bg-dev-surface2
                  border border-dev-border rounded-xl
                  px-4 py-3 text-sm text-white
                  placeholder-[#444]
                  focus:outline-none
                  focus:border-yellow-400/50"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              fullWidth
              loading={creating}
              disabled={
                !form.name ||
                !form.symbol ||
                !logoFile ||
                creating
              }
              onClick={handleCreate}
            >
              Create Token
            </Button>
          </div>
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b
          border-dev-border">
          <h2 className="font-bold">My Tokens</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#888]">
            Loading tokens...
          </div>
        ) : myTokens.length === 0 ? (
          <div className="p-8 text-center">
            <Coins className="w-10 h-10 mx-auto mb-3 text-[#444]" />
            <p className="text-[#888] text-sm mb-4">
              No tokens created yet
            </p>
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
            >
              Create Your First Token
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-dev-border">
            {myTokens.map(token => (
              <div key={token.id}
                className="px-5 py-4 space-y-3">
                <div className="flex flex-wrap items-center
                  justify-between gap-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl
                      bg-yellow-400/10 flex items-center
                      justify-center border
                      border-yellow-400/20 flex-shrink-0
                      overflow-hidden">
                      {token.logoURI ? (
                        <img
                          src={token.logoURI}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-yellow-400
                          font-black text-sm">
                          {(token.symbol || '#')
                            .slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">
                        {token.name || `Asset #${token.id}`}
                      </p>
                      <p className="text-[#888] text-xs truncate">
                        ID: {token.id} ·
                        Symbol: {token.symbol || '—'} ·
                        Decimals: {token.decimals}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm
                      text-yellow-400">
                      {token.supply}
                    </p>
                    <p className="text-xs text-[#555]">
                      Total Supply
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyAssetId(token.id)}
                    className="flex items-center gap-1.5 text-xs
                      font-semibold px-3 py-1.5 rounded-lg
                      border border-dev-border text-[#888]
                      hover:text-white hover:border-yellow-400/30
                      transition-all"
                  >
                    {copiedId === token.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Asset ID
                      </>
                    )}
                  </button>
                  <a
                    href={`${EXPLORER_URL}/tokens/${token.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs
                      font-semibold px-3 py-1.5 rounded-lg
                      border border-dev-border text-[#888]
                      hover:text-white hover:border-yellow-400/30
                      transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View on Explorer
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {myTokens.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h2 className="font-bold mb-4">
            Mint Tokens
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <label className="text-sm text-[#888]
                block mb-2">
                Token
              </label>
              <button
                type="button"
                onClick={() => setShowTokenPicker(v => !v)}
                className="w-full flex items-center gap-2
                  bg-dev-surface2 border border-dev-border
                  rounded-xl px-4 py-3 text-sm text-white
                  hover:border-yellow-400/30"
              >
                {selectedMintToken ? (
                  <>
                    <div className="w-5 h-5 rounded-full
                      bg-yellow-400/10 flex-shrink-0
                      overflow-hidden flex items-center
                      justify-center">
                      {selectedMintToken.logoURI ? (
                        <img src={selectedMintToken.logoURI} alt=""
                          className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-yellow-400
                          text-[9px] font-black">
                          {(selectedMintToken.symbol || '#').slice(0, 1)}
                        </span>
                      )}
                    </div>
                    <span className="truncate">
                      {selectedMintToken.name || `#${selectedMintToken.id}`}
                      {' '}
                      <span className="text-[#888]">
                        ({selectedMintToken.symbol})
                      </span>
                    </span>
                  </>
                ) : (
                  <span className="text-[#555]">Select token</span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-[#888]
                  ml-auto flex-shrink-0" />
              </button>

              {showTokenPicker && (
                <div className="absolute z-20 mt-1 w-full max-h-64
                  overflow-y-auto glass rounded-xl p-1">
                  {myTokens.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setMintForm(p => ({ ...p, assetId: String(t.id) }))
                        setShowTokenPicker(false)
                      }}
                      className="w-full flex items-center gap-2
                        px-3 py-2 rounded-lg text-sm text-left
                        hover:bg-dev-surface2"
                    >
                      <div className="w-6 h-6 rounded-full
                        bg-yellow-400/10 flex-shrink-0
                        overflow-hidden flex items-center
                        justify-center">
                        {t.logoURI ? (
                          <img src={t.logoURI} alt=""
                            className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-yellow-400
                            text-[10px] font-black">
                            {(t.symbol || '#').slice(0, 1)}
                          </span>
                        )}
                      </div>
                      <span className="truncate">
                        {t.name || `Asset #${t.id}`}
                        {' '}
                        <span className="text-[#888]">({t.symbol})</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm text-[#888]
                block mb-2">
                Amount
              </label>
              <input
                type="number"
                value={mintForm.amount}
                onChange={e =>
                  setMintForm(p => ({
                    ...p, amount: e.target.value
                  }))
                }
                placeholder="e.g. 1000"
                className="w-full bg-dev-surface2
                  border border-dev-border rounded-xl
                  px-4 py-3 text-sm text-white
                  placeholder-[#444]
                  focus:outline-none
                  focus:border-yellow-400/50"
              />
            </div>
            <div>
              <label className="text-sm text-[#888]
                block mb-2">
                To Address (optional)
              </label>
              <input
                value={mintForm.to}
                onChange={e =>
                  setMintForm(p => ({
                    ...p, to: e.target.value
                  }))
                }
                placeholder="5Grw... (default: you)"
                className="w-full bg-dev-surface2
                  border border-dev-border rounded-xl
                  px-4 py-3 text-sm font-mono text-white
                  placeholder-[#444]
                  focus:outline-none
                  focus:border-yellow-400/50"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button
              loading={minting}
              disabled={
                !mintForm.assetId ||
                !mintForm.amount ||
                minting
              }
              onClick={handleMint}
            >
              Mint Tokens
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
