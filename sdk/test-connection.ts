import { connect } from './src/index'
import {
  getNetworkStats,
  getActiveCampaignCount,
  getTokenStats,
  getActiveValidators,
} from './src/rpc'
import { formatRiz, parseRiz } from './src/utils'

async function main() {
  console.log('Connecting to Awarizon node...')
  const client = await connect('ws://127.0.0.1:9944')
  const api = client.getApi()

  console.log('\nTesting RPC methods...')

  const stats = await getNetworkStats(api)
  console.log('Network stats:', stats)

  const count = await getActiveCampaignCount(api)
  console.log('Active campaigns:', count.toString())

  const tokenStats = await getTokenStats(api)
  console.log('Token stats:', tokenStats)

  const validators = await getActiveValidators(api)
  console.log('Active validators:', validators)

  const balance = await client.getBalance(
    '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' // Alice
  )
  console.log('Alice balance (planck):', balance.toString())
  console.log('Alice balance (RIZ):', formatRiz(balance))

  // Utility sanity checks
  console.log('\nUtility checks:')
  console.log('formatRiz(1_000_000_000_000n):', formatRiz(1_000_000_000_000n))
  console.log('parseRiz("1.5"):', parseRiz('1.5').toString())

  await client.disconnect()
  console.log('\nAll tests passed.')
}

main().catch(console.error)
