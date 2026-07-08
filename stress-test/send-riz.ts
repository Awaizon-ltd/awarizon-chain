import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'

async function main() {
  await cryptoWaitReady()

  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({ provider })

  const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 })

  // Alice has sudo rights
  const alice = keyring.addFromUri('//Alice')

  const target = '5EbnHPa3qMEuWC82guj47QnsMWkLxpXTxqnGhPtPguq2CuCK'
  const bob    = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'

  const FIVE_MILLION = 5_000_000n * 1_000_000_000_000n

  console.log('\nSending 5,000,000 RIZ from Bob → Target...')

  // Use sudo forceTransfer to move from Bob to Target
  await new Promise<void>((resolve, reject) => {
    api.tx.sudo.sudo(
      api.tx.balances.forceTransfer(
        bob,
        target,
        FIVE_MILLION
      )
    ).signAndSend(alice, ({ status, dispatchError }: any) => {
      if (dispatchError) {
        reject(new Error(dispatchError.toString()))
        return
      }
      if (status.isInBlock) {
        console.log(`✓ Included in block: ${status.asInBlock.toHex()}`)
      }
      if (status.isFinalized) {
        console.log(`✓ Finalized: ${status.asFinalized.toHex()}`)
        resolve()
      }
    })
  })

  // Confirm balances
  const [bobBal, targetBal] = await Promise.all([
    api.query.system.account(bob),
    api.query.system.account(target),
  ])

  console.log('\nFinal balances:')
  console.log(`Bob:    ${(Number((bobBal as any).data.free.toString()) / 1e12).toLocaleString()} RIZ`)
  console.log(`Target: ${(Number((targetBal as any).data.free.toString()) / 1e12).toLocaleString()} RIZ`)

  await api.disconnect()
}

main().catch(console.error)
