import { Provider } from 'awarizon.js'

const DEV_ADDRESS = '5EFMjcpYbbyszjcrx83nd18zrkGeVrpzu4BymBXtTH9E685Z'

async function main() {
  const provider = await Provider.connect(
    'wss://rpc.awarizon.com'
  )

  // Get all manifests for developer
  const manifests = await provider.apps
    .list(DEV_ADDRESS)

  console.log(`Total apps: ${manifests.length}`)

  for (const m of manifests) {
    console.log('\n─────────────────────')
    console.log(JSON.stringify(m, null, 2))
  }

  await provider.disconnect()
}

main().catch(console.error)
