import { ApiPromise, WsProvider } from '@polkadot/api'
import { cryptoWaitReady } from '@polkadot/util-crypto'

async function main() {
  await cryptoWaitReady()
  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({ provider })

  console.log('=== DEX EXTRINSICS ===')
  const dexTx = Object.keys(api.tx)
    .filter(k => k.toLowerCase().includes('dex'))
  console.log('DEX tx namespaces:', dexTx)

  if (dexTx.length > 0) {
    const methods = Object.keys(
      (api.tx as any)[dexTx[0]]
    )
    console.log('DEX methods:', methods)
  }

  console.log('\n=== ALL PALLETS ===')
  console.log(Object.keys(api.tx).join(', '))

  await api.disconnect()
}

main().catch(console.error)
