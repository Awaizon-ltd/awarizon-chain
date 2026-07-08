import { useEffect, useRef, useState, useCallback } from 'react'
import { getClient } from '../api/client'
import { classifyExtrinsic, txHashCache } from '../api/queries'
import type { StoredBlock, StoredTx } from './chainDb'
import {
  openDb, saveBlockWithTxs, saveManyBlocks,
  getHighestBlock, getLowestBlock, getBlockCount, getUserTxCount, hasBlock,
} from './chainDb'

// How many blocks to fetch in one historical-scan batch.
// Smaller = more responsive UI; larger = faster total catch-up.
const BATCH_SIZE = 20

// Milliseconds to yield between batches so the node and browser aren't hammered.
const BATCH_YIELD_MS = 300

// How many blocks behind the current head we try to fill in on mount.
// This is just an upper bound — the backward scan stops earlier if it hits
// the node's pruning boundary (see PRUNE_BAILOUT_BATCHES below).
const MAX_HISTORY_DEPTH = 2_000


export interface IndexerStatus {
  ready: boolean         // DB open and initial scan started
  liveBlock: number      // latest block seen from subscription
  highestIndexed: number // highest block number in DB
  lowestIndexed: number  // lowest block number in DB (how far back we've gone)
  blockCount: number     // total blocks in DB
  txCount: number        // user transactions in DB
  isBackfilling: boolean // currently running historical scan
  targetBlock: number    // lowest block we're trying to reach
}

// Parse a single chain block into storable records.
async function parseBlock(
  api: any,
  blockNum: number
): Promise<{ block: StoredBlock; txs: StoredTx[] } | null> {
  try {
    const hash = await api.rpc.chain.getBlockHash(blockNum)
    if (!hash || hash.isEmpty) return null

    const [signed, tsRaw] = await Promise.all([
      api.rpc.chain.getBlock(hash),
      (api.query as any).timestamp?.now?.at?.(hash).catch(() => null),
    ])

    const exts: any[] = Array.from(signed.block.extrinsics)
    const timestamp: number = tsRaw ? Number(tsRaw.toString()) : 0
    const hashHex: string = hash.toHex()

    const txs: StoredTx[] = exts.map((ext, i) => {
      const section: string = ext.method?.section ?? 'unknown'
      const method: string  = ext.method?.method  ?? 'unknown'
      const txHash: string  = ext.hash?.toHex?.()  ?? '0x'
      const signer: string  = ext.isSigned ? (ext.signer?.toString?.() ?? '') : ''

      txHashCache.set(txHash, { blockNumber: blockNum, index: i })

      return {
        id: `${blockNum}-${i}`,
        blockNumber: blockNum,
        txIndex: i,
        hash: txHash,
        section,
        method,
        type: classifyExtrinsic(section, method),
        signer,
        timestamp,
        isSigned: Boolean(ext.isSigned),
      }
    })

    const userExts = txs.filter(t => t.section !== 'timestamp' && t.section !== 'parachainSystem')

    return {
      block: { number: blockNum, hash: hashHex, timestamp, extrinsicCount: userExts.length },
      txs,
    }
  } catch {
    return null
  }
}

interface BatchResult {
  pairs: Array<{ block: StoredBlock; txs: StoredTx[] }>
  // True if an entire chunk of `concurrency` blocks failed — a strong signal
  // that we've walked off the end of the node's retained history (state
  // pruning). Each failed attempt logs a console error from inside
  // polkadot-js's RPC layer that we can't suppress, so we stop as soon as we
  // see this rather than grinding through the rest of the batch/target range.
  hitPruneBoundary: boolean
}

