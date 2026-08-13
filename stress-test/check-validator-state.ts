import { ApiPromise, WsProvider } from '@polkadot/api'
import { cryptoWaitReady } from '@polkadot/util-crypto'

async function main() {
  await cryptoWaitReady()

  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({ provider })

  const VALIDATOR_ADDR =
    '5DUg3spiag1bZYBKx2oivCYMrfVwBdLASr2d6BPVSqMPHxuE'

  // Check validator storage
  const info = await (api.query as any)
    .awarizonConsensus.validators(VALIDATOR_ADDR)
  console.log('Validator info:', info.toHuman())

  // Check current epoch
  const epoch = await (api.query as any)
    .awarizonConsensus.currentEpoch()
  console.log('Current epoch:', epoch.toHuman())

  // Check active validators storage
  const active = await (api.query as any)
    .awarizonConsensus.activeValidators()
  console.log('Active validators:', active.toHuman())

  // Current block
  const header = await api.rpc.chain.getHeader()
  console.log('Current block:', header.number.toNumber())

  await api.disconnect()
}

main().catch(console.error)
