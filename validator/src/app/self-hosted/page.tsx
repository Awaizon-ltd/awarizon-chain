import Link from 'next/link'
import SetupSteps from '../../components/validator/SetupSteps'
import { NODE_REQUIREMENTS, RECOMMENDED_PROVIDERS }
  from '../../lib/constants'

const steps = [
  {
    title: 'Download the node binary',
    code: `wget https://github.com/awarizon/awarizon-chain/releases/latest/download/awarizon-node-linux-x86_64
chmod +x awarizon-node-linux-x86_64
mv awarizon-node-linux-x86_64 awarizon-node`,
  },
  {
    title: 'Download the chain spec',
    code: `wget https://awarizon.com/public-testnet.json`,
  },
  {
    title: 'Generate your validator keys',
    code: `./awarizon-node key generate \\
  --scheme Sr25519 \\
  --output-type Json

# IMPORTANT: Save your seed phrase securely!
# Never share it with anyone.`,
  },
  {
    title: 'Start your node',
    code: `./awarizon-node \\
  --base-path ./data \\
  --chain public-testnet.json \\
  --validator \\
  --name "MyValidator" \\
  --unsafe-rpc-external \\
  --rpc-cors all \\
  --rpc-port 9944 \\
  --port 30333`,
  },
  {
    title: 'Insert your session keys',
    code: `curl -H "Content-Type: application/json" \\
  -d '{
    "id": 1,
    "jsonrpc": "2.0",
    "method": "author_insertKey",
    "params": [
      "gran",
      "YOUR_SEED_PHRASE",
      "YOUR_PUBLIC_KEY"
    ]
  }' \\
  http://localhost:9944`,
  },
]

export default function SelfHostedPage() {
  return (
    <main className="min-h-screen
      text-white py-24">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-black mb-2">
          Run your own validator
        </h1>
        <p className="text-gray-400 mb-12">
          Full ownership. 100% of rewards.
          Follow this guide to set up your node.
        </p>

        {/* Requirements */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">
            Server requirements
          </h2>
          <div className="grid grid-cols-2
            md:grid-cols-3 gap-3">
            {Object.entries(NODE_REQUIREMENTS)
              .map(([key, val]) => (
              <div key={key}
                className="bg-[#161029] border
                border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500
                  uppercase tracking-wider mb-1">
                  {key}
                </p>
                <p className="font-mono font-bold">
                  {val}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Recommended providers */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">
            Recommended hosting providers
          </h2>
          <div className="grid md:grid-cols-2
            gap-3">
            {RECOMMENDED_PROVIDERS.map(p => (
              <a key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`bg-[#161029] border
                  rounded-xl p-4 flex items-center
                  justify-between hover:border-gray-600
                  transition-colors
                  ${p.recommended
                    ? 'border-yellow-400/30'
                    : 'border-gray-800'}`}>
                <div>
                  <p className="font-bold">
                    {p.name}
                    {p.recommended && (
                      <span className="ml-2
                        text-xs text-yellow-400
                        font-normal">
                        Recommended
                      </span>
                    )}
                  </p>
                  <p className="text-sm
                    text-gray-400">
                    {p.price}
                  </p>
                </div>
                <span className="text-gray-500">
                  →
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Setup steps */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-6">
            Setup guide
          </h2>
          <SetupSteps steps={steps} />
        </section>

        {/* Register CTA */}
        <div className="bg-yellow-400/10 border
          border-yellow-400/30 rounded-2xl p-8
          text-center">
          <h2 className="text-2xl font-bold mb-2">
            Node running?
          </h2>
          <p className="text-gray-400 mb-6">
            Register your validator on chain
            and start earning rewards.
          </p>
          <Link href="/self-hosted/register">
            <button className="bg-yellow-400
              text-black font-bold py-3 px-8
              rounded-xl hover:bg-yellow-300
              transition-colors">
              Register Validator On Chain →
            </button>
          </Link>
        </div>
      </div>
    </main>
  )
}
