import Link from 'next/link'
import LeaderboardPreview from '../components/validator/LeaderboardPreview'
import NetworkBackground from '../components/NetworkBackground'
import NetworkSnapshot from '../components/validator/NetworkSnapshot'
import RegionDistribution from '../components/validator/RegionDistribution'
import NetworkStatGrid from '../components/validator/NetworkStatGrid'
import PerformanceSummary from '../components/validator/PerformanceSummary'
import EcosystemGrid from '../components/EcosystemGrid'

export default function HomePage() {
  return (
    <main className="min-h-screen text-white">

      {/* Compact banner — the pitch/onboarding content lives on
          /get-started now; this page is the live network dashboard */}
      <section className="relative overflow-hidden border-b border-gray-800">
        <NetworkBackground />
        <div className="relative z-10 max-w-6xl mx-auto px-6
          pt-24 pb-12 text-center">
          <div className="inline-block bg-yellow-400/10
            border border-yellow-400/20 rounded-full
            px-4 py-1.5 text-yellow-400 text-sm
            font-medium mb-5">
            Awarizon Testnet
          </div>
          <h1 className="text-3xl md:text-4xl
            font-black mb-3">
            Validator Network Statistics
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto mb-8">
            Live data from the Awarizon validator network —
            epochs, regions, rewards, and the validators
            securing it.
          </p>
          <Link href="/get-started">
            <button className="bg-yellow-400 text-black
              font-bold py-3 px-8 rounded-xl
              hover:bg-yellow-300 transition-colors">
              Get Started →
            </button>
          </Link>
        </div>
      </section>

      {/* Network snapshot */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <NetworkSnapshot />
      </section>

      {/* Region distribution — real per-region validator counts,
          the honest equivalent of a world map without invented pins */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <RegionDistribution />
      </section>

      {/* Network stat grid */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold mb-6">Network at a glance</h2>
        <NetworkStatGrid />
      </section>

      {/* Network health */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <PerformanceSummary />
      </section>

      {/* Ecosystem */}
      <section className="max-w-6xl mx-auto
        px-6 py-16 border-t border-gray-800">
        <EcosystemGrid />
      </section>

      {/* Leaderboard preview */}
      <section className="max-w-6xl mx-auto
        px-6 py-16 border-t border-gray-800">
        <div className="flex justify-between
          items-center mb-8">
          <h2 className="text-3xl font-bold">
            Active validators
          </h2>
          <Link href="/leaderboard"
            className="text-yellow-400 text-sm
            hover:underline">
            View all →
          </Link>
        </div>
        <LeaderboardPreview />
      </section>
    </main>
  )
}
