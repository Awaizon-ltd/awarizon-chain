import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getClient } from './client'
import {
  getNetworkStats,
  getTokenStats,
  getActiveCampaignCount,
  getCampaign,
  getCampaignDeliveryStatus,
  getActiveValidators,
  getValidatorCount,
  getValidatorPerformance,
  getDeveloperProfile,
  getDeveloperCampaigns,
  getDeveloperManifests,
  getInboxCount,
  getWalletTargetingProfile,
  getIdentity,
  getRecentTransactions,
} from '@awarizon/sdk'

export interface LatestBlock {
  number: number
  hash: string
  timestamp: number
}

// Network stats — refresh every 6 seconds (2 blocks)
export function useNetworkStats() {
  return useQuery({
    queryKey: ['networkStats'],
    queryFn: async () => {
      const client = await getClient()
      return getNetworkStats(client.getApi())
    },
    refetchInterval: 6000,
    staleTime: 3000,
  })
}

// Token stats — refresh every 30 seconds
export function useTokenStats() {
  return useQuery({
    queryKey: ['tokenStats'],
    queryFn: async () => {
      const client = await getClient()
      return getTokenStats(client.getApi())
    },
    refetchInterval: 30000,
  })
}

// Active campaign count — refresh every 12 seconds
export function useActiveCampaignCount() {
  return useQuery({
    queryKey: ['activeCampaignCount'],
    queryFn: async () => {
      const client = await getClient()
      return getActiveCampaignCount(client.getApi())
    },
    refetchInterval: 12000,
  })
}

// Campaign by ID
export function useCampaign(campaignId: string) {
  return useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const client = await getClient()
      return getCampaign(client.getApi(), campaignId)
    },
    enabled: !!campaignId,
  })
}

// Campaign delivery status
export function useCampaignDeliveryStatus(campaignId: string) {
  return useQuery({
    queryKey: ['campaignDelivery', campaignId],
    queryFn: async () => {
      const client = await getClient()
      return getCampaignDeliveryStatus(client.getApi(), campaignId)
    },
    enabled: !!campaignId,
    refetchInterval: 12000,
  })
}

// Active validators — refresh every 30 seconds
export function useActiveValidators() {
  return useQuery({
    queryKey: ['activeValidators'],
    queryFn: async () => {
      const client = await getClient()
      return getActiveValidators(client.getApi())
    },
    refetchInterval: 30000,
  })
}

// Validator count
export function useValidatorCount() {
  return useQuery({
    queryKey: ['validatorCount'],
    queryFn: async () => {
      const client = await getClient()
      return getValidatorCount(client.getApi())
    },
    refetchInterval: 30000,
  })
}

// Validator performance
export function useValidatorPerformance(address: string) {
  return useQuery({
    queryKey: ['validatorPerformance', address],
    queryFn: async () => {
      const client = await getClient()
      return getValidatorPerformance(client.getApi(), address)
    },
    enabled: !!address,
    refetchInterval: 30000,
  })
}

// Developer profile
export function useDeveloperProfile(address: string) {
  return useQuery({
    queryKey: ['developerProfile', address],
    queryFn: async () => {
      const client = await getClient()
      return getDeveloperProfile(client.getApi(), address)
    },
    enabled: !!address,
  })
}

// Developer campaigns
export function useDeveloperCampaigns(address: string) {
  return useQuery({
    queryKey: ['developerCampaigns', address],
    queryFn: async () => {
      const client = await getClient()
      return getDeveloperCampaigns(client.getApi(), address)
    },
    enabled: !!address,
  })
}

// Developer manifests
export function useDeveloperManifests(address: string) {
  return useQuery({
    queryKey: ['developerManifests', address],
    queryFn: async () => {
      const client = await getClient()
      return getDeveloperManifests(client.getApi(), address)
    },
    enabled: !!address,
  })
}

// Inbox count
export function useInboxCount(address: string) {
  return useQuery({
    queryKey: ['inboxCount', address],
    queryFn: async () => {
      const client = await getClient()
      return getInboxCount(client.getApi(), address)
    },
    enabled: !!address,
    refetchInterval: 12000,
  })
}

// Wallet targeting profile
export function useWalletTargetingProfile(address: string) {
  return useQuery({
    queryKey: ['walletTargetingProfile', address],
    queryFn: async () => {
      const client = await getClient()
      return getWalletTargetingProfile(client.getApi(), address)
    },
    enabled: !!address,
  })
}

