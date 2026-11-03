import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'

async function main() {
  await cryptoWaitReady()

  const mnemonic = "bottom drive obey lake curtain smoke basket hold race lonely fit walk//Bob"

  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({ provider })

  const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 })
  const bob = keyring.addFromUri(mnemonic)

  const target = '5EbnHPa3qMEuWC82guj47QnsMWkLxpXTxqnGhPtPguq2CuCK'
  const FIVE_MILLION = 2_000_000n * 1_000_000_000_000n

  console.log(`\nBob address: ${bob.address}`)

  const bobInfo = await api.query.system.account(bob.address)
  console.log(`Bob balance: ${(Number((bobInfo as any).data.free.toString()) / 1e12).toLocaleString()} RIZ`)

  console.log('\nSending RIZ from Bob → Target...')

  await new Promise<void>((resolve, reject) => {
    api.tx.balances.transferKeepAlive(target, FIVE_MILLION)
      .signAndSend(bob, ({ status, dispatchError }: any) => {
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
      .catch(reject)
  })

  const [bobBal, targetBal] = await Promise.all([
    api.query.system.account(bob.address),
    api.query.system.account(target),
  ])

  console.log('\nFinal balances:')
  console.log(`Bob:    ${(Number((bobBal as any).data.free.toString()) / 1e12).toLocaleString()} RIZ`)
  console.log(`Target: ${(Number((targetBal as any).data.free.toString()) / 1e12).toLocaleString()} RIZ`)

  await api.disconnect()
}

main().catch(console.error)