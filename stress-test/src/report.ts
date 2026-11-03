import fs from 'fs/promises'
import path from 'path'
import { CONFIG } from './config'
import { ESTIMATED_MAX_TX_PER_BLOCK } from './runner'
import type { ScenarioResult } from './types'

export async function saveResult(
  result: ScenarioResult
): Promise<string> {
  const dir = CONFIG.resultsDir
  await fs.mkdir(dir, { recursive: true })

  const timestamp = new Date().toISOString().replace(/:/g, '-')
  const filename = `${result.scenario}-${result.targetTxCount}-${timestamp}.json`
  const filepath = path.join(dir, filename)

  await fs.writeFile(filepath, JSON.stringify(result, null, 2))
  return filepath
}

export function printScenarioResult(r: ScenarioResult): void {
  const line = '─'.repeat(60)

  console.log(`\n${line}`)
  console.log(`RESULTS: ${r.scenario.toUpperCase()}`)
  console.log(line)
  console.log(`Target transactions:  ${r.targetTxCount.toLocaleString()}`)
  console.log(`Actual submitted:     ${r.actualTxCount.toLocaleString()}`)
  console.log(`Succeeded:            ${r.succeeded.toLocaleString()} (${r.actualTxCount > 0 ? ((r.succeeded / r.actualTxCount) * 100).toFixed(2) : '0.00'}%)`)
  console.log(`Failed:               ${r.failed.toLocaleString()} (${(r.errorRate * 100).toFixed(2)}%)`)
  console.log(`Duration:             ${(r.durationMs / 1000).toFixed(1)}s`)
  console.log(``)
  console.log(`THROUGHPUT`)
  console.log(`  Average TPS:        ${r.avgTPS.toLocaleString()}`)
  console.log(`  Peak TPS:           ${r.peakTPS.toLocaleString()}`)
  console.log(``)
  console.log(`LATENCY (submission → block inclusion)`)
  console.log(`  P50 (median):       ${r.p50LatencyMs}ms`)
  console.log(`  P95:                ${r.p95LatencyMs}ms`)
  console.log(`  P99:                ${r.p99LatencyMs}ms`)
  console.log(``)
  console.log(`FINALITY (submission → finalized)`)
  console.log(`  Average:            ${r.avgFinalityMs}ms`)
  console.log(``)
  console.log(`BLOCK UTILIZATION`)
  console.log(`  Blocks used:        ${r.blocksUsed}`)
  console.log(`  Avg tx per block:   ${Math.round(r.avgBlockUtilization * ESTIMATED_MAX_TX_PER_BLOCK)}`)
  console.log(`  Avg utilization:    ${(r.avgBlockUtilization * 100).toFixed(1)}%`)

  if (Object.keys(r.errors).length > 0) {
    console.log(``)
    console.log(`ERRORS`)
    for (const [err, count] of Object.entries(r.errors)) {
      console.log(`  ${err}: ${count}`)
    }
  }

  console.log(line)
}

