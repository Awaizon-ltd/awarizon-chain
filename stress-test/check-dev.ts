import { Provider } from 'awarizon.js'

const DEV_ADDRESS = '5EFMjcpYbbyszjcrx83nd18zrkGeVrpzu4BymBXtTH9E685Z'

async function main() {
  const provider = await Provider.connect(
    'wss://rpc.awarizon.com'
  )

  const status = await provider.developer
    .status(DEV_ADDRESS)
  console.log('Developer status:')
  console.log(JSON.stringify(status, null, 2))

  const balance = await provider.wallet
    .balance(DEV_ADDRESS)
  console.log('\nBalance:', balance)

  await provider.disconnect()
}

main().catch(console.error)