// Fetch a batch of block numbers in parallel (limited concurrency).
// Bails out early — without attempting the remaining chunks — the moment a
// whole chunk comes back empty.
async function fetchBatch(
  api: any,
  nums: number[],
  concurrency = 5
): Promise<BatchResult> {
  const pairs: Array<{ block: StoredBlock; txs: StoredTx[] }> = []
  for (let i = 0; i < nums.length; i += concurrency) {
    const chunk = nums.slice(i, i + concurrency)
    const settled = await Promise.allSettled(chunk.map(n => parseBlock(api, n)))
    const chunkPairs = settled
      .filter((r): r is PromiseFulfilledResult<{ block: StoredBlock; txs: StoredTx[] } | null> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter((v): v is { block: StoredBlock; txs: StoredTx[] } => v !== null)

    if (chunkPairs.length === 0) return { pairs, hitPruneBoundary: true }
    pairs.push(...chunkPairs)
  }
  return { pairs, hitPruneBoundary: false }
}

export function useIndexer(): IndexerStatus {
  const [status, setStatus] = useState<IndexerStatus>({
    ready: false,
    liveBlock: 0,
    highestIndexed: 0,
    lowestIndexed: Infinity,
    blockCount: 0,
    txCount: 0,
    isBackfilling: false,
    targetBlock: 0,
  })

  const backfillRef = useRef(false)
  const mountedRef  = useRef(true)

  const refreshCounts = useCallback(async () => {
    const [high, low, bc, tc] = await Promise.all([
      getHighestBlock(),
      getLowestBlock(),
      getBlockCount(),
      getUserTxCount(),
    ])
    if (mountedRef.current) {
      setStatus(prev => ({ ...prev, highestIndexed: high, lowestIndexed: low, blockCount: bc, txCount: tc }))
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    let cleanup: (() => void) | null = null

    async function start() {
      // Ensure DB is open before anything else
      await openDb()

      const client = await getClient()
      const api = client.getApi()

      // ── Live subscription: index new blocks as they arrive ────────────
      cleanup = await client.subscribeNewBlocks(async (blockNumber: number) => {
        if (!mountedRef.current) return
        setStatus(prev => ({ ...prev, liveBlock: blockNumber }))

        const already = await hasBlock(blockNumber)
        if (already) return

        const parsed = await parseBlock(api, blockNumber)
        if (!parsed) return
        await saveBlockWithTxs(parsed.block, parsed.txs)
        await refreshCounts()
      })

      // ── Historical backfill ───────────────────────────────────────────
      // Figure out where to start.  We want to fill backwards from the
      // current chain head to max(0, head - MAX_HISTORY_DEPTH).
      const latestHeader = await api.rpc.chain.getHeader()
      const chainHead: number = latestHeader.number.toNumber()
      const [highest, lowest] = await Promise.all([getHighestBlock(), getLowestBlock()])

      // Catch up any gap between what we have and the current head
      if (highest < chainHead) {
        const missing: number[] = []
        for (let n = highest + 1; n <= chainHead; n++) {
          if (!(await hasBlock(n))) missing.push(n)
        }
        if (missing.length > 0) {
          const { pairs } = await fetchBatch(api, missing)
          await saveManyBlocks(pairs)
          await refreshCounts()
        }
      }

      const targetBlock = Math.max(0, chainHead - MAX_HISTORY_DEPTH)
      if (!mountedRef.current) return
      setStatus(prev => ({ ...prev, ready: true, targetBlock }))

      // If we already have everything down to targetBlock, done.
      if (lowest <= targetBlock) {
        await refreshCounts()
        return
      }

      // ── Backward scan ─────────────────────────────────────────────────
      backfillRef.current = true
      if (!mountedRef.current) return
      setStatus(prev => ({ ...prev, isBackfilling: true }))

      let scanFrom = (lowest === Infinity ? chainHead : lowest) - 1

      while (mountedRef.current && backfillRef.current && scanFrom >= targetBlock) {
        const nums: number[] = []
        for (let i = 0; i < BATCH_SIZE && scanFrom - i >= targetBlock; i++) {
          nums.push(scanFrom - i)
        }
        scanFrom -= nums.length

        const { pairs, hitPruneBoundary } = await fetchBatch(api, nums)
        if (pairs.length > 0) {
          await saveManyBlocks(pairs)
          await refreshCounts()
        }
        // We've walked off the end of the node's retained history — stop
        // rather than retrying all the way down to targetBlock.
        if (hitPruneBoundary) break

        // Yield to keep the UI responsive
        await new Promise(r => setTimeout(r, BATCH_YIELD_MS))
      }

      backfillRef.current = false
      if (mountedRef.current) {
        setStatus(prev => ({ ...prev, isBackfilling: false }))
        await refreshCounts()
      }
    }

    start().catch(console.error)

    return () => {
      mountedRef.current = false
      backfillRef.current = false
      cleanup?.()
    }
  }, [refreshCounts])

  return status
}
