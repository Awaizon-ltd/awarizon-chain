import type { Metadata } from 'next'
import DocsToc from '../../../components/marketing/DocsToc'
import CodeBlock from '../../../components/marketing/CodeBlock'
import { SITE_URL } from '../../../constants'

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'Install and integrate awarizon.js, @awarizon/app, and the Kendra ' +
    'CLI — wallets, providers, React hooks, the engagement SDK, and ' +
    'the ink! smart contract toolchain.',
}

const MODULES: [string, string, string][] = [
  ['wallet', 'balance(), totalSupply()', 'send()'],
  ['inbox', 'list(), count()', 'engage(), claim(), dismiss()'],
  ['identity', 'get(), resolve(), available(), total()', 'register(), update()'],
  ['links', 'list(), evmMessage(), solanaMessage()', 'linkEvm(), linkSolana(), unlink()'],
  ['developer', 'status()', 'register(), stake()'],
  ['apps', 'list()', 'register()'],
  ['campaigns', 'get(), stats(), activeCount()', 'create(), terminate(), deliver()'],
  ['assets', 'balance(), metadata()', 'create(), mint(), transfer(), burn()'],
  ['nfts', 'ownerOf()', 'createCollection(), mint(), transfer(), burn()'],
  ['validators', 'list(), count(), performance()', 'register(), delegate(), undelegate(), updatePerformance()'],
  ['network', 'stats(), block(), subscribe()', '—'],
  ['history', 'indexer-backed tx / campaign / DEX history — works pre-connect()', '—'],
  ['dex', 'quotes, pools, TWAP', 'swapExactIn(), addLiquidity(), createPool()'],
]

const APP_CONFIG: [string, string, string][] = [
  ['rpc', 'string', "wss://rpc.awarizon.com — chain RPC endpoint"],
  ['showToasts', 'boolean', 'true — show built-in toast notifications'],
  ['paramPrefix', 'string', "'riz' — URL param prefix, e.g. ?riz_address=..."],
  ['context', 'Partial<AwarizonContext>', 'Manual context override, for testing'],
  ['onUserDetected', '(user: AwarizonUser) => void', 'Fires once the inbox context is detected'],
  ['onRewardClaimed', '(result: RewardResult) => void', 'Fires after a successful reward claim'],
  ['onError', '(error: Error) => void', 'Fires on any SDK-level failure'],
]

const APP_METHODS: [string, string][] = [
  ['init()', 'Detects campaign context and connects the wallet. Call once on app load.'],
  ['getUser()', 'Returns the detected AwarizonUser, or null if not opened from the inbox.'],
  ['isFromInbox()', 'Whether this session came from an Awarizon inbox delivery.'],
  ['triggerReward(options?)', 'Manually claims the reward after genuine engagement.'],
  ['autoRewardAfter(options?)', 'Claims automatically once time + interaction thresholds are met.'],
  ['trackEvent(event)', "Records a named event, e.g. app.trackEvent('level_complete')."],
  ['rewardAfterEvents(event, count)', 'Triggers a reward once an event has fired `count` times.'],
  ['getSessionTime()', 'Seconds elapsed in the current session.'],
  ['getInteractionCount()', 'Interactions tracked so far.'],
  ['isEngagementEligible()', 'Whether session time + interactions already clear the chain minimum.'],
  ['generateDeepLink(baseUrl)', 'Builds a deep link to include as your campaign manifest app_url.'],
  ['destroy()', 'Clears timers/listeners and disconnects the signer. Call on unmount.'],
]

const KENDRA_COMMANDS: [string, string][] = [
  ['kendra init [name]', 'Scaffold a new contract project — sample ink! contract, deploy script, and test file.'],
  ['kendra compile [contract]', 'Compile ink! contracts to Wasm. Installs Rust + cargo-contract automatically if needed. Outputs to artifacts/ and generates types in typechain/.'],
  ['kendra deploy [--network] [--contract]', 'Deploy compiled contracts to local, testnet, or mainnet. Saves addresses to deployments/<network>.json.'],
  ['kendra node', 'Start a local Awarizon dev node (--dev mode, RPC at ws://127.0.0.1:9944).'],
  ['kendra accounts [list|generate]', 'List dev accounts (//Alice, //Bob, ...) or generate a new random one.'],
  ['kendra call <contract> <method> [args]', 'Call a deployed contract method — coming in a future release.'],
]

