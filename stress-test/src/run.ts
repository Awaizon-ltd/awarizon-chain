import { ApiPromise, WsProvider } from '@polkadot/api'
import { awarizonTypes, awarizonRpc } from '@awarizon/sdk'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { CONFIG } from './config'
import { loadWallets, saveWallets } from './wallets'
import { runScenario } from './runner'
import { ChainMonitor } from './monitor'
import {
  saveResult,
  printScenarioResult,
  generateMarkdownReport,
} from './report'
import { buildTransferTx } from './scenarios/transfers'
import { buildNamedTransferTx } from './scenarios/named'
import { buildIdentityTx } from './scenarios/identity'
import { buildMixedTx } from './scenarios/mixed'
import type { ScenarioResult, TestWallet } from './types'
import fs from 'fs/promises'

async function getNodeInfo(): Promise<{
  endpoint: string
  version: string
  chain: string
}> {
  const provider = new WsProvider(CONFIG.endpoint)
  const api = await ApiPromise.create({
    provider,
    types: awarizonTypes,
    rpc: awarizonRpc,
  })
  const [chain, version] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.version(),
  ])
  await api.disconnect()
  return {
    endpoint: CONFIG.endpoint,
    version: version.toString(),
    chain: chain.toString(),
  }
}

const command = process.argv[2] ?? 'transfers'
const txCount = parseInt(process.argv[3] ?? '10000')

await cryptoWaitReady()

console.log('\nAWARIZON STRESS TEST SUITE')
console.log(`   Node: ${CONFIG.endpoint}`)
console.log(`   Command: ${command}`)
console.log(`   TX count: ${txCount.toLocaleString()}\n`)

const wallets: TestWallet[] = await loadWallets()
if (wallets.length === 0) {
  console.error('No wallets found.')
  console.error('Run first:')
  console.error('  npm run wallet:generate -- 1000')
  console.error('  npm run wallet:fund -- 1000')
  process.exit(1)
}

const funded = wallets.filter(w => w.funded)
console.log(`Loaded ${wallets.length.toLocaleString()} wallets `
  + `(${funded.length.toLocaleString()} funded)\n`)

const nodeInfo = await getNodeInfo()
console.log(`Chain: ${nodeInfo.chain}`)
console.log(`Version: ${nodeInfo.version}\n`)

const monitor = new ChainMonitor()
await monitor.start()

const results: ScenarioResult[] = []

if (command === 'transfers') {
  const result = await runScenario({
    scenario: 'native-transfers',
    wallets,
    txCount,
    buildTx: buildTransferTx,
  })
  printScenarioResult(result)
  console.log(`\nResult saved: ${await saveResult(result)}`)
  results.push(result)

} else if (command === 'named') {
  const result = await runScenario({
    scenario: 'named-transfers',
    wallets,
    txCount,
    buildTx: buildNamedTransferTx,
  })
  printScenarioResult(result)
  console.log(`\nResult saved: ${await saveResult(result)}`)
  results.push(result)

} else if (command === 'identity') {
  const result = await runScenario({
    scenario: 'identity-ops',
    wallets,
    txCount,
    buildTx: buildIdentityTx,
  })
  printScenarioResult(result)
  console.log(`\nResult saved: ${await saveResult(result)}`)
  results.push(result)

} else if (command === 'mixed') {
  const result = await runScenario({
    scenario: 'mixed-workload',
    wallets,
    txCount,
    buildTx: buildMixedTx,
  })
  printScenarioResult(result)
  console.log(`\nResult saved: ${await saveResult(result)}`)
  results.push(result)

} else if (command === 'progressive') {
  console.log('PROGRESSIVE LOAD TEST')
  console.log('Levels:', CONFIG.progressiveLevels
    .map(n => n.toLocaleString()).join(' → '))
  console.log('')

  for (const level of CONFIG.progressiveLevels) {
    if (funded.length < 10) {
      console.log(
        `Skipping ${level.toLocaleString()} — not enough funded wallets`
      )
      continue
    }

    const result = await runScenario({
      scenario: `progressive-${level}`,
      wallets,
      txCount: level,
      buildTx: buildTransferTx,
    })
    printScenarioResult(result)
    await saveResult(result)
    results.push(result)

    console.log('\nWaiting 6 seconds before next level...\n')
    await new Promise(r => setTimeout(r, 6000))
  }

} else if (command === 'benchmark') {
  const benchmarkLevels = [10_000, 100_000, 1_000_000]

  for (const level of benchmarkLevels) {
    if (funded.length < 10) break

    for (const [name, builder] of [
      ['native-transfers', buildTransferTx],
      ['mixed-workload', buildMixedTx],
    ] as const) {
      const result = await runScenario({
        scenario: `${name}-${level}`,
        wallets,
        txCount: Math.min(level, funded.length * 10),
        buildTx: builder as any,
      })
      printScenarioResult(result)
      await saveResult(result)
      results.push(result)

      await new Promise(r => setTimeout(r, 3000))
    }
  }
} else {
  console.error(`Unknown command: ${command}`)
  console.error('Expected one of: transfers, named, identity, mixed, progressive, benchmark')
  process.exit(1)
}

await monitor.stop()
const monitorSummary = monitor.summary()

if (monitorSummary) {
  console.log('\nCHAIN MONITOR SUMMARY')
  console.log(`  Blocks observed: ${monitorSummary.blocksObserved}`)
  console.log(`  Total extrinsics: ${monitorSummary.totalExtrinsics.toLocaleString()}`)
  console.log(`  Avg tx/block: ${monitorSummary.avgExtrinsicsPerBlock}`)
  console.log(`  Max tx/block: ${monitorSummary.maxExtrinsicsPerBlock}`)
}

// Scenarios (identity, mixed) may have assigned .riz names to wallets —
// persist so later "named" runs can resolve them.
await saveWallets(wallets)

if (results.length > 1) {
  const md = await generateMarkdownReport(results, nodeInfo)
  const reportPath = `${CONFIG.resultsDir}/benchmark-${Date.now()}.md`
  await fs.mkdir(CONFIG.resultsDir, { recursive: true })
  await fs.writeFile(reportPath, md)
  console.log(`\nBenchmark report: ${reportPath}`)
  console.log('\n' + md)
}

console.log('\nDone.')
process.exit(0)
