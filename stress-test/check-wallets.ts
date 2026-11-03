import { ApiPromise, WsProvider } from '@polkadot/api'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import fs from 'fs/promises'

async function main() {
  await cryptoWaitReady()

  const data = await fs.readFile('./data/wallets.json', 'utf8')
  const wallets = JSON.parse(data)

  console.log(`Total wallets in file: ${wallets.length}`)
  console.log(`Funded flag true: ${wallets.filter((w: any) => w.funded).length}`)

  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({ provider })
  await api.isReady

  console.log('\nChecking first 10 wallet balances on chain...\n')

  let funded = 0
  let empty = 0

  for (let i = 0; i < Math.min(10, wallets.length); i++) {
    const w = wallets[i]
    const { data: bal } = await api.query.system.account(w.address)
    const free = Number(bal.free.toString()) / 1e12
    console.log(`  [${i}] ${w.address.slice(0,12)}...  ${free.toFixed(4)} RIZ  funded=${w.funded}`)
    if (free > 0) funded++
    else empty++
  }

  // Also spot check a few from middle and end
  console.log('\nSpot checking middle wallets...\n')
  for (const i of [100, 500, 999]) {
    if (i >= wallets.length) continue
    const w = wallets[i]
    const { data: bal } = await api.query.system.account(w.address)
    const free = Number(bal.free.toString()) / 1e12
    console.log(`  [${i}] ${w.address.slice(0,12)}...  ${free.toFixed(4)} RIZ  funded=${w.funded}`)
    if (free > 0) funded++
    else empty++
  }

  console.log(`\nOf checked wallets: ${funded} have balance, ${empty} are empty`)

  await api.disconnect()
}

main().catch(console.error)
