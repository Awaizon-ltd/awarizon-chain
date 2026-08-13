import { ApiPromise, WsProvider } from '@polkadot/api'
import { awarizonTypes, awarizonRpc } from '@awarizon/sdk'

async function main() {
  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({
    provider,
    types: awarizonTypes,
    rpc: awarizonRpc,
  })

  // Check total indexed wallets
  const totalWallets = await (api.query as any)
    .awarizonState.totalWallets()
  console.log('Total indexed wallets:',
    totalWallets.toString()
  )

  // Check wallet index entries
  const entries = await (api.query as any)
    .awarizonState.walletIndexed.entries()
  console.log('Indexed wallet entries:',
    entries.length
  )

  entries.forEach(([key, value]: any) => {
    const address = key.args[0].toString()
    const indexed = value.toPrimitive()
    if (indexed) {
      console.log('✓', address)
    }
  })

  await api.disconnect()
}

main().catch(console.error)
