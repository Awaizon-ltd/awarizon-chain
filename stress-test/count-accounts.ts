import { ApiPromise, WsProvider } from '@polkadot/api'
import { cryptoWaitReady } from '@polkadot/util-crypto'

async function main() {
  await cryptoWaitReady()
  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({ provider })

  // System account count — built into every Substrate chain
  const accountCount = await api.query.system.account.entries()
  console.log('Total accounts on chain:',
    accountCount.length
  )

  // List all accounts with balances
  for (const [key, data] of accountCount) {
    const address = key.args[0].toString()
    const { free, reserved } = (data as any).data
    const balance = Number(free.toString()) / 1e12
    if (balance > 0) {
      console.log(` ${address}: ${balance.toLocaleString()} RIZ`)
    }
  }

  await api.disconnect()
}

main().catch(console.error)
