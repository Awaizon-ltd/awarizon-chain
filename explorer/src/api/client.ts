import { AwarizonClient } from '@awarizon/sdk'

let client: AwarizonClient | null = null

const ENDPOINT = (import.meta as any).env?.VITE_RPC_ENDPOINT ?? 'wss://rpc.awarizon.com'

export async function getClient(): Promise<AwarizonClient> {
  if (!client) {
    client = new AwarizonClient(ENDPOINT)
  }
  // connect() is idempotent — returns early if this.api?.isConnected
  await client.connect()
  return client
}

export function getEndpoint(): string {
  return ENDPOINT
}
