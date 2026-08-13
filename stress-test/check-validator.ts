import { ApiPromise, WsProvider } from '@polkadot/api'
import { cryptoWaitReady } from '@polkadot/util-crypto'

async function main() {
  await cryptoWaitReady()

  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({ provider })

  const VALIDATOR_ADDR =
    '5DUg3spiag1bZYBKx2oivCYMrfVwBdLASr2d6BPVSqMPHxuE'

  const { data } = await api.query.system
    .account(VALIDATOR_ADDR) as any

  const free = Number(data.free.toString()) / 1e12
  const reserved = Number(data.reserved.toString()) / 1e12

  console.log('Validator address:', VALIDATOR_ADDR)
  console.log('Free balance:    ', free.toLocaleString(), 'RIZ')
  console.log('Reserved:        ', reserved.toLocaleString(), 'RIZ')

  await api.disconnect()
}

main().catch(console.error)
