import { Provider } from 'awarizon.js'

async function main() {
  const provider = await Provider.connect(
    'wss://rpc.awarizon.com'
  )

  const profile = await provider.network
    .getWalletTargetingProfile(
      '5EbnHPa3qMEuWC82guj47QnsMWkLxpXTxqnGhPtPguq2CuCK'
    )
  console.log('Targeting profile:', profile)

  await provider.disconnect()
}

main().catch(console.error)
