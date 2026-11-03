import { ApiPromise, WsProvider } from '@polkadot/api'
import { cryptoWaitReady } from '@polkadot/util-crypto'

async function main() {
  await cryptoWaitReady()

  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({ provider })

  const CAMPAIGN_ID =
    '0x210bdfc96bfffbb0a8703399c49a777e4114b9db1b27ec970000019f4e42022e'

  console.log('Testing campaign fetch...')
  console.log('Campaign ID:', CAMPAIGN_ID)

  try {
    // Test 1 — direct RPC call
    const result = await (api.rpc as any)
      .awarizon.getCampaign(CAMPAIGN_ID)
    console.log('\nDirect RPC result:')
    console.log('  isEmpty:', result.isEmpty)
    console.log('  JSON:', JSON.stringify(
      result.toJSON(), null, 2
    ))
  } catch (err: any) {
    console.log('Direct RPC error:', err.message)
  }

  // Test 2 — without 0x prefix
  try {
    const ID_NO_PREFIX = CAMPAIGN_ID.slice(2)
    const result2 = await (api.rpc as any)
      .awarizon.getCampaign(ID_NO_PREFIX)
    console.log('\nWithout 0x prefix:')
    console.log('  isEmpty:', result2.isEmpty)
    console.log('  JSON:', JSON.stringify(
      result2.toJSON(), null, 2
    ))
  } catch (err: any) {
    console.log('Without 0x error:', err.message)
  }

  await api.disconnect()
}

main().catch(console.error)