// Account balance
export function useBalance(address: string) {
  return useQuery({
    queryKey: ['balance', address],
    queryFn: async () => {
      const client = await getClient()
      return client.getBalance(address)
    },
    enabled: !!address,
    refetchInterval: 12000,
  })
}

// Identity .riz name for an address — stale after 60s
export function useIdentityName(address: string | undefined) {
  return useQuery<string | null>({
    queryKey: ['identityName', address],
    queryFn: async () => {
      if (!address) return null
      const client = await getClient()
      const identity = await getIdentity(client.getApi(), address)
      return identity?.rizNameFull ?? null
    },
    enabled: !!address,
    staleTime: 60_000,
    gcTime: 300_000,
  })
}

// Full identity record including display name, bio, reputation, etc.
export function useIdentity(address: string) {
  return useQuery({
    queryKey: ['identity', address],
    queryFn: async () => {
      if (!address) return null
      const client = await getClient()
      return getIdentity(client.getApi(), address)
    },
    enabled: !!address,
    staleTime: 60_000,
    gcTime: 300_000,
  })
}

// Full system account data — free balance, reserved, total, nonce
export interface AccountInfo {
  free: bigint
  reserved: bigint
  total: bigint
  nonce: number
}

export function useAccountInfo(address: string) {
  return useQuery<AccountInfo | null>({
    queryKey: ['accountInfo', address],
    queryFn: async () => {
      if (!address) return null
      const client = await getClient()
      const api = client.getApi()
      const account = await (api.query as any).system.account(address)
      const free = BigInt(account.data.free.toString())
      const reserved = BigInt(account.data.reserved.toString())
      return { free, reserved, total: free + reserved, nonce: Number(account.nonce.toString()) }
    },
    enabled: !!address,
    refetchInterval: 12000,
  })
}

