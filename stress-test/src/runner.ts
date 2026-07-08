import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import type { KeyringPair } from '@polkadot/keyring/types'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { awarizonTypes, awarizonRpc } from '@awarizon/sdk'
import { CONFIG } from './config'
import { NonceTracker } from './nonce'
import type {
  TestWallet,
  TxResult,
  BatchResult,
  ScenarioResult,
} from './types'

// Rough block-utilization estimate. Awarizon's normal-class dispatch
// budget is ~3MB per block; at ~800 bytes/tx that's roughly 3750 tx/block.
// This is a heuristic, not derived from actual runtime weight limits.
export const ESTIMATED_MAX_TX_PER_BLOCK = 3750

export interface RunOptions {
  scenario: string
  wallets: TestWallet[]
  txCount: number
  // Called to build the extrinsic for each tx. May be async (e.g. the
  // "named" scenario resolves a .riz name over RPC before building).
  buildTx: (
    api: ApiPromise,
    from: TestWallet,
    to: TestWallet,
    index: number
  ) => any
}

export async function runScenario(
  opts: RunOptions
): Promise<ScenarioResult> {
  await cryptoWaitReady()

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`SCENARIO: ${opts.scenario}`)
  console.log(`TARGET: ${opts.txCount.toLocaleString()} transactions`)
  console.log(`ENDPOINT: ${CONFIG.endpoint}`)
  console.log(`${'═'.repeat(60)}`)

  const provider = new WsProvider(CONFIG.endpoint)
  const api = await ApiPromise.create({
    provider,
    types: awarizonTypes,
    rpc: awarizonRpc,
  })
  await api.isReady

  const keyring = new Keyring({
    type: 'sr25519',
    ss58Format: 42
  })

  // Deriving a keypair from a mnemonic is not free, and wallet count is
  // typically much smaller than tx count at scale — cache per address so
  // each wallet is only derived once regardless of how many jobs use it.
  const pairCache = new Map<string, KeyringPair>()
  function pairFor(w: TestWallet): KeyringPair {
    let pair = pairCache.get(w.address)
    if (!pair) {
      pair = keyring.addFromMnemonic(w.mnemonic)
      pairCache.set(w.address, pair)
    }
    return pair
  }

  const results: TxResult[] = []
  const batches: BatchResult[] = []
  const blockTxCounts: Map<string, number> = new Map()

  // Track TPS per second
  const secondBuckets: Map<number, number> = new Map()
  let peakTPS = 0

  const startTime = Date.now()
  let submitted = 0
  let succeeded = 0
  let failed = 0
  const errors: Record<string, number> = {}

  const nonces = new NonceTracker(api)

  const funded = opts.wallets.filter(w => w.funded)
  if (funded.length < 2) {
    throw new Error(
      `Need at least 2 funded wallets. Got ${funded.length}. ` +
      'Run: npm run wallet:fund'
    )
  }

  // Build tx list. wallet[i] sends to wallet[i+1], rotating through the
  // available funded wallets.
  const txJobs: Array<{
    from: TestWallet
    to: TestWallet
    index: number
  }> = []

  for (let i = 0; i < opts.txCount; i++) {
    txJobs.push({
      from: funded[i % funded.length],
      to: funded[(i + 1) % funded.length],
      index: i,
    })
  }

  console.log(`\nPreparing ${txJobs.length.toLocaleString()} transactions...`)
  console.log(`Batch size: ${CONFIG.batchSize}`)
  console.log(`Batch delay: ${CONFIG.batchDelay}ms`)
  console.log(`Wallets available: ${funded.length.toLocaleString()}\n`)

  for (
    let batchIdx = 0;
    batchIdx < txJobs.length;
    batchIdx += CONFIG.batchSize
  ) {
    const batch = txJobs.slice(
      batchIdx,
      batchIdx + CONFIG.batchSize
    )
    const batchStart = Date.now()
    const batchResults: TxResult[] = []

    const promises = batch.map(async (job) => {
      const fromPair = pairFor(job.from)
      const submittedAt = Date.now()

      const secondKey = Math.floor(
        (submittedAt - startTime) / 1000
      )
      secondBuckets.set(
        secondKey,
        (secondBuckets.get(secondKey) ?? 0) + 1
      )
      const currentTPS = secondBuckets.get(secondKey)!
      if (currentTPS > peakTPS) peakTPS = currentTPS

      const result: TxResult = {
        txHash: '',
        submittedAt,
        success: false,
        scenario: opts.scenario,
        from: job.from.address,
        to: job.to.address,
      }

      try {
        const nonce = await nonces.next(job.from.address)
        const tx = await opts.buildTx(
          api, job.from, job.to, job.index
        )

        await new Promise<void>((resolve, reject) => {
          tx.signAndSend(
            fromPair,
            { nonce },
            ({ status, dispatchError, txHash }: any) => {
              if (result.txHash === '') {
                result.txHash = txHash.toHex()
              }

              if (dispatchError) {
                const errStr = dispatchError.isModule
                  ? api.registry.findMetaError(
                      dispatchError.asModule
                    ).name
                  : dispatchError.toString()

                result.error = errStr
                errors[errStr] = (errors[errStr] ?? 0) + 1
                failed++
                reject(new Error(errStr))
                return
              }

              if (status.isInBlock) {
                result.includedAt = Date.now()
                const blockHash = status.asInBlock.toHex()
                result.blockHash = blockHash

                blockTxCounts.set(
                  blockHash,
                  (blockTxCounts.get(blockHash) ?? 0) + 1
                )
              }

              if (status.isFinalized) {
                result.finalizedAt = Date.now()
                result.success = true
                succeeded++
                resolve()
              }
            }
          ).catch((err: Error) => {
            result.error = err.message
            errors[err.message] = (
              errors[err.message] ?? 0) + 1
            failed++
            reject(err)
          })
        })
      } catch {
        result.success = false
      }

      submitted++
      batchResults.push(result)
      return result
    })

    await Promise.allSettled(promises)

    const batchEnd = Date.now()
    const batchDuration = batchEnd - batchStart

    const batchSucceeded = batchResults.filter(r => r.success)
    const latencies = batchSucceeded
      .filter(r => r.includedAt)
      .map(r => r.includedAt! - r.submittedAt)

    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0

    const finalityTimes = batchSucceeded
      .filter(r => r.finalizedAt)
      .map(r => r.finalizedAt! - r.submittedAt)

    const avgFinality = finalityTimes.length > 0
      ? finalityTimes.reduce((a, b) => a + b, 0)
        / finalityTimes.length
      : 0

    const batchResult: BatchResult = {
      batchIndex: Math.floor(batchIdx / CONFIG.batchSize),
      submitted: batch.length,
      succeeded: batchSucceeded.length,
      failed: batch.length - batchSucceeded.length,
      avgLatencyMs: Math.round(avgLatency),
      avgFinalityMs: Math.round(avgFinality),
      startTime: batchStart,
      endTime: batchEnd,
      tps: batch.length / (batchDuration / 1000),
    }

    batches.push(batchResult)
    results.push(...batchResults)

    const elapsed = (Date.now() - startTime) / 1000
    const overallTPS = submitted / elapsed
    const progress = (submitted / opts.txCount * 100).toFixed(1)

    process.stdout.write(
      `\r  Progress: ${progress}% | ` +
      `Submitted: ${submitted.toLocaleString()} | ` +
      `OK: ${succeeded.toLocaleString()} | ` +
      `Err: ${failed.toLocaleString()} | ` +
      `TPS: ${overallTPS.toFixed(1)} | ` +
      `Peak: ${peakTPS}/s`
    )

    if (
      CONFIG.batchDelay > 0 &&
      batchIdx + CONFIG.batchSize < txJobs.length
    ) {
      await new Promise(r => setTimeout(r, CONFIG.batchDelay))
    }
  }

  const endTime = Date.now()
  const durationMs = endTime - startTime

  console.log('\n')

  const allLatencies = results
    .filter(r => r.success && r.includedAt)
    .map(r => r.includedAt! - r.submittedAt)
    .sort((a, b) => a - b)

  const p50 = allLatencies[Math.floor(allLatencies.length * 0.50)] ?? 0
  const p95 = allLatencies[Math.floor(allLatencies.length * 0.95)] ?? 0
  const p99 = allLatencies[Math.floor(allLatencies.length * 0.99)] ?? 0

  const allFinality = results
    .filter(r => r.finalizedAt)
    .map(r => r.finalizedAt! - r.submittedAt)

  const avgFinalityMs = allFinality.length > 0
    ? Math.round(
        allFinality.reduce((a, b) => a + b, 0)
        / allFinality.length
      )
    : 0

  const avgBlockUtil = blockTxCounts.size > 0
    ? Array.from(blockTxCounts.values())
        .reduce((a, b) => a + b, 0)
      / blockTxCounts.size
      / ESTIMATED_MAX_TX_PER_BLOCK
    : 0

  await api.disconnect()

  return {
    scenario: opts.scenario,
    targetTxCount: opts.txCount,
    actualTxCount: submitted,
    succeeded,
    failed,
    errorRate: submitted > 0 ? failed / submitted : 0,
    startTime,
    endTime,
    durationMs,
    avgTPS: durationMs > 0 ? Math.round((submitted / durationMs) * 1000) : 0,
    peakTPS,
    p50LatencyMs: p50,
    p95LatencyMs: p95,
    p99LatencyMs: p99,
    avgFinalityMs,
    blocksUsed: blockTxCounts.size,
    avgBlockUtilization: avgBlockUtil,
    errors,
    batches,
  }
}
