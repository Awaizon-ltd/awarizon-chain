import { ApiPromise, WsProvider } from '@polkadot/api'

async function main() {
  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({ provider })
  await api.isReady

  // List all pallets and their extrinsics
  console.log('\n=== ALL PALLETS ===')
  const pallets = api.tx
  for (const palletName of Object.keys(pallets).sort()) {
    if (palletName.toLowerCase().includes('awarizon') ||
        palletName.toLowerCase().includes('identity')) {
      console.log(`\nPallet: ${palletName}`)
      const extrinsics = Object.keys(pallets[palletName]).sort()
      extrinsics.forEach(e => console.log(`  - ${e}`))
    }
  }

  await api.disconnect()
}

main().catch(console.error)
