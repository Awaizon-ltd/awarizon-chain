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

  const sudo = keyring.addFromMnemonic(
    'dune sting east ribbon sting novel inject fatigue quick obscure labor parrot'
  )
  const alice = keyring.addFromUri('//Alice')

  console.log('Alice:', alice.address)

  // Fund Alice with 10 RIZ for fees
  console.log('Funding Alice...')
  await new Promise<void>((resolve, reject) => {
    api.tx.balances
      .transferKeepAlive(
        alice.address,
        10_000_000_000_000n // 10 RIZ
      )
      .signAndSend(sudo, ({ status, dispatchError }: any) => {
        if (dispatchError) {
          reject(new Error(dispatchError.toString()))
          return
        }
        if (status.isFinalized) {
          console.log('✓ Alice funded with 10 RIZ')
          resolve()
        }
      })
  })

  // Get inbox record
  const inbox = await (api.query as any)
    .awarizonState.inboxRecords
    .entries(alice.address)

  if (inbox.length === 0) {
    console.log('No inbox records — run test-delivery.ts first')
    await api.disconnect()
    return
  }

  const [key] = inbox[0]
  const recordId = key.args[1]

  // Submit engagement
  console.log('\nSubmitting engagement...')
  await new Promise<void>((resolve, reject) => {
    api.tx.awarizonState
      .submitEngagement(recordId, 120, 5)
      .signAndSend(alice, ({ status, dispatchError }: any) => {
        if (dispatchError) {
          const err = dispatchError.isModule
            ? api.registry.findMetaError(
                dispatchError.asModule
              ).name
            : dispatchError.toString()
          reject(new Error(err))
          return
        }
        if (status.isFinalized) {
          console.log('✓ Engagement submitted!')
          resolve()
        }
      })
  })

  // Claim reward
  console.log('\nClaiming reward...')
  await new Promise<void>((resolve, reject) => {
    api.tx.awarizonState
      .claimReward(recordId)
      .signAndSend(alice, ({ status, dispatchError }: any) => {
        if (dispatchError) {
          const err = dispatchError.isModule
            ? api.registry.findMetaError(
                dispatchError.asModule
              ).name
            : dispatchError.toString()
          reject(new Error(err))
          return
        }
        if (status.isFinalized) {
          console.log('✓ Reward claimed!')
          resolve()
        }
      })
  })

  // Final balance
  const { data } = await api.query.system
    .account(alice.address) as any
  console.log('\nAlice final balance:',
    (Number(data.free.toString()) / 1e12)
      .toLocaleString(), 'RIZ'
  )

  const reserve = await (api.query as any)
    .awarizonState.inboxStateReserveBalance()
  console.log('Inbox reserve remaining:',
    (Number(reserve.toString()) / 1e12)
      .toLocaleString(), 'RIZ'
  )

  await api.disconnect()
}

main().catch(console.error)
