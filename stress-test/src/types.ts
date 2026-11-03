export interface TestWallet {
  address: string
  mnemonic: string
  rizName?: string    // set once identity registration succeeds (e.g. "w1a2b3.riz")
  funded: boolean
  fundTxHash?: string
}

export interface TxResult {
  txHash: string
  submittedAt: number     // Date.now() when submitted
  includedAt?: number     // Date.now() when in block
  finalizedAt?: number    // Date.now() when finalized
  blockHash?: string      // block hash the tx was included in
  success: boolean
  error?: string
  scenario: string
  from: string
  to: string
}

export interface BatchResult {
  batchIndex: number
  submitted: number
  succeeded: number
  failed: number
  avgLatencyMs: number      // submission → inclusion
  avgFinalityMs: number     // submission → finalization
  startTime: number
  endTime: number
  tps: number               // tx per second in this batch
}

export interface ScenarioResult {
  scenario: string
  targetTxCount: number
  actualTxCount: number
  succeeded: number
  failed: number
  errorRate: number         // 0-1
  startTime: number
  endTime: number
  durationMs: number
  avgTPS: number            // overall tx/s
  peakTPS: number           // highest single-second rate
  p50LatencyMs: number      // median submission→inclusion
  p95LatencyMs: number      // 95th percentile latency
  p99LatencyMs: number      // 99th percentile latency
  avgFinalityMs: number
  blocksUsed: number        // how many distinct blocks contained our txs
  avgBlockUtilization: number // rough % of estimated block capacity used
  errors: Record<string, number>  // error type → count
  batches: BatchResult[]
}

export interface BenchmarkReport {
  timestamp: string
  nodeEndpoint: string
  nodeVersion: string
  chainName: string
  testDurationMs: number
  scenarios: ScenarioResult[]
  summary: {
    maxSustainedTPS: number
    maxPeakTPS: number
    bestLatencyMs: number
    worstErrorRate: number
    recommendedBatchSize: number
    bottleneck: string      // human readable bottleneck analysis
  }
}