// Live block subscription — pushes into query cache via subscribeNewBlocks
export function useLatestBlock() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let cleanup: (() => void) | null = null

    getClient()
      .then(async (client) => {
        cleanup = await client.subscribeNewBlocks((blockNumber, blockHash) => {
          queryClient.setQueryData<LatestBlock>(['latestBlock'], {
            number: blockNumber,
            hash: blockHash,
            timestamp: Date.now(),
          })
        })
      })
      .catch(console.error)

    return () => {
      cleanup?.()
    }
  }, [queryClient])

  return useQuery<LatestBlock | null>({
    queryKey: ['latestBlock'],
    queryFn: () => null,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

// ── Live chain data types ──────────────────────────────────────────

export interface BlockInfo {
  number: number
  hash: string
  timestamp: number
  extrinsicCount: number
}

export interface TxInfo {
  blockNumber: number
  index: number
  hash: string
  section: string
  method: string
  isSigned: boolean
  timestamp: number
  type: string
}

export interface TpsPoint {
  t: number   // unix ms timestamp
  tps: number
}

// ── txHashCache ────────────────────────────────────────────────────
// Module-level map populated by useLiveChainData. Allows Blocks.tsx
// to resolve a tx hash to its block + index without extra RPC calls.
export const txHashCache = new Map<string, { blockNumber: number; index: number }>()

// Map pallet section + method to a human-readable transaction type label.
// Section names come from polkadot.js metadata (camelCase pallet names).
export function classifyExtrinsic(section: string, method: string): string {
  const m = method.toLowerCase()
  switch (section) {
    case 'timestamp':   return 'Timestamp'
    case 'balances':
      if (m.startsWith('transfer')) return 'Transfer'
      if (m.includes('force'))      return 'Force Move'
      return 'Balances'
    case 'vesting':     return 'Vesting'
    case 'sudo':        return 'Sudo'
    case 'utility':     return 'Batch'
    case 'system':      return 'System'
    case 'session':     return 'Session'
    case 'evm':
      if (m === 'call')              return 'Contract Call'
      if (m.startsWith('create'))    return 'Deploy'
      return 'EVM'
    case 'ethereum':    return 'Ethereum'
    case 'awarizonState':
      if (m.includes('developer'))  return 'Developer'
      if (m.includes('manifest'))   return 'Manifest'
      if (m.includes('campaign'))   return 'Campaign'
      if (m.includes('inbox') || m.includes('deliver')) return 'Delivery'
      if (m.includes('engage'))     return 'Engagement'
      if (m.includes('validator'))  return 'Validator'
      if (m.includes('delegate'))   return 'Delegation'
      if (m.includes('stake') || m.includes('unstake')) return 'Staking'
      if (m.includes('reward'))     return 'Reward'
      return 'Chain'
    default:
      return section.charAt(0).toUpperCase() + section.slice(1)
  }
}

// ── Utilities ─────────────────────────────────────────────────────

export function calcEpochCountdown(block: number): string {
  const left = 28800 - (block % 28800)
  const secs = left * 3
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return `${h}h ${m}m`
}

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

// ── Paginated blocks query ─────────────────────────────────────────
// page 0 = newest [baseBlock … baseBlock-pageSize+1]
// page 1 = [baseBlock-pageSize … baseBlock-2*pageSize+1], etc.
export function useBlocksPage(baseBlock: number, page: number, pageSize = 20) {
  return useQuery<BlockInfo[]>({
    queryKey: ['blocksPage', baseBlock, page, pageSize],
    queryFn: async () => {
      if (baseBlock === 0) return []
      const client = await getClient()
      const api = client.getApi()
      const start = baseBlock - page * pageSize
      if (start < 0) return []
      const nums = Array.from({ length: pageSize }, (_, i) => start - i).filter(n => n >= 0)
      const results = await Promise.allSettled(nums.map(async (n) => {
        const hash = await (api.rpc.chain as any).getBlockHash(n)
        if (hash.isEmpty) return null
        const signed = await (api.rpc.chain as any).getBlock(hash)
        const exts: any[] = Array.from(signed.block.extrinsics)
        // Extract timestamp from timestamp.set args — avoids an extra storage query
        const tsExt = exts.find((e: any) => e.method?.section === 'timestamp' && e.method?.method === 'set')
        const blockTs = tsExt ? Number((tsExt.method.args[0] as any).toString()) : 0
        const userExts = exts.filter((e: any) => {
          const s: string = e.method?.section ?? ''
          return s !== 'timestamp' && s !== 'parachainSystem'
        })
        return { number: n, hash: hash.toHex(), timestamp: blockTs, extrinsicCount: userExts.length } as BlockInfo
      }))
      return results
        .filter((r): r is PromiseFulfilledResult<BlockInfo> => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value)
    },
    enabled: baseBlock > 0,
    staleTime: 30_000,
  })
}

// ── useLiveChainData ───────────────────────────────────────────────
// Subscribes to new blocks, parses extrinsics, maintains rolling
// windows for blocks (last 10) and transactions (last 10).
// Pre-fetches the last 10 blocks on mount so UI starts full — no
// awkward grow-from-empty animation.

export function useLiveChainData() {
  const [latestBlockNumber, setLatestBlockNumber] = useState(0)
  const [tps, setTps] = useState(0)
  const [tpsHistory, setTpsHistory] = useState<TpsPoint[]>([])
  const [blocks, setBlocks] = useState<BlockInfo[]>([])
  const [txs, setTxs] = useState<TxInfo[]>([])

  useEffect(() => {
    let cleanup: (() => void) | null = null
    // Guards against duplicate block processing from StrictMode double-invoke
    // and nodes that re-broadcast the same head.
    const seen = new Set<number>()
    const recentCounts: number[] = []

    getClient()
      .then(async (client) => {
        const api = client.getApi()

        // ── Pre-fetch last 10 blocks + seed from getRecentTransactions ──
        try {
          const latestHeader = await (api.rpc.chain as any).getHeader()
          const latestNum: number = latestHeader.number.toNumber()

          // Pull the last 50 user txs stored on-chain. Extract block numbers so
          // we can also fetch any blocks that hold recent txs but fall outside
          // the 10-block window (e.g. the block that held a tx from 2 minutes ago).
          let recentTxBlockNums: number[] = []
          try {
            const recentTxs = await getRecentTransactions(api)
            recentTxBlockNums = [...new Set(recentTxs.map(t => t.block_number))]
          } catch { /* not fatal */ }

          const windowNums = Array.from({ length: 10 }, (_, i) => latestNum - i).filter(n => n >= 0)
          // Merge: window blocks + any extra blocks that had user txs, deduplicated
          const preloadNums = [...new Set([...windowNums, ...recentTxBlockNums])].sort((a, b) => b - a)
          // Mark pre-loaded blocks as seen so the subscription won't re-process them
          preloadNums.forEach(n => seen.add(n))

          const preloadResults = await Promise.allSettled(preloadNums.map(async (n) => {
            const hash = await (api.rpc.chain as any).getBlockHash(n)
            const signed = await (api.rpc.chain as any).getBlock(hash)
            const exts: any[] = Array.from(signed.block.extrinsics)
            const tsExt = exts.find((e: any) => e.method?.section === 'timestamp' && e.method?.method === 'set')
            const blockTs = tsExt
              ? Number((tsExt.method.args[0] as any).toString())
              : Date.now() - (latestNum - n) * 3000
            const userExts = exts.filter((e: any) => {
              const s: string = e.method?.section ?? ''
              return s !== 'timestamp' && s !== 'parachainSystem'
            })
            const txInfos: TxInfo[] = userExts.map((ext: any) => {
              const section: string = ext.method?.section ?? 'unknown'
              const method: string  = ext.method?.method  ?? 'unknown'
              const txHash: string  = ext.hash?.toHex?.() ?? '0x'
              txHashCache.set(txHash, { blockNumber: n, index: exts.indexOf(ext) })
              return { blockNumber: n, index: exts.indexOf(ext), hash: txHash, section, method, isSigned: Boolean(ext.isSigned), timestamp: blockTs, type: classifyExtrinsic(section, method) }
            })
            return {
              block: { number: n, hash: hash.toHex(), timestamp: blockTs, extrinsicCount: userExts.length } as BlockInfo,
              txs: txInfos,
            }
          }))

          const preBlocks: BlockInfo[] = []
          const preTxs: TxInfo[] = []
          for (const r of preloadResults) {
            if (r.status === 'fulfilled') {
              preBlocks.push(r.value.block)
              preTxs.push(...r.value.txs)
            }
          }
          preBlocks.sort((a, b) => b.number - a.number)
          preTxs.sort((a, b) => b.blockNumber - a.blockNumber || b.index - a.index)

          setLatestBlockNumber(preBlocks[0]?.number ?? latestNum)
          setBlocks(preBlocks)
          setTxs(preTxs.slice(0, 10))
        } catch {
          // pre-fetch failure is non-fatal — subscription will still populate
        }

        // ── Live subscription ──────────────────────────────────────
        cleanup = await client.subscribeNewBlocks((blockNumber: number, blockHash: string) => {
          if (seen.has(blockNumber)) return
          seen.add(blockNumber)

          void (async () => {
            try {
              const [signed, tsRaw] = await Promise.all([
                (api.rpc.chain as any).getBlock(blockHash),
                (api.query as any).timestamp.now.at(blockHash),
              ])
              const exts: any[] = Array.from(signed.block.extrinsics)
              const blockTs: number = tsRaw ? Number(tsRaw.toString()) : Date.now()

              const userExts = exts.filter((e: any) => {
                const s: string = e.method?.section ?? ''
                return s !== 'timestamp' && s !== 'parachainSystem'
              })

              recentCounts.push(userExts.length)
              if (recentCounts.length > 10) recentCounts.shift()
              // TPS = avg user extrinsics per block ÷ 3s block time
              const newTps = recentCounts.reduce((s: number, n: number) => s + n, 0) / (recentCounts.length * 3)

              const newTxs: TxInfo[] = userExts.map((ext: any) => {
                const section: string = ext.method?.section ?? 'unknown'
                const method: string  = ext.method?.method  ?? 'unknown'
                const txHash: string  = ext.hash?.toHex?.() ?? '0x'
                txHashCache.set(txHash, { blockNumber, index: exts.indexOf(ext) })
                return { blockNumber, index: exts.indexOf(ext), hash: txHash, section, method, isSigned: Boolean(ext.isSigned), timestamp: blockTs, type: classifyExtrinsic(section, method) }
              })

              setLatestBlockNumber(blockNumber)
              setTps(newTps)
              setTpsHistory(prev => [...prev, { t: blockTs, tps: newTps }].slice(-30))
              setBlocks(prev => {
                if (prev.some(b => b.number === blockNumber)) return prev
                return [
                  { number: blockNumber, hash: blockHash, timestamp: blockTs, extrinsicCount: userExts.length },
                  ...prev,
                ].slice(0, 10)
              })
              setTxs(prev => [...newTxs, ...prev].slice(0, 10))
            } catch {
              // ignore errors on individual blocks
            }
          })()
        })
      })
      .catch(console.error)

    return () => {
      cleanup?.()
    }
  }, [])

  return { latestBlockNumber, tps, tpsHistory, blocks, txs }
}
