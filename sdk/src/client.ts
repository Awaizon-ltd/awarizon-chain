import { ApiPromise, WsProvider } from '@polkadot/api'
import { awarizonRpc, awarizonTypes } from './customTypes'
import { DEFAULT_ENDPOINT } from './constants'

export class AwarizonClient {
  private api: ApiPromise | null = null
  private endpoint: string
  // In-flight connection attempt. Callers that arrive while a connect() is
  // already underway await this instead of racing to create their own
  // ApiPromise/WsProvider — without it, several hooks calling connect()
  // concurrently on mount would each open a separate connection.
  private connecting: Promise<ApiPromise> | null = null

  constructor(endpoint: string = DEFAULT_ENDPOINT) {
    this.endpoint = endpoint
  }

  async connect(): Promise<ApiPromise> {
    if (this.api?.isConnected) return this.api
    if (this.connecting) return this.connecting

    this.connecting = (async () => {
      const provider = new WsProvider(this.endpoint)
      const api = await ApiPromise.create({
        provider,
        types: awarizonTypes,
        rpc: awarizonRpc,
      })
      await api.isReady
      this.api = api
      return api
    })()

    try {
      return await this.connecting
    } finally {
      this.connecting = null
    }
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
