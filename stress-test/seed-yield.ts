import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'

async function main() {
  await cryptoWaitReady()

  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({ provider })

  const keyring = new Keyring({
    type: 'sr25519', ss58Format: 42
  })
  const alice = keyring.addFromUri('//Alice')

  // Old validator_rewards blake2_256 account
  const FROM =
    '5DXcoszdnLMB2YtivAYB6f2BhEHHrrwrCkWB6y6o2kB7euma'

  // New PalletId yield reserve account
  const TO =
    '5EYCAe5j8FJAda9JGQP2DJ4yfqLkMahm4zxp4kAwhXjBxmf9'

  // Move 250M RIZ
  const AMOUNT = 250_000_000n * 1_000_000_000_000n

  console.log('Seeding yield reserve...')
  console.log(`From: ${FROM}`)
  console.log(`To:   ${TO}`)
  console.log(`Amount: 250,000,000 RIZ`)

  await new Promise<void>((resolve, reject) => {
    api.tx.sudo.sudo(
      api.tx.balances.forceTransfer(FROM, TO, AMOUNT)
    ).signAndSend(alice, ({ status, dispatchError }: any) => {
      if (dispatchError) {
        reject(new Error(dispatchError.toString()))
        return
      }
      if (status.isInBlock) {
        console.log(`✓ In block: ${status.asInBlock.toHex()}`)
      }
      if (status.isFinalized) {
        console.log(`✓ Finalized`)
        resolve()
      }
    })
  })

  // Verify
  const { data: yieldBal } =
    await api.query.system.account(TO) as any
  console.log(
    `\nYield reserve balance: ${
      (Number(yieldBal.free.toString()) / 1e12)
        .toLocaleString()
    } RIZ`
  )

  // Also call init_yield_reserve via sudo
  console.log('\nInitializing yield reserve storage...')
  await new Promise<void>((resolve, reject) => {
    api.tx.sudo.sudo(
      (api.tx as any).awarizonConsensus
        .initYieldReserve()
    ).signAndSend(alice, ({ status, dispatchError }: any) => {
      if (dispatchError) {
        reject(new Error(dispatchError.toString()))
        return
      }
      if (status.isFinalized) {
        console.log('✓ YieldReserveRemaining initialized')
        resolve()
      }
    })
  })

  await api.disconnect()
}

main().catch(console.error)
