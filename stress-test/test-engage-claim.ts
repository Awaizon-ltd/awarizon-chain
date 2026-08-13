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

  // Get Alice inbox records
  const inbox = await (api.query as any)
    .awarizonState.inboxRecords
    .entries(alice.address)

  const [key, record] = inbox[0]
  const recordData = record.toHuman() as any
  const recordId = key.args[1]

  console.log('Record status:', recordData.status)

  const { data: before } = await api.query.system
    .account(alice.address) as any
  console.log('Balance before:',
    (Number(before.free.toString()) / 1e12)
      .toLocaleString(), 'RIZ'
  )

  // Submit engagement with required args
  console.log('\nSubmitting engagement...')
  await new Promise<void>((resolve, reject) => {
    api.tx.awarizonState
      .submitEngagement(
        recordId,
        120,  // session_duration_seconds (2 min)
        5,    // interaction_count
      )
      .signAndSend(alice, ({
        status, dispatchError
      }: any) => {
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
      .signAndSend(alice, ({
        status, dispatchError
      }: any) => {
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

  // Check balance after
  const { data: after } = await api.query.system
    .account(alice.address) as any
  const earned = BigInt(after.free.toString())
    - BigInt(before.free.toString())

  console.log('\nBalance after:',
    (Number(after.free.toString()) / 1e12)
      .toLocaleString(), 'RIZ'
  )
  console.log('Earned:',
    (Number(earned) / 1e12).toLocaleString(), 'RIZ'
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
