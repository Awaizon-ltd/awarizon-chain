import type { ApiPromise } from '@polkadot/api'
import {
  getNetworkStats,
  getTokenStats,
  getValidatorCount,
  getActiveValidators,
} from '@awarizon/sdk'
import type { NetworkStats } from '../types'
import { formatAmount } from '../utils/amounts'

export class NetworkModule {
  constructor(private api: ApiPromise) {}

  async stats(): Promise<NetworkStats> {
    const raw = await getNetworkStats(this.api)

    return {
      totalWallets: Number(raw.total_wallets),
      totalDeliveries: Number(raw.total_deliveries),
      activeCampaigns: Number(raw.active_campaigns),
      totalStaked: formatAmount(BigInt(raw.total_staked)),
      currentEpoch: Number(raw.current_epoch),
      inboxReserve: formatAmount(BigInt(raw.inbox_reserve_balance)),
      totalExtrinsics: Number(raw.total_extrinsics),
      circulatingSupply: formatAmount(BigInt(raw.circulating_supply)),
      nonCirculatingSupply: formatAmount(BigInt(raw.non_circulating_supply)),
    }
  }

  async tokenStats(): Promise<{ totalIssuance: string; engagementPool: string }> {
    const raw = await getTokenStats(this.api)
    return {
      totalIssuance: formatAmount(BigInt(raw.total_issuance)),
      engagementPool: formatAmount(BigInt(raw.engagement_pool_balance)),
    }
  }

  async validatorCount(): Promise<number> {
    const count = await getValidatorCount(this.api)
    return Number(count)
  }

  async activeValidators(): Promise<string[]> {
    return getActiveValidators(this.api)
  }

  subscribeBlocks(
    callback: (blockNumber: number, hash: string) => void
  ): Promise<() => void> {
    return new Promise((resolve, reject) => {
      this.api.rpc.chain
        .subscribeNewHeads((header) => {
          callback(header.number.toNumber(), header.hash.toHex())
        })
        .then((unsub) => resolve(unsub as unknown as () => void))
        .catch(reject)
    })
  }
}
