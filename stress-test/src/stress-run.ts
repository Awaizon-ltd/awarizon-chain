import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import fs from 'fs/promises'

const ENDPOINT = process.env.AWARIZON_ENDPOINT ?? 'ws://127.0.0.1:9944'
const TX_COUNT = parseInt(process.argv[2] ?? '10000')
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE ?? '800')
const BATCH_DELAY = parseInt(process.env.BATCH_DELAY ?? '100')

interface Wallet {
  address: string
  mnemonic: string
  funded: boolean
}

interface TxResult {
  success: boolean
  submittedAt: number
  includedAt?: number
  finalizedAt?: number
  error?: string
}

async function main() {
  await cryptoWaitReady()

  console.log('\n🔥 AWARIZON STRESS TEST')
  console.log(`   Endpoint:   ${ENDPOINT}`)
  console.log(`   Target TXs: ${TX_COUNT.toLocaleString()}`)
  console.log(`   Batch size: ${BATCH_SIZE}`)
  console.log(`   Batch delay:${BATCH_DELAY}ms\n`)

  // Load wallets
  const data = await fs.readFile('./data/wallets.json', 'utf8')
  const wallets: Wallet[] = JSON.parse(data)
  const funded = wallets.filter(w => w.funded)

  console.log(`Loaded ${funded.length.toLocaleString()} funded wallets\n`)

  if (funded.length < 2) {
    console.error('Need at least 2 funded wallets.')
    process.exit(1)
  }

  // Connect
  const provider = new WsProvider(ENDPOINT)
  const api = await ApiPromise.create({ provider })
  await api.isReady

  const [chain, version] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.version(),
  ])
  console.log(`Chain:   ${chain}`)
  console.log(`Version: ${version}\n`)

  const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 })

  // Nonce cache
  const nonceMap = new Map<string, number>()
  async function getNonce(address: string): Promise<number> {
    if (!nonceMap.has(address)) {
      const acc = await api.query.system.account(address)
      nonceMap.set(address, (acc as any).nonce.toNumber())
    }
    const n = nonceMap.get(address)!
    nonceMap.set(address, n + 1)
    return n
  }

  const AMOUNT = 1_000_000_000n // 0.000001 RIZ — tiny amount

  // Results tracking
  const results: TxResult[] = []
  const errors: Record<string, number> = {}
  const blockTxCounts = new Map<number, number>()
  const secondBuckets = new Map<number, number>()

  let submitted = 0
  let succeeded = 0
  let failed = 0
  let peakTPS = 0
  const startTime = Date.now()

  // Build all tx jobs
  const jobs = Array.from({ length: TX_COUNT }, (_, i) => ({
    from: funded[i % funded.length],
    to: funded[(i + 1) % funded.length],
    index: i,
  }))

  console.log(`Starting ${TX_COUNT.toLocaleString()} transactions...\n`)

  // Process in batches
  for (let b = 0; b < jobs.length; b += BATCH_SIZE) {
    const batch = jobs.slice(b, b + BATCH_SIZE)
    const batchPromises = batch.map(async (job) => {
      const submittedAt = Date.now()
      const secKey = Math.floor((submittedAt - startTime) / 1000)
      const cur = (secondBuckets.get(secKey) ?? 0) + 1
      secondBuckets.set(secKey, cur)
      if (cur > peakTPS) peakTPS = cur

      const result: TxResult = { success: false, submittedAt }

      try {
        const pair = keyring.addFromMnemonic(job.from.mnemonic)
        const nonce = await getNonce(job.from.address)

        await new Promise<void>((resolve, reject) => {
          api.tx.balances
            .transferKeepAlive(job.to.address, AMOUNT)
            .signAndSend(pair, { nonce }, ({ status, dispatchError }: any) => {
              if (dispatchError) {
                const msg = dispatchError.isModule
                  ? api.registry.findMetaError(dispatchError.asModule).name
                  : dispatchError.toString()
                result.error = msg
                errors[msg] = (errors[msg] ?? 0) + 1
                failed++
                reject(new Error(msg))
                return
              }
              if (status.isInBlock) {
                result.includedAt = Date.now()
                const bn = status.asInBlock.toNumber?.() ?? 0
                blockTxCounts.set(bn, (blockTxCounts.get(bn) ?? 0) + 1)
              }
              if (status.isFinalized) {
                result.finalizedAt = Date.now()
                result.success = true
                succeeded++
                resolve()
              }
            })
            .catch((err: Error) => {
              result.error = err.message
              errors[err.message] = (errors[err.message] ?? 0) + 1
              failed++
              reject(err)
            })
        })
      } catch {
        result.success = false
      }

      submitted++
      results.push(result)
    })

    await Promise.allSettled(batchPromises)

    const elapsed = (Date.now() - startTime) / 1000
    const tps = submitted / elapsed
    const pct = ((submitted / TX_COUNT) * 100).toFixed(1)
    process.stdout.write(
      `\r  ${pct}% | submitted=${submitted.toLocaleString()} ` +
      `ok=${succeeded.toLocaleString()} ` +
      `err=${failed} ` +
      `tps=${tps.toFixed(1)} ` +
      `peak=${peakTPS}/s`
    )

    if (BATCH_DELAY > 0 && b + BATCH_SIZE < jobs.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY))
    }
  }

  const endTime = Date.now()
  const durationMs = endTime - startTime

  console.log('\n')

  // Latency percentiles
  const latencies = results
    .filter(r => r.success && r.includedAt)
    .map(r => r.includedAt! - r.submittedAt)
    .sort((a, b) => a - b)

  const p50 = latencies[Math.floor(latencies.length * 0.50)] ?? 0
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0
  const p99 = latencies[Math.floor(latencies.length * 0.99)] ?? 0

  const finalityTimes = results
    .filter(r => r.finalizedAt)
    .map(r => r.finalizedAt! - r.submittedAt)
  const avgFinality = finalityTimes.length
    ? Math.round(finalityTimes.reduce((a, b) => a + b, 0) / finalityTimes.length)
    : 0

  const avgBlockUtil = blockTxCounts.size > 0
    ? Array.from(blockTxCounts.values()).reduce((a, b) => a + b, 0)
      / blockTxCounts.size
    : 0

  // Print report
  const line = '─'.repeat(55)
  console.log(line)
  console.log('AWARIZON STRESS TEST RESULTS')
  console.log(line)
  console.log(`Chain:              ${chain}`)
  console.log(`Endpoint:           ${ENDPOINT}`)
  console.log(`Target TXs:         ${TX_COUNT.toLocaleString()}`)
  console.log(`Submitted:          ${submitted.toLocaleString()}`)
  console.log(`Succeeded:          ${succeeded.toLocaleString()} (${((succeeded/submitted)*100).toFixed(2)}%)`)
  console.log(`Failed:             ${failed.toLocaleString()} (${((failed/submitted)*100).toFixed(2)}%)`)
  console.log(`Duration:           ${(durationMs/1000).toFixed(1)}s`)
  console.log('')
  console.log('THROUGHPUT')
  console.log(`  Avg TPS:          ${Math.round((submitted/durationMs)*1000).toLocaleString()}`)
  console.log(`  Peak TPS:         ${peakTPS.toLocaleString()}`)
  console.log('')
  console.log('LATENCY (submit → in block)')
  console.log(`  P50 (median):     ${p50}ms`)
  console.log(`  P95:              ${p95}ms`)
  console.log(`  P99:              ${p99}ms`)
  console.log('')
  console.log('FINALITY (submit → finalized)')
  console.log(`  Average:          ${avgFinality}ms`)
  console.log('')
  console.log('BLOCK UTILIZATION')
  console.log(`  Blocks used:      ${blockTxCounts.size}`)
  console.log(`  Avg tx/block:     ${avgBlockUtil.toFixed(1)}`)

  if (Object.keys(errors).length > 0) {
    console.log('')
    console.log('ERRORS')
    for (const [e, c] of Object.entries(errors)) {
      console.log(`  ${e}: ${c}`)
    }
  }

  console.log(line)

  // Save JSON result
  await fs.mkdir('./results', { recursive: true })
  const resultFile = `./results/transfers-${TX_COUNT}-${Date.now()}.json`
  await fs.writeFile(resultFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    endpoint: ENDPOINT,
    chain: chain.toString(),
    version: version.toString(),
    txCount: TX_COUNT,
    submitted,
    succeeded,
    failed,
    errorRate: failed / submitted,
    durationMs,
    avgTPS: Math.round((submitted / durationMs) * 1000),
    peakTPS,
    p50LatencyMs: p50,
    p95LatencyMs: p95,
    p99LatencyMs: p99,
    avgFinalityMs: avgFinality,
    blocksUsed: blockTxCounts.size,
    avgTxPerBlock: avgBlockUtil,
    errors,
  }, null, 2))

  console.log(`\nResult saved: ${resultFile}`)

  await api.disconnect()
}

main().catch(console.error)
