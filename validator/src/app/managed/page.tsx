import Link from 'next/link'
import {
  MIN_STAKE, MAX_COMMISSION, MANAGED_SLOTS_TOTAL, MANAGED_YEARLY_FEE_ETH,
  MANAGED_YEARLY_FEE_ETH_LIST, MANAGED_YEARLY_FEE_DISCOUNT_PCT,
} from '../../lib/constants'

const included = [
  {
    title: 'Node operations',
    desc: 'We run the validator binary on our own infrastructure — ' +
      'monitoring, restarts, and session-key rotation handled for you.',
  },
  {
    title: 'Uptime target',
    desc: 'Ops team watches performance score (uptime + finality + ' +
      `blocks) continuously — commission is capped at ${MAX_COMMISSION}% ` +
      'network-wide, same rules as any self-hosted validator.',
  },
  {
    title: 'Reward routing',
    desc: 'Once activated, epoch rewards flow to your own wallet via ' +
      'the on-chain reward-destination mechanism — the node key never ' +
      'controls your funds.',
  },
  {
    title: 'No RIZ required',
    desc: `Self-hosting requires ${MIN_STAKE.toLocaleString()} RIZ ` +
      'locked as bond. A managed slot uses the operator’s own stake ' +
      '— you pay the yearly fee instead.',
  },
]

export default function ManagedPage() {
  return (
    <main className="min-h-screen
      text-white py-24">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-black mb-2">
          Managed validator node
        </h1>
        <p className="text-gray-400 mb-10">
          We run the node, you collect the rewards. {MANAGED_SLOTS_TOTAL}{' '}
          slots total, one activation code per slot.
        </p>

        {/* Pricing */}
        <div className="bg-yellow-400/10 border
          border-yellow-400/30 rounded-2xl p-8 mb-12">
          <div className="flex flex-col sm:flex-row items-center
            justify-between gap-6 text-center sm:text-left">
            <div>
              <div className="flex items-center gap-2 mb-2
                justify-center sm:justify-start">
                <p className="text-sm text-gray-400">
                  Managed validator slot
                </p>
                <span className="text-xs font-bold text-black
                  bg-yellow-400 px-1.5 py-0.5 rounded-md">
                  {MANAGED_YEARLY_FEE_DISCOUNT_PCT}% OFF
                </span>
              </div>
              <div className="flex items-baseline gap-3
                justify-center sm:justify-start">
                <p className="text-4xl font-black text-yellow-400">
                  {MANAGED_YEARLY_FEE_ETH} ETH
                  <span className="text-base font-normal text-gray-400 ml-2">
                    / year
                  </span>
                </p>
                <span className="text-lg text-gray-500 line-through">
                  {MANAGED_YEARLY_FEE_ETH_LIST} ETH
                </span>
              </div>
            </div>
            <Link href="/managed/apply">
              <button className="bg-yellow-400 text-black
                font-bold py-3 px-8 rounded-xl
                hover:bg-yellow-300 transition-colors">
                Apply For A Slot
              </button>
            </Link>
          </div>
          <p className="text-xs text-gray-500 mt-6 pt-6
            border-t border-yellow-400/20 text-center sm:text-left">
            {MANAGED_YEARLY_FEE_DISCOUNT_PCT}% discount available for
            Awarizon Testnet validators only.
          </p>
        </div>

        {/* What's included */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">
            What's included
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {included.map(item => (
              <div key={item.title}
                className="bg-[#161029] border
                border-gray-800 rounded-xl p-5">
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-6">
            How it works
          </h2>
          <div className="space-y-4">
            {[
              {
                title: 'Apply',
                desc: 'Submit the application form with your wallet address.',
              },
              {
                title: 'Get reviewed',
                desc: 'We confirm slot availability and email an activation code within 24-48 hours.',
              },
              {
                title: 'Activate',
                desc: 'Connect your wallet and enter the code on the Activate page.',
              },
              {
                title: 'Earn',
                desc: 'Epoch rewards route to your wallet automatically from then on.',
              },
            ].map((step, i) => (
              <div key={step.title}
                className="bg-[#161029] border
                border-gray-800 rounded-xl p-5
                flex items-start gap-4">
                <div className="w-7 h-7 bg-yellow-400/10
                  text-yellow-400 rounded-full flex
                  items-center justify-center
                  text-sm font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-bold mb-1">{step.title}</h3>
                  <p className="text-sm text-gray-400">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Already applied CTA */}
        <div className="border border-gray-800 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">
            Already have an activation code?
          </h2>
          <p className="text-gray-400 mb-6 text-sm">
            Connect your wallet and activate your slot now.
          </p>
          <Link href="/activate">
            <button className="border border-gray-600
              text-white font-bold py-3 px-8 rounded-xl
              hover:bg-gray-800 transition-colors">
              Activate My Slot
            </button>
          </Link>
        </div>
      </div>
    </main>
  )
}
