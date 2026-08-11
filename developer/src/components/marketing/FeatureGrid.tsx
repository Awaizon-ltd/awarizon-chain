const FEATURES = [
  {
    title: 'App Distribution & Campaigns',
    description:
      'Deliver your app straight into every user’s Awarizon wallet ' +
      'inbox. Create a campaign, set your budget, and only pay for ' +
      'engagement that actually happened on-chain.',
  },
  {
    title: 'Reward Engine',
    description:
      'The inbox module enforces engagement thresholds — 120 ' +
      'seconds in session and 5 interactions — then settles reward ' +
      'claims in RIZ automatically. No fraud, no manual review.',
  },
  {
    title: 'On-Chain Identity',
    description:
      'Every user can register a .riz name and link EVM or Solana ' +
      'accounts, so they carry one portable identity across every ' +
      'app built on Awarizon.',
  },
  {
    title: 'Token & NFT Creation',
    description:
      'Launch a fungible asset or an NFT collection directly from ' +
      'the developer portal — mint, transfer, and manage supply ' +
      'without standing up separate tooling.',
  },
  {
    title: 'Developer Staking & Verification',
    description:
      'Stake RIZ to cross the verification threshold and unlock ' +
      'campaign creation and app registration — the same stake ' +
      'that secures the network backs your reputation.',
  },
  {
    title: 'Real-Time Analytics',
    description:
      'Every campaign and engagement event flows through the ' +
      'Awarizon indexer, queryable straight from your dashboard — ' +
      'no log pipeline to build yourself.',
  },
]

export default function FeatureGrid() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
          Everything a developer needs
        </h2>
        <p className="mt-4 text-[#999] leading-relaxed">
          One SDK, one dashboard, and a chain that settles engagement
          and rewards without a backend of your own.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {FEATURES.map((feature, i) => (
          <div
            key={feature.title}
            className={`feature-card feature-card-${i % 6}
              glass rounded-2xl p-8 hover:border-yellow-400/25
              transition-colors`}
          >
            <h3 className="text-lg font-bold mb-2">
              {feature.title}
            </h3>
            <p className="text-sm text-[#aaa] leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
