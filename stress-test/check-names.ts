import { Provider } from 'awarizon.js'

async function main() {
  const provider = await Provider.connect(
    'wss://rpc.awarizon.com'
  )

  const total = await provider.identity
    .getTotalIdentities()
  console.log('Total .riz names registered:', total)

  await provider.disconnect()
}

main().catch(console.error)
