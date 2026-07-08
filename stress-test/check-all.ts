import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { blake2AsHex } from '@polkadot/util-crypto'

async function main() {
  await cryptoWaitReady()

  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({ provider })

  const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 })

  // All known accounts
  const accounts = [
    { name: 'Alice',              address: keyring.addFromUri('//Alice').address },
    { name: 'Bob',                address: keyring.addFromUri('//Bob').address },
    { name: 'Target',             address: '5EbnHPa3qMEuWC82guj47QnsMWkLxpXTxqnGhPtPguq2CuCK' },
    { name: 'engagement_pool',    address: '5EYCAe5ijiYfyeZ2JJCGq56LmPyNRAKacUndocRDGmrtNkKX' },
    { name: 'validator_rewards',  address: keyring.addFromSeed(
        Buffer.from(blake2AsHex(Buffer.from('validator_rewards')).slice(2), 'hex')
      ).address },
    { name: 'developer_fund',     address: keyring.addFromSeed(
        Buffer.from(blake2AsHex(Buffer.from('developer_fund')).slice(2), 'hex')
      ).address },
    { name: 'foundation_reserve', address: keyring.addFromSeed(
        Buffer.from(blake2AsHex(Buffer.from('foundation_reserve')).slice(2), 'hex')
      ).address },
    { name: 'community_sale',     address: keyring.addFromSeed(
        Buffer.from(blake2AsHex(Buffer.from('community_sale')).slice(2), 'hex')
      ).address },
  ]

  // Also check PalletId accounts
  const { PalletId } = await import('@polkadot/types')

  console.log('\n=== ALL ACCOUNT BALANCES ===\n')

  for (const acc of accounts) {
    try {
      const { data } = await api.query.system.account(
        acc.address
      ) as any
      const free = Number(data.free.toString()) / 1e12
      const reserved = Number(data.reserved.toString()) / 1e12
      console.log(`${acc.name.padEnd(22)} ${acc.address}`)
      console.log(`  Free: ${free.toLocaleString()} RIZ  Reserved: ${reserved.toLocaleString()} RIZ\n`)
    } catch (e: any) {
      console.log(`${acc.name}: ERROR — ${e.message}\n`)
    }
  }

  // Check total issuance
  const totalIssuance = await api.query.totalIssuance?.() 
    ?? await (api.query.balances as any).totalIssuance()
  console.log(`\nTotal Issuance: ${(Number(totalIssuance.toString()) / 1e12).toLocaleString()} RIZ`)

  await api.disconnect()
}

main().catch(console.error)
