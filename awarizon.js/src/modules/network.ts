import type { ApiPromise } from '@polkadot/api'
import { getNetworkStats } from '@awarizon/sdk'
import { formatAmount } from '../utils'

export interface NetworkStats {
  totalWallets: number
  totalDeliveries: number
  activeCampaigns: number
  totalStaked: string
  currentEpoch: number
  inboxReserve: string
  totalExtrinsics: number
  circulatingSupply: string
  nonCirculatingSupply: string
}

export class NetworkModule {
  constructor(private api: ApiPromise) {}

  async stats(): Promise<NetworkStats> {
    const s = await getNetworkStats(this.api)
    return {
      totalWallets: Number(s.total_wallets),
      totalDeliveries: Number(s.total_deliveries),
      activeCampaigns: Number(s.active_campaigns),
      totalStaked: formatAmount(BigInt(s.total_staked)),
      currentEpoch: Number(s.current_epoch),
      inboxReserve: formatAmount(BigInt(s.inbox_reserve_balance)),
      totalExtrinsics: s.total_extrinsics,
      circulatingSupply: formatAmount(BigInt(s.circulating_supply)),
      nonCirculatingSupply: formatAmount(BigInt(s.non_circulating_supply)),
    }
  }

  async block(): Promise<number> {
    const header = await this.api.rpc.chain.getHeader()
    return header.number.toNumber()
  }

  async subscribe(callback: (block: number) => void): Promise<() => void> {
    const unsub = await this.api.rpc.chain.subscribeNewHeads((header) => {
      callback(header.number.toNumber())
    })
    return unsub as unknown as () => void
  }
}
