import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { ApiPromise, WsProvider } from '@polkadot/api'

async function main() {
  await cryptoWaitReady()

  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({ provider })
  await api.isReady

  const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 })

  const accounts = [
    { name: 'Alice',   uri: '//Alice' },
    { name: 'Bob',     uri: '//Bob' },
    { name: 'Charlie', uri: '//Charlie' },
    { name: 'Dave',    uri: '//Dave' },
    { name: 'Eve',     uri: '//Eve' },
    { name: 'Ferdie',  uri: '//Ferdie' },
  ]

  console.log('\nChecking test account balances on VPS...\n')

  for (const acc of accounts) {
    const pair = keyring.addFromUri(acc.uri)
    const { data } = await api.query.system.account(pair.address)
    const free = BigInt(data.free.toString())
    const riz = Number(free) / 1e12
    console.log(
      `${acc.name.padEnd(8)} ${pair.address}  ${riz.toLocaleString()} RIZ`
    )
  }

  await api.disconnect()
}

main().catch(console.error)
