'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Film, X } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import Button from '../ui/Button'
import { APP_CATEGORIES, APP_PLATFORMS, AGE_RATINGS } from '../../constants'
import { uploadImage, uploadVideo } from '../../lib/cloudinary'
import { saveManifest } from '../../lib/manifestApi'

interface Props {
  onRegistered: (manifestHash: string) => void
}

const MAX_SCREENSHOTS = 5

// The full listing flow: media files -> Cloudinary, the rest of the
// fields -> a manifest JSON your backend stores in MongoDB, then the
// resulting fetch URL is what gets registered on-chain as
// metadata_uri. manifest_hash itself stays the uniqueness hash
// awarizon.js's AppsModule.register() already derives
// (address + metadataUri + timestamp) — the chain never reads or
// hashes the manifest content itself. Campaign copy (title/CTA/reward
// description) intentionally has no field here — see CreateCampaign.tsx.
export default function RegisterAppForm({ onRegistered }: Props) {
  const { signer, address, name: walletName } = useWalletStore()
  const iconInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const screenshotsInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const [iconFile, setIconFile] = useState<File | null>(null)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([])
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)

  const [name, setName] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(APP_CATEGORIES[0])
  const [developerName, setDeveloperName] = useState(walletName ?? '')

  const [url, setUrl] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])

  const [version, setVersion] = useState('1.0.0')
  const [tagsInput, setTagsInput] = useState('')
  const [language, setLanguage] = useState('en')
  const [ageRating, setAgeRating] = useState(AGE_RATINGS[0])

  const [step, setStep] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submitting = step !== null

  const pickIcon = (file: File | undefined) => {
    if (!file) return
    setIconFile(file)
    setIconPreview(URL.createObjectURL(file))
  }

  const pickBanner = (file: File | undefined) => {
    if (!file) return
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  const pickScreenshots = (files: FileList | null) => {
    if (!files) return
    const picked = Array.from(files).slice(
      0, MAX_SCREENSHOTS - screenshotFiles.length
    )
    setScreenshotFiles(prev => [...prev, ...picked])
    setScreenshotPreviews(prev => [
      ...prev, ...picked.map(f => URL.createObjectURL(f)),
    ])
  }

  const removeScreenshot = (i: number) => {
    setScreenshotFiles(prev => prev.filter((_, idx) => idx !== i))
    setScreenshotPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const togglePlatform = (p: string) => {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  const valid =
    iconFile && name.trim() && shortDescription.trim() &&
    description.trim() && url.trim() && platforms.length > 0 &&
    developerName.trim() && address

  const handleRegister = async () => {
    if (!signer || !address || !valid) return
    setError(null)
    try {
      setStep('Uploading media...')
      const iconUrl = await uploadImage(iconFile!)
      const bannerUrl = bannerFile ? await uploadImage(bannerFile) : undefined
      const screenshotUrls = screenshotFiles.length
        ? await Promise.all(screenshotFiles.map(uploadImage))
        : undefined
      const previewVideoUrl = videoFile ? await uploadVideo(videoFile) : undefined

      setStep('Saving listing...')
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)

      const { url: metadataUri } = await saveManifest({
        name: name.trim(),
        description: description.trim(),
        shortDescription: shortDescription.trim(),
        category,
        developer: address,
        developerName: developerName.trim(),
        media: {
          icon: iconUrl,
          banner: bannerUrl,
          screenshots: screenshotUrls,
          previewVideo: previewVideoUrl,
        },
        app: {
          url: url.trim(),
          platform: platforms,
        },
        metadata: {
          version: version.trim() || '1.0.0',
          tags,
          language,
          ageRating,
        },
      })

      setStep('Registering on-chain...')
      const res = await signer.apps.register({ category, metadataUri })

      onRegistered(res.manifestHash)
    } catch (err: any) {
      setError(err.message ?? 'Failed to register app')
    } finally {
      setStep(null)
    }
  }

  return (
    <div className="space-y-5">

      {/* Icon + name + category */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => iconInputRef.current?.click()}
          className="w-20 h-20 flex-shrink-0 rounded-2xl
            bg-dev-surface2 border border-dashed
            border-dev-border hover:border-yellow-400/50
            flex items-center justify-center overflow-hidden"
        >
          {iconPreview ? (
            <img src={iconPreview} alt="Icon preview"
              className="w-full h-full object-cover" />
          ) : (
            <ImagePlus className="w-6 h-6 text-[#555]" />
          )}
        </button>
        <input
          ref={iconInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => pickIcon(e.target.files?.[0])}
        />
        <div className="flex-1 space-y-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="App name"
            className="w-full bg-dev-surface2
              border border-dev-border rounded-xl
              px-4 py-2.5 text-sm text-white
              placeholder-[#444]
              focus:outline-none
              focus:border-yellow-400/50"
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full bg-dev-surface2
              border border-dev-border rounded-xl
              px-4 py-2.5 text-sm text-white
              focus:outline-none
              focus:border-yellow-400/50"
          >
            {APP_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Developer name */}
      <div>
        <label className="text-sm text-[#888] block mb-2">
          Developer Name
        </label>
        <input
          value={developerName}
          onChange={e => setDeveloperName(e.target.value)}
          placeholder="How you'll appear to users"
          className="w-full bg-dev-surface2
            border border-dev-border rounded-xl
            px-4 py-3 text-sm text-white
            placeholder-[#444]
            focus:outline-none
            focus:border-yellow-400/50"
        />
        <p className="text-xs text-[#555] mt-1 font-mono">
          {address ?? 'Connect a wallet to set the developer address'}
        </p>
      </div>

      {/* Short description */}
      <div>
        <label className="text-sm text-[#888] block mb-2">
          Short Description
          <span className="text-[#555] ml-1">
            (one line, shown in inbox previews)
          </span>
        </label>
        <input
          value={shortDescription}
          onChange={e => setShortDescription(e.target.value)}
          placeholder="One line for inbox preview"
          maxLength={80}
          className="w-full bg-dev-surface2
            border border-dev-border rounded-xl
            px-4 py-3 text-sm text-white
            placeholder-[#444]
            focus:outline-none
            focus:border-yellow-400/50"
        />
      </div>

      {/* Full description */}
      <div>
        <label className="text-sm text-[#888] block mb-2">
          Description
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What does your app do?"
          rows={3}
          className="w-full bg-dev-surface2
            border border-dev-border rounded-xl
            p-3 text-sm text-white
            placeholder-[#444]
            focus:outline-none
            focus:border-yellow-400/50
            resize-none"
        />
      </div>

      {/* App URL + platforms */}
      <div>
        <label className="text-sm text-[#888] block mb-2">
          App URL
        </label>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://myapp.com"
          className="w-full bg-dev-surface2
            border border-dev-border rounded-xl
            px-4 py-3 text-sm text-white
            placeholder-[#444]
            focus:outline-none
            focus:border-yellow-400/50"
        />
        <div className="flex flex-wrap gap-2 mt-3">
          {APP_PLATFORMS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => togglePlatform(p)}
              className={`
                text-xs px-3 py-1.5 rounded-lg
                border transition-all font-semibold capitalize
                ${platforms.includes(p)
                  ? 'bg-yellow-400/10 border-yellow-400/50 text-yellow-400'
                  : 'border-dev-border text-[#888] hover:text-white'
                }
              `}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Media — banner, screenshots, preview video */}
      <div>
        <label className="text-sm text-[#888] block mb-2">
          Media <span className="text-[#555]">(optional)</span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            className="aspect-video rounded-xl
              bg-dev-surface2 border border-dashed
              border-dev-border hover:border-yellow-400/50
              flex items-center justify-center overflow-hidden"
          >
            {bannerPreview ? (
              <img src={bannerPreview} alt="Banner preview"
                className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-[#555] flex flex-col items-center gap-1">
                <ImagePlus className="w-5 h-5" /> Banner
              </span>
            )}
          </button>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => pickBanner(e.target.files?.[0])}
          />

          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="aspect-video rounded-xl
              bg-dev-surface2 border border-dashed
              border-dev-border hover:border-yellow-400/50
              flex items-center justify-center overflow-hidden"
          >
            {videoFile ? (
              <span className="text-xs text-yellow-400 px-2 truncate">
                {videoFile.name}
              </span>
            ) : (
              <span className="text-xs text-[#555] flex flex-col items-center gap-1">
                <Film className="w-5 h-5" /> Preview video
              </span>
            )}
          </button>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={e => setVideoFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {screenshotPreviews.map((src, i) => (
            <div key={src} className="relative w-16 h-16 rounded-lg overflow-hidden">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeScreenshot(i)}
                className="absolute top-0.5 right-0.5 bg-black/60
                  rounded-full p-0.5"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
          {screenshotFiles.length < MAX_SCREENSHOTS && (
            <button
              type="button"
              onClick={() => screenshotsInputRef.current?.click()}
              className="w-16 h-16 rounded-lg
                bg-dev-surface2 border border-dashed
                border-dev-border hover:border-yellow-400/50
                flex items-center justify-center"
            >
              <ImagePlus className="w-4 h-4 text-[#555]" />
            </button>
          )}
          <input
            ref={screenshotsInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => pickScreenshots(e.target.files)}
          />
        </div>
      </div>

      {/* Metadata — version, tags, language, age rating */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-[#888] block mb-2">
            Version
          </label>
          <input
            value={version}
            onChange={e => setVersion(e.target.value)}
            placeholder="1.0.0"
            className="w-full bg-dev-surface2
              border border-dev-border rounded-xl
              px-4 py-2.5 text-sm text-white
              placeholder-[#444]
              focus:outline-none
              focus:border-yellow-400/50"
          />
        </div>
        <div>
          <label className="text-sm text-[#888] block mb-2">
            Language
          </label>
          <input
            value={language}
            onChange={e => setLanguage(e.target.value)}
            placeholder="en"
            className="w-full bg-dev-surface2
              border border-dev-border rounded-xl
              px-4 py-2.5 text-sm text-white
              placeholder-[#444]
              focus:outline-none
              focus:border-yellow-400/50"
          />
        </div>
        <div>
          <label className="text-sm text-[#888] block mb-2">
            Age Rating
          </label>
          <select
            value={ageRating}
            onChange={e => setAgeRating(e.target.value)}
            className="w-full bg-dev-surface2
              border border-dev-border rounded-xl
              px-4 py-2.5 text-sm text-white
              focus:outline-none
              focus:border-yellow-400/50"
          >
            {AGE_RATINGS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-[#888] block mb-2">
            Tags
          </label>
          <input
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
            placeholder="game, earn, rpg"
            className="w-full bg-dev-surface2
              border border-dev-border rounded-xl
              px-4 py-2.5 text-sm text-white
              placeholder-[#444]
              focus:outline-none
              focus:border-yellow-400/50"
          />
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <Button
        loading={submitting}
        disabled={!valid || submitting}
        onClick={handleRegister}
      >
        {step ?? 'Register App'}
      </Button>
    </div>
  )
}
