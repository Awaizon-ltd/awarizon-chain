import { ApiPromise, WsProvider } from '@polkadot/api'
import { awarizonRpc, awarizonTypes } from './customTypes'
import { DEFAULT_ENDPOINT } from './constants'

export class AwarizonClient {
  private api: ApiPromise | null = null
  private endpoint: string

  constructor(endpoint: string = DEFAULT_ENDPOINT) {
    this.endpoint = endpoint
  }

  async connect(): Promise<ApiPromise> {
    if (this.api?.isConnected) return this.api

    const provider = new WsProvider(this.endpoint)
    this.api = await ApiPromise.create({
      provider,
      types: awarizonTypes,
      rpc: awarizonRpc,
    })

    await this.api.isReady
    return this.api
  }

  async disconnect(): Promise<void> {
    if (this.api) {
      await this.api.disconnect()
      this.api = null
    }
  }

  getApi(): ApiPromise {
    if (!this.api?.isConnected) {
      throw new Error('Not connected. Call connect() first.')
    }
    return this.api
  }

  async subscribeNewBlocks(
    callback: (blockNumber: number, blockHash: string) => void
  ): Promise<() => void> {
    const api = this.getApi()
    const unsub = await api.rpc.chain.subscribeNewHeads((header) => {
      callback(header.number.toNumber(), header.hash.toHex())
    })
    return unsub as unknown as () => void
  }

  async getBalance(address: string): Promise<bigint> {
    const api = this.getApi()
    const account = await api.query.system.account(address)
    return BigInt((account as any).data.free.toString())
  }
}

export async function connect(
  endpoint: string = DEFAULT_ENDPOINT
): Promise<AwarizonClient> {
  const client = new AwarizonClient(endpoint)
  await client.connect()
  return client
}
