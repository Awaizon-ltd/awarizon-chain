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

// ── useLiveChainData ───────────────────────────────────────────────
// Subscribes to new blocks, parses extrinsics, maintains rolling
// windows for blocks (last 20) and transactions (last 50).

export function useLiveChainData() {
  const [latestBlockNumber, setLatestBlockNumber] = useState(0)
  const [tps, setTps] = useState(0)
  const [blocks, setBlocks] = useState<BlockInfo[]>([])
  const [txs, setTxs] = useState<TxInfo[]>([])

  useEffect(() => {
    let cleanup: (() => void) | null = null
    const recentCounts: number[] = []

    getClient()
      .then(async (client) => {
        cleanup = await client.subscribeNewBlocks((blockNumber: number, blockHash: string) => {
          void (async () => {
            try {
              const signed = await (client.getApi().rpc.chain as any).getBlock(blockHash)
              const exts: any[] = Array.from(signed.block.extrinsics)
              const ts = Date.now()

              recentCounts.push(exts.length)
              if (recentCounts.length > 10) recentCounts.shift()
              const newTps = recentCounts.reduce((s: number, n: number) => s + n, 0) / 30

              const newTxs: TxInfo[] = exts.map((ext: any, i: number) => ({
                blockNumber,
                index: i,
                hash: ext.hash?.toHex?.() ?? '0x',
                section: ext.method?.section ?? 'unknown',
                method: ext.method?.method ?? 'unknown',
                isSigned: Boolean(ext.isSigned),
                timestamp: ts,
              }))

              setLatestBlockNumber(blockNumber)
              setTps(newTps)
              setBlocks(prev =>
                [{ number: blockNumber, hash: blockHash, timestamp: ts, extrinsicCount: exts.length }, ...prev].slice(0, 20)
              )
              setTxs(prev => [...newTxs, ...prev].slice(0, 50))
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

  return { latestBlockNumber, tps, blocks, txs }
}
