import { ApiPromise, WsProvider } from '@polkadot/api'
import { awarizonTypes, awarizonRpc } from '@awarizon/sdk'
import { CONFIG } from './config'

export interface NodeMetrics {
  blockNumber: number
  blockHash: string
  extrinsicCount: number
  timestamp: number
}

export class ChainMonitor {
  private api: ApiPromise | null = null
  private metrics: NodeMetrics[] = []
  private unsub: (() => void) | null = null
  private startBlock = 0
  private startTime = 0

  async start(): Promise<void> {
    const provider = new WsProvider(CONFIG.endpoint)
    this.api = await ApiPromise.create({
      provider,
      types: awarizonTypes,
      rpc: awarizonRpc,
    })
    await this.api.isReady

    this.startTime = Date.now()

    this.unsub = await this.api.rpc.chain
      .subscribeNewHeads(async (header) => {
        const blockNum = header.number.toNumber()
        if (this.startBlock === 0) {
          this.startBlock = blockNum
        }

        try {
          const blockHash = header.hash.toHex()
          const block = await this.api!.rpc.chain
            .getBlock(blockHash)
          const extCount = block.block.extrinsics.length

          this.metrics.push({
            blockNumber: blockNum,
            blockHash,
            extrinsicCount: extCount,
            timestamp: Date.now(),
          })

          console.log(
            `  Block #${blockNum.toLocaleString()} | ` +
            `${extCount} extrinsics | ` +
            `${((Date.now() - this.startTime) / 1000).toFixed(1)}s`
          )
        } catch {
          // Block fetch failed — skip
        }
      }) as unknown as () => void
  }

  async stop(): Promise<NodeMetrics[]> {
    this.unsub?.()
    await this.api?.disconnect()
    return this.metrics
  }

  getMetrics(): NodeMetrics[] {
    return this.metrics
  }

  summary() {
    if (this.metrics.length === 0) return null

    const totalExtrinsics = this.metrics
      .reduce((sum, m) => sum + m.extrinsicCount, 0)

    const maxExtrinsics = Math.max(
      ...this.metrics.map(m => m.extrinsicCount)
    )

    const avgExtrinsics = totalExtrinsics / this.metrics.length

    return {
      blocksObserved: this.metrics.length,
      totalExtrinsics,
      avgExtrinsicsPerBlock: Math.round(avgExtrinsics),
      maxExtrinsicsPerBlock: maxExtrinsics,
      startBlock: this.startBlock,
      endBlock: this.metrics[this.metrics.length - 1]
        ?.blockNumber ?? 0,
    }
  }
}