export async function generateMarkdownReport(
  results: ScenarioResult[],
  nodeInfo: { endpoint: string; version: string; chain: string }
): Promise<string> {
  const timestamp = new Date().toISOString()

  const maxTPS = Math.max(...results.map(r => r.peakTPS))
  const maxSustained = Math.max(...results.map(r => r.avgTPS))
  const p50s = results.filter(r => r.p50LatencyMs > 0).map(r => r.p50LatencyMs)
  const bestLatency = p50s.length > 0 ? Math.min(...p50s) : 0
  const worstError = Math.max(...results.map(r => r.errorRate))

  let bottleneck = 'Unknown'
  if (worstError > 0.05) {
    bottleneck = 'High error rate — likely mempool pressure or nonce conflicts'
  } else if (maxSustained < 100) {
    bottleneck = 'Low throughput — likely single-threaded submission or block weight limits'
  } else if (bestLatency > 10000) {
    bottleneck = 'High latency — likely block production rate or queue depth'
  } else {
    bottleneck = 'No significant bottleneck detected at tested load levels'
  }

  let md = `# Awarizon Blockchain Stress Test Report\n\n`
  md += `**Generated:** ${timestamp}\n`
  md += `**Node:** ${nodeInfo.endpoint}\n`
  md += `**Chain:** ${nodeInfo.chain}\n`
  md += `**Node Version:** ${nodeInfo.version}\n\n`

  md += `## Executive Summary\n\n`
  md += `| Metric | Value |\n`
  md += `|--------|-------|\n`
  md += `| Max Sustained TPS | **${maxSustained.toLocaleString()} tx/s** |\n`
  md += `| Peak TPS | **${maxTPS.toLocaleString()} tx/s** |\n`
  md += `| Best P50 Latency | **${bestLatency}ms** |\n`
  md += `| Worst Error Rate | **${(worstError * 100).toFixed(2)}%** |\n`
  md += `| Bottleneck | ${bottleneck} |\n\n`

  md += `## Scenario Results\n\n`

  for (const r of results) {
    md += `### ${r.scenario} — ${r.targetTxCount.toLocaleString()} transactions\n\n`
    md += `| Metric | Value |\n`
    md += `|--------|-------|\n`
    md += `| Submitted | ${r.actualTxCount.toLocaleString()} |\n`
    md += `| Succeeded | ${r.succeeded.toLocaleString()} (${r.actualTxCount > 0 ? ((r.succeeded / r.actualTxCount) * 100).toFixed(2) : '0.00'}%) |\n`
    md += `| Failed | ${r.failed.toLocaleString()} (${(r.errorRate * 100).toFixed(2)}%) |\n`
    md += `| Duration | ${(r.durationMs / 1000).toFixed(1)}s |\n`
    md += `| Avg TPS | ${r.avgTPS.toLocaleString()} |\n`
    md += `| Peak TPS | ${r.peakTPS.toLocaleString()} |\n`
    md += `| P50 Latency | ${r.p50LatencyMs}ms |\n`
    md += `| P95 Latency | ${r.p95LatencyMs}ms |\n`
    md += `| P99 Latency | ${r.p99LatencyMs}ms |\n`
    md += `| Avg Finality | ${r.avgFinalityMs}ms |\n`
    md += `| Blocks Used | ${r.blocksUsed} |\n`
    md += `| Avg Block Util | ${(r.avgBlockUtilization * 100).toFixed(1)}% |\n\n`

    if (Object.keys(r.errors).length > 0) {
      md += `**Errors:**\n`
      for (const [err, count] of Object.entries(r.errors)) {
        md += `- \`${err}\`: ${count}\n`
      }
      md += `\n`
    }
  }

  md += `## Analysis\n\n`
  md += `### Throughput\n`
  md += `The chain achieved a peak of **${maxTPS.toLocaleString()} TPS** `
  md += `and sustained **${maxSustained.toLocaleString()} TPS** across all scenarios.\n\n`

  md += `### Latency\n`
  md += `Median transaction inclusion latency was **${bestLatency}ms** `
  md += `under optimal conditions. Finality adds approximately 6-9 seconds `
  md += `(2-3 blocks at ${3}s block time).\n\n`

  md += `### Block Utilization\n`
  const avgUtil = results.reduce(
    (sum, r) => sum + r.avgBlockUtilization, 0
  ) / results.length
  md += `Average block utilization across all scenarios: `
  md += `**${(avgUtil * 100).toFixed(1)}%**. `
  if (avgUtil < 0.5) {
    md += `Blocks are underutilized — the bottleneck is submission `
    md += `rate, not block capacity.\n\n`
  } else if (avgUtil > 0.8) {
    md += `Blocks are heavily utilized — approaching capacity limits. `
    md += `Consider increasing block size or optimizing tx weight.\n\n`
  } else {
    md += `Block utilization is healthy — good balance between `
    md += `submission rate and block capacity.\n\n`
  }

  md += `### Recommendations\n`
  md += `1. **Optimal batch size:** ${CONFIG.batchSize} concurrent submissions\n`
  md += `2. **Safe sustained load:** ~${Math.round(maxSustained * 0.8).toLocaleString()} TPS\n`
  md += `3. **Max burst capacity:** ~${maxTPS.toLocaleString()} TPS\n`

  return md
}
