import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'

async function main() {
  await cryptoWaitReady()
  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({ provider })

  const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 })

  const accounts = [
    { name: 'Bob',       uri: '//Bob' },
    { name: 'Alice',     uri: '//Alice' },
    { name: 'Target',    address: '5EbnHPa3qMEuWC82guj47QnsMWkLxpXTxqnGhPtPGuq2CuCK' },
  ]

  console.log('\nBalances on wss://rpc.awarizon.com\n')

  for (const acc of accounts) {
    const address = acc.address
      ?? keyring.addFromUri(acc.uri!).address
    const { data } = await api.query.system.account(address)
    const free = Number(data.free.toString()) / 1e12
    console.log(
      `${acc.name.padEnd(10)} ${address}`)
    console.log(
      `           ${free.toLocaleString()} RIZ\n`
    )
  }

  await api.disconnect()
}

main().catch(console.error)