const KENDRA_NETWORKS: [string, string][] = [
  ['local', 'ws://127.0.0.1:9944'],
  ['testnet', 'wss://testnet.awarizon.com'],
  ['mainnet', 'wss://rpc.awarizon.com'],
]

export default function DocsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <div className="mb-14">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
          Documentation
        </h1>
        <p className="mt-3 text-[#999] max-w-2xl">
          Everything you need to integrate Awarizon — from a cold
          install to a live reward claim.
        </p>
      </div>

      <div className="flex gap-12">
        <DocsToc />

        <div className="min-w-0 flex-1 space-y-20">

          <section id="introduction" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Introduction</h2>
            <p className="text-[#aaa] leading-relaxed">
              Three tools cover the whole surface. <code className="text-yellow-400">awarizon.js</code>{' '}
              is the general-purpose chain SDK — wallets, providers,
              signers, and every on-chain module (identity, assets,
              NFTs, DEX, campaigns, and more). <code className="text-yellow-400">@awarizon/app</code>{' '}
              is a thin, purpose-built layer on top of it for one job:
              detecting a user who arrived from an Awarizon wallet
              inbox and claiming their engagement reward — three lines
              of code, no key management. <code className="text-yellow-400">@awarizon/kendra</code>{' '}
              is a separate CLI toolchain for a different job entirely —
              writing, compiling, and deploying <code>ink!</code> smart
              contracts to Awarizon.
            </p>
          </section>

          <section id="installation" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Installation</h2>
            <p className="text-[#aaa] leading-relaxed mb-2">
              Install whichever SDK matches what you&apos;re building.
              <code className="text-yellow-400"> awarizon.js</code>{' '}
              re-exports <code className="text-yellow-400">@awarizon/sdk</code>{' '}
              in full, so you never need to install that separately.
            </p>
            <CodeBlock label="npm" code={
`npm install awarizon.js

# Only if you're building a reward-earning app,
# not a full chain integration:
npm install @awarizon/app`
            } />
          </section>

          <section id="quick-start" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Quick Start</h2>
            <p className="text-[#aaa] leading-relaxed mb-2">
              The core API is a <code className="text-yellow-400">Wallet</code> /{' '}
              <code className="text-yellow-400">Provider</code> /{' '}
              <code className="text-yellow-400">Signer</code> model,
              deliberately shaped like ethers.js.
            </p>
            <CodeBlock label="quickstart.ts" code={
`import { Wallet, Provider } from 'awarizon.js'

// Create a new wallet — mnemonic, address, and publicKey are
// always plain, readable properties.
const wallet = await Wallet.createRandom()
console.log(wallet.mnemonic, wallet.address)

// Read-only access to the chain — no wallet required.
const provider = await Provider.connect('wss://rpc.awarizon.com')
const balance = await provider.wallet.balance(wallet.address)
console.log(balance.free) // '0.0000 RIZ'

// Connect a wallet to the chain for read + write access.
const signer = await wallet.connect('wss://rpc.awarizon.com')
await signer.wallet.send('harry.riz', '10 RIZ')

await provider.disconnect()
await signer.disconnect()`
            } />
          </section>

          <section id="wallet" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Wallet</h2>
            <p className="text-[#aaa] leading-relaxed mb-2">
              Key material only — a <code className="text-yellow-400">Wallet</code> never
              touches the network.
            </p>
            <CodeBlock code={
`Wallet.createRandom(wordCount?: 12 | 24)       // new random wallet
Wallet.fromMnemonic(phrase)                    // restore from seed phrase
wallet.encrypt(password, onProgress?)          // -> encrypted JSON string
Wallet.fromEncryptedJson(json, password, onProgress?)
wallet.connect(endpoint?)                      // -> Signer`
            } />
            <p className="text-[#aaa] leading-relaxed mt-3">
              <code className="text-yellow-400">wallet.mnemonic</code>,{' '}
              <code className="text-yellow-400">wallet.address</code>, and{' '}
              <code className="text-yellow-400">wallet.publicKey</code> are
              always accessible, plain readonly properties.{' '}
              <code className="text-yellow-400">fromEncryptedJson</code> cannot
              recover the original mnemonic — <code>mnemonic</code> will
              be <code>&apos;&apos;</code>, matching ethers.js behavior.
            </p>
          </section>

          <section id="provider-signer" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Provider &amp; Signer</h2>
            <p className="text-[#aaa] leading-relaxed mb-2">
              <code className="text-yellow-400">Provider.connect(endpoint?)</code> gives
              read-only chain access. <code className="text-yellow-400">wallet.connect(endpoint?)</code> gives
              a <code className="text-yellow-400">Signer</code> — everything a{' '}
              <code className="text-yellow-400">Provider</code> has, plus write
              access signed by the wallet&apos;s keypair. Both expose the
              same modules:
            </p>

            <div className="overflow-x-auto rounded-xl border
              border-dev-border mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dev-border
                    text-left text-[#666] text-xs uppercase
                    tracking-wider">
                    <th className="px-4 py-3 font-semibold">Module</th>
                    <th className="px-4 py-3 font-semibold">Read</th>
                    <th className="px-4 py-3 font-semibold">Write (Signer only)</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map(([mod, read, write]) => (
                    <tr key={mod} className="border-b border-dev-border
                      last:border-0">
                      <td className="px-4 py-3 font-mono text-yellow-400
                        whitespace-nowrap">{mod}</td>
                      <td className="px-4 py-3 text-[#aaa]">{read}</td>
                      <td className="px-4 py-3 text-[#aaa]">{write}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[#aaa] leading-relaxed mt-4">
              Read methods work on both <code className="text-yellow-400">Provider</code> and{' '}
              <code className="text-yellow-400">Signer</code>. Write methods
              throw an <code className="text-yellow-400">AwarizonError</code> with
              code <code>NOT_SIGNED</code> if called on a plain{' '}
              <code className="text-yellow-400">Provider</code>.
            </p>
            <p className="text-[#aaa] leading-relaxed mt-3">
              Addresses accept either an SS58 address or a registered{' '}
              <code className="text-yellow-400">.riz</code> name (e.g.{' '}
              <code>signer.wallet.send(&apos;harry.riz&apos;, &apos;10 RIZ&apos;)</code>).
              Amounts accept a <code>string</code>, <code>number</code>, or{' '}
              <code>bigint</code>, with or without a{' '}
              <code>RIZ</code> suffix, and are always returned as
              formatted strings (<code>&apos;10.0000 RIZ&apos;</code>).
            </p>
          </section>

          <section id="react-hooks" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">React Hooks</h2>
            <p className="text-[#aaa] leading-relaxed mb-2">
              <code className="text-yellow-400">awarizon.js/react</code> exports
              a provider and a single hook that exposes every module,
              switching automatically between read-only and signed
              access depending on whether a wallet is connected.
            </p>
            <CodeBlock label="App.tsx" code={
`import { AwarizonProvider, useAwarizon } from 'awarizon.js/react'

function App() {
  return (
    <AwarizonProvider endpoint="wss://rpc.awarizon.com">
      <Balance />
    </AwarizonProvider>
  )
}

function Balance() {
  const {
    connected, connecting, error, address, signed,
    connectWallet, disconnectWallet,
    wallet, inbox, identity, links, developer,
    apps, campaigns, assets, nfts, validators,
    network, history, dex,
  } = useAwarizon()

  // wallet is read-only until connectWallet(walletInstance) is called
  ...
}`
            } />
            <p className="text-[#aaa] leading-relaxed mt-3">
              <code className="text-yellow-400">awarizon.js/native</code> re-exports
              the same <code>AwarizonProvider</code> / <code>useAwarizon</code> for
              React Native — neither touches a DOM API. Under Expo,{' '}
              <code>@polkadot/util-crypto</code> needs a native{' '}
              <code>crypto.getRandomValues</code> source — use{' '}
              <code>expo-crypto</code>, or{' '}
              <code>react-native-get-random-values</code> in a bare or
              dev-client build.
            </p>
          </section>

          <section id="app-sdk" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">@awarizon/app</h2>
            <p className="text-[#aaa] leading-relaxed mb-2">
              Zero-friction engagement SDK. Add a few lines of code —
              your users earn RIZ.
            </p>
            <CodeBlock label="quickstart.ts" code={
`import { AwarizonApp } from '@awarizon/app'

const app = new AwarizonApp()

// Initialize once when your app loads
const user = await app.init()
if (user) {
  console.log('User from Awarizon:', user.address)
}

// Option 1 — auto reward after 2 minutes
app.autoRewardAfter()

// Option 2 — reward after a specific event
app.rewardAfterEvents('level_complete', 1)
function onLevelComplete() {
  app.trackEvent('level_complete')
}

// Option 3 — manual trigger
async function onUserFinishedReading() {
  await app.triggerReward()
}`
            } />

            <h3 className="text-lg font-bold mt-8 mb-3">How it works</h3>
            <ol className="list-decimal list-inside space-y-2
              text-[#aaa] leading-relaxed marker:text-yellow-400">
              <li>You create a campaign on developer.awarizon.com.</li>
              <li>Users receive your app in their Awarizon wallet inbox.</li>
              <li>The user opens the app — the SDK detects the campaign context automatically.</li>
              <li>The user engages with the app normally.</li>
              <li>Once the engagement threshold is met, the SDK calls <code>submit_engagement</code> + <code>claim_reward</code> automatically.</li>
              <li>The user sees a &quot;You earned 1.5000 RIZ!&quot; toast.</li>
            </ol>

            <h3 className="text-lg font-bold mt-8 mb-3">Engagement thresholds</h3>
            <p className="text-[#aaa] leading-relaxed">
              The chain requires a minimum of <strong className="text-white">120 seconds</strong> in
              session and <strong className="text-white">5 interactions</strong>. The
              SDK tracks both automatically — the options accepted by{' '}
              <code className="text-yellow-400">triggerReward()</code> exist for
              API symmetry, but the on-chain call always submits the
              chain&apos;s own minimum thresholds; there&apos;s nothing to
              override there.
            </p>

            <h3 className="text-lg font-bold mt-8 mb-3">Works with any app</h3>
            <p className="text-[#aaa] leading-relaxed">
              React web, Vue / Angular, React Native (via WebView),
              Flutter (via WebView), games (Phaser, PixiJS, Unity
              WebGL) — or any website. No API key required; the
              campaign ID is the authentication, and the chain enforces
              every rule.
            </p>
          </section>

          <section id="app-sdk-config" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">App Config</h2>
            <p className="text-[#aaa] leading-relaxed mb-2">
              Passed as <code className="text-yellow-400">new AwarizonApp(config)</code>.
              Every field is optional.
            </p>
            <div className="overflow-x-auto rounded-xl border
              border-dev-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dev-border
                    text-left text-[#666] text-xs uppercase
                    tracking-wider">
                    <th className="px-4 py-3 font-semibold">Option</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {APP_CONFIG.map(([opt, type, desc]) => (
                    <tr key={opt} className="border-b border-dev-border
                      last:border-0">
                      <td className="px-4 py-3 font-mono text-yellow-400
                        whitespace-nowrap">{opt}</td>
                      <td className="px-4 py-3 text-[#888] whitespace-nowrap
                        font-mono text-xs">{type}</td>
                      <td className="px-4 py-3 text-[#aaa]">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="app-sdk-methods" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">App Methods</h2>
            <div className="overflow-x-auto rounded-xl border
              border-dev-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dev-border
                    text-left text-[#666] text-xs uppercase
                    tracking-wider">
                    <th className="px-4 py-3 font-semibold">Method</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {APP_METHODS.map(([method, desc]) => (
                    <tr key={method} className="border-b border-dev-border
                      last:border-0">
                      <td className="px-4 py-3 font-mono text-yellow-400
                        whitespace-nowrap">{method}</td>
                      <td className="px-4 py-3 text-[#aaa]">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="errors" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Error Handling</h2>
            <p className="text-[#aaa] leading-relaxed mb-2">
              Every failure — chain rejection, bad input, missing
              wallet — throws an <code className="text-yellow-400">AwarizonError</code> with
              a stable <code>.code</code>.
            </p>
            <CodeBlock code={
`import { AwarizonError } from 'awarizon.js'

try {
  await provider.wallet.send(to, amount)
} catch (e) {
  if (e instanceof AwarizonError && e.code === 'NOT_SIGNED') {
    // provider has no wallet attached — connect one first
  }
}`
            } />
          </section>

          <section id="kendra" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Kendra CLI</h2>
            <p className="text-[#aaa] leading-relaxed mb-2">
              <code className="text-yellow-400">@awarizon/kendra</code> is
              the Hardhat of Awarizon — build, deploy, and test{' '}
              <code className="text-yellow-400">ink!</code> smart
              contracts without touching Rust directly. Rust and{' '}
              <code>cargo-contract</code> are installed automatically on
              first compile; you only need Node.js to get started.
            </p>
            <CodeBlock label="install" code={
`npm install -g @awarizon/kendra

# or without installing globally:
npx kendra init my_contract`
            } />
            <CodeBlock label="quick start (5 minutes)" code={
`npx kendra init my_contract
cd my_contract
npm install

# In one terminal:
kendra node

# In another terminal:
kendra compile
kendra deploy`
            } />
          </section>

          <section id="kendra-commands" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Kendra Commands</h2>
            <div className="overflow-x-auto rounded-xl border
              border-dev-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dev-border
                    text-left text-[#666] text-xs uppercase
                    tracking-wider">
                    <th className="px-4 py-3 font-semibold">Command</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {KENDRA_COMMANDS.map(([cmd, desc]) => (
                    <tr key={cmd} className="border-b border-dev-border
                      last:border-0">
                      <td className="px-4 py-3 font-mono text-yellow-400
                        whitespace-nowrap">{cmd}</td>
                      <td className="px-4 py-3 text-[#aaa]">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-bold mt-8 mb-3">Networks</h3>
            <div className="overflow-x-auto rounded-xl border
              border-dev-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dev-border
                    text-left text-[#666] text-xs uppercase
                    tracking-wider">
                    <th className="px-4 py-3 font-semibold">Network</th>
                    <th className="px-4 py-3 font-semibold">Endpoint</th>
                  </tr>
                </thead>
                <tbody>
                  {KENDRA_NETWORKS.map(([net, endpoint]) => (
                    <tr key={net} className="border-b border-dev-border
                      last:border-0">
                      <td className="px-4 py-3 font-mono text-yellow-400
                        whitespace-nowrap">{net}</td>
                      <td className="px-4 py-3 text-[#aaa] font-mono
                        text-xs">{endpoint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="kendra-config" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Kendra Config &amp; API</h2>
            <p className="text-[#aaa] leading-relaxed mb-2">
              Every project has a <code className="text-yellow-400">kendra.config.ts</code>{' '}
              defining networks, contracts, and compiler options.
            </p>
            <CodeBlock label="kendra.config.ts" code={
`import { defineConfig } from '@awarizon/kendra'
import * as dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  networks: {
    local: {
      endpoint: 'ws://127.0.0.1:9944',
      accounts: ['//Alice'],
    },
    testnet: {
      endpoint: 'wss://testnet.awarizon.com',
      accounts: [process.env.DEPLOYER_MNEMONIC ?? ''],
    },
    mainnet: {
      endpoint: 'wss://rpc.awarizon.com',
      accounts: [process.env.DEPLOYER_MNEMONIC ?? ''],
    },
  },
  contracts: {
    MyToken: 'contracts/my_token',
  },
  compiler: {
    optimization: true,
  },
  typechain: {
    outDir: 'typechain',
  },
  defaultNetwork: 'local',
})`
            } />

            <p className="text-[#aaa] leading-relaxed mt-6 mb-2">
              Use <code className="text-yellow-400">kendra</code> directly
              from deploy scripts or tests instead of the CLI:
            </p>
            <CodeBlock label="scripts/deploy.ts" code={
`import { kendra } from '@awarizon/kendra'

const [alice] = await kendra.getAccounts()

const result = await kendra.deploy('MyContract', [42], {
  signer: alice,
  network: 'local',
})

console.log('Deployed to:', result.address)`
            } />

            <p className="text-[#aaa] leading-relaxed mt-6">
              After compiling, Kendra generates TypeScript types for every
              contract in <code className="text-yellow-400">typechain/</code> —
              typed query and transaction methods, so calling a contract
              from a script or test is fully type-checked without writing
              the bindings by hand.
            </p>
          </section>

          <section id="token-list" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Token List</h2>
            <p className="text-[#aaa] leading-relaxed mb-2">
              A single canonical JSON feed of every asset created via{' '}
              <code className="text-yellow-400">pallet-assets</code> —
              symbol, name, decimals, and logo — so wallets, DEXes, and
              explorers don&apos;t each invent their own lookup. Same idea
              as{' '}
              <a
                href="https://github.com/solana-labs/token-list"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-400 hover:text-yellow-300"
              >
                Solana&apos;s token-list
              </a>{' '}
              project.
            </p>
            <p className="text-[#aaa] leading-relaxed mb-2">
              Open to every origin (<code>Access-Control-Allow-Origin: *</code>) —
              fetch it directly from a browser, no proxy needed:
            </p>
            <CodeBlock label="GET" code={
              `${SITE_URL}/api/assetlist.json`
            } />
            <CodeBlock label="response shape" code={
`{
  "name": "Awarizon Token List",
  "logoURI": "${SITE_URL}/logo.png",
  "keywords": ["awarizon", "riz", "pallet-assets"],
  "timestamp": "2026-07-17T06:42:12.841Z",
  "tokens": [
    {
      "chainId": 1,
      "address": "2",
      "symbol": "CORE",
      "name": "Core",
      "decimals": 12,
      "logoURI": "https://...",
      "tags": [],
      "extensions": { "website": "...", "description": "..." }
    }
  ]
}`
            } />
            <p className="text-[#aaa] leading-relaxed mt-3">
              <code className="text-yellow-400">address</code> is the{' '}
              <code>pallet-assets</code> asset ID, stringified for
              shape-compatibility with the EVM/SPL mint-address
              convention — Awarizon assets have no contract address of
              their own.
            </p>
          </section>

          <section id="related-packages" className="scroll-mt-24">
            <h2 className="text-2xl font-bold mb-4">Related Packages</h2>
            <ul className="space-y-3 text-[#aaa] leading-relaxed">
              <li>
                <code className="text-yellow-400">@awarizon/sdk</code> —
                the low-level chain SDK. Wrapped in full by{' '}
                <code className="text-yellow-400">awarizon.js</code>, so
                you only need to install <code>awarizon.js</code> unless
                you specifically want the unwrapped primitives.
              </li>
              <li>
                <code className="text-yellow-400">@awarizon/nft</code> —
                a focused SDK for creating collections and minting NFTs
                on Awarizon, for teams that don&apos;t need the full{' '}
                <code>awarizon.js</code> surface.
              </li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  )
}
