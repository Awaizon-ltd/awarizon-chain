import { ApiPromise, WsProvider } from '@polkadot/api'
import { awarizonTypes, awarizonRpc } from '@awarizon/sdk'

async function main() {
  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({
    provider,
    types: awarizonTypes,
    rpc: awarizonRpc,
  })

  // Check total wallets indexed
  const totalWallets = await (api.query as any)
    .awarizonState.totalWallets()
  console.log('Total indexed wallets:', totalWallets.toString())

  // Check total extrinsics
  const totalEx = await (api.query as any)
    .awarizonState.totalExtrinsics()
  console.log('Total extrinsics:', totalEx.toString())

  // Check current block
  const block = await api.rpc.chain.getHeader()
  console.log('Current block:', block.number.toString())

  // Check recent transactions from indexer
  const res = await fetch(
    'https://index.awarizon.com/transactions/recent?limit=10'
  ).then(r => r.json())
  console.log('\nRecent transactions:')
  res.transactions?.forEach((tx: any) => {
    console.log(`  Block ${tx.blockNumber}: ${tx.from?.slice(0,10)}... → ${tx.to?.slice(0,10)}... (${tx.amount})`)
  })

  await api.disconnect()
}

main().catch(console.error)
