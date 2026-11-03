import Link from 'next/link'
import Button from '../ui/Button'

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute -top-24 left-1/2 -translate-x-1/2
        w-[560px] h-[560px] rounded-full bg-yellow-400/10
        blur-[120px] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6
        pt-24 sm:pt-32 pb-20 sm:pb-28 text-center">
        <span className="animate-fade-in-up inline-flex items-center
          gap-2 px-3 py-1 rounded-full border border-yellow-400/30
          bg-yellow-400/5 text-yellow-400 text-xs font-semibold
          tracking-wide">
          Awarizon Developer Platform
        </span>

        <h1 className="animate-fade-in-up delay-1 mt-6 text-4xl
          sm:text-6xl font-black leading-[1.05] tracking-tight">
          Build on Awarizon.
          <br />
          <span className="text-yellow-400">Reward real engagement.</span>
        </h1>

        <p className="animate-fade-in-up delay-2 mt-6 text-base
          sm:text-lg text-[#999] max-w-2xl mx-auto leading-relaxed">
          Distribute your app straight into every user&apos;s Awarizon
          wallet inbox, reward genuine engagement in RIZ, and plug into
          on-chain identity, assets, and analytics — with an SDK built
          for a ten-minute integration.
        </p>

        <div className="animate-fade-in-up delay-3 mt-10
          flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button size="lg" fullWidth className="sm:w-auto">
              Start Building
            </Button>
          </Link>
          <Link href="/docs" className="w-full sm:w-auto">
            <Button size="lg" variant="secondary" fullWidth
              className="sm:w-auto">
              Read Documentation
            </Button>
          </Link>
        </div>

        <p className="animate-fade-in-up delay-4 mt-6 text-xs
          text-[#555]">
          npm install awarizon.js — no API key required
        </p>
      </div>
    </section>
  )
}
