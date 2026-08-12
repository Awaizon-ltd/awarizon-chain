import Link from 'next/link'
import LeaderboardPreview from '../components/validator/LeaderboardPreview'
import NetworkBackground from '../components/NetworkBackground'
import NetworkSnapshot from '../components/validator/NetworkSnapshot'
import RegionDistribution from '../components/validator/RegionDistribution'
import NetworkStatGrid from '../components/validator/NetworkStatGrid'
import PerformanceSummary from '../components/validator/PerformanceSummary'
import EcosystemGrid from '../components/EcosystemGrid'
import { MIN_STAKE, MANAGED_SLOTS_TOTAL } from '../lib/constants'

export default function HomePage() {
  return (
    <main className="min-h-screen text-white">

      {/* Hero */}
      <section className="relative overflow-hidden">
        <NetworkBackground />
        <div className="relative z-10 max-w-6xl mx-auto px-6
          pt-24 pb-16 text-center">
        <div className="inline-block bg-yellow-400/10
          border border-yellow-400/20 rounded-full
          px-4 py-1.5 text-yellow-400 text-sm
          font-medium mb-6">
          Awarizon Testnet — Validator Program
        </div>

        <h1 className="text-5xl md:text-6xl
          font-black mb-6 leading-tight">
          Secure the network.
          <br />
          <span className="text-yellow-400 underline
            decoration-yellow-400/40 decoration-4
            underline-offset-8">
            Earn RIZ rewards.
          </span>
        </h1>

        <p className="text-xl text-gray-400
          max-w-2xl mx-auto mb-4">
          Run a validator node on the Awarizon
          blockchain. Choose managed (we handle
          everything) or self-hosted (full control).
        </p>

        {/* Stats bar */}
        <div className="flex justify-center gap-8
          mt-8 mb-16 text-sm">
          <div>
            <span className="text-yellow-400
              font-bold text-2xl">{MANAGED_SLOTS_TOTAL}</span>
            <span className="text-gray-500 ml-1">
              managed slots
            </span>
          </div>
          <div className="w-px bg-gray-800" />
          <div>
            <span className="text-yellow-400
              font-bold text-2xl">~18%</span>
            <span className="text-gray-500 ml-1">
              APY
            </span>
          </div>
          <div className="w-px bg-gray-800" />
          <div>
            <span className="text-yellow-400
              font-bold text-2xl">{(MIN_STAKE / 1000).toFixed(0)}K</span>
            <span className="text-gray-500 ml-1">
              RIZ min stake
            </span>
          </div>
        </div>

        {/* Two path cards */}
        <div className="grid md:grid-cols-2
          gap-6 max-w-4xl mx-auto">

          {/* Managed */}
          <div className="bg-[#161029] border
            border-yellow-400/30 rounded-2xl p-8
            text-left hover:border-yellow-400/60
            transition-colors">
            <div className="w-12 h-12 bg-yellow-400/10
              rounded-xl flex items-center
              justify-center mb-6">
              <span className="text-2xl">🏢</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">
              Managed Node
            </h2>
            <p className="text-gray-400 mb-6">
              We run everything. You just collect
              your epoch rewards.
            </p>
            <ul className="space-y-2 mb-8
              text-sm text-gray-300">
              {[
                'No RIZ required',
                'No server setup',
                'We handle operations 24/7',
                'Rewards sent to your wallet',
                'Yearly subscription',
              ].map(item => (
                <li key={item}
                  className="flex items-center gap-2">
                  <span className="text-yellow-400">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/managed/apply">
              <button className="w-full bg-yellow-400
                text-black font-bold py-3 px-6
                rounded-xl hover:bg-yellow-300
                transition-colors">
                Apply For A Slot
              </button>
            </Link>
          </div>

          {/* Self-hosted */}
          <div className="bg-[#161029] border
            border-gray-700 rounded-2xl p-8
            text-left hover:border-gray-500
            transition-colors">
            <div className="w-12 h-12 bg-gray-800
              rounded-xl flex items-center
              justify-center mb-6">
              <span className="text-2xl">⚙️</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">
              Self-Hosted Node
            </h2>
            <p className="text-gray-400 mb-6">
              Full control. Run your own validator
              with your own hardware and stake.
            </p>
            <ul className="space-y-2 mb-8
              text-sm text-gray-300">
              {[
                `Requires ${MIN_STAKE.toLocaleString()} RIZ stake`,
                'Requires your own server',
                'Keep 100% of rewards',
                'Set your own commission',
                'Free forever',
              ].map(item => (
                <li key={item}
                  className="flex items-center gap-2">
                  <span className="text-gray-400">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/self-hosted">
              <button className="w-full border
                border-gray-600 text-white font-bold
                py-3 px-6 rounded-xl
                hover:bg-gray-800 transition-colors">
                Setup Your Node
              </button>
            </Link>
          </div>
        </div>
        </div>
      </section>

      {/* Network snapshot — same slot a metrics site gives its live
          confirmation-time panel, directly under the hero */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-800">
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

      {/* How it works */}
      <section className="max-w-6xl mx-auto
        px-6 py-16 border-t border-gray-800">
        <h2 className="text-3xl font-bold
          text-center mb-12">
          How validators earn
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              title: 'Stake RIZ',
              desc: `Lock ${MIN_STAKE.toLocaleString()} RIZ as your ` +
                'validator bond. This stake ' +
                'is your skin in the game.',
            },
            {
              step: '02',
              title: 'Secure the network',
              desc: 'Your node produces blocks ' +
                'and finalizes transactions. ' +
                'Uptime = more rewards.',
            },
            {
              step: '03',
              title: 'Claim epoch rewards',
              desc: 'Every epoch distributes RIZ ' +
                'to validators based on ' +
                'performance score.',
            },
          ].map(item => (
            <div key={item.step}
              className="bg-[#161029] rounded-xl
              p-6 border border-gray-800">
              <div className="text-yellow-400
                font-mono text-sm mb-3">
                {item.step}
              </div>
              <h3 className="font-bold text-lg mb-2">
                {item.title}
              </h3>
              <p className="text-gray-400 text-sm">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
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
