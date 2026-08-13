import { ApiPromise, WsProvider } from '@polkadot/api'
import { awarizonTypes, awarizonRpc } from '@awarizon/sdk'

async function main() {
  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({
    provider,
    types: awarizonTypes,
    rpc: awarizonRpc,
  })

  console.log('Spec version:',
    api.runtimeVersion.specVersion.toString()
  )

  console.log('\nAwarizonState methods:')
  const methods = Object.keys(
    (api.tx as any).awarizonState
  )
  methods.forEach(m => console.log(' ', m))

  await api.disconnect()
}

main().catch(console.error)
