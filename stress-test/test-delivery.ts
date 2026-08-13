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

  // Use Alice as test recipient
  const alice = keyring.addFromUri('//Alice')
  console.log('Test recipient (Alice):', alice.address)

  // Check Alice balance before
  const { data: before } = await api.query.system
    .account(alice.address) as any
  console.log('Balance before:',
    (Number(before.free.toString()) / 1e12)
      .toLocaleString(), 'RIZ'
  )

  // Campaign ID from chain state
  const CAMPAIGN_ID =
    '0x210bdfc96bfffbb0a8703399c49a777e4114b9db1b27ec970000019f4e42022e'

  // Developer delivers to Alice inbox
  // Need developer key for this
  const developer = keyring.addFromMnemonic(
    'drastic nurse truck shell hard vapor battle wild soccer solve awful dutch'
  )

  console.log('\nDelivering to Alice inbox...')
  const recordId = new Uint8Array(32)
  crypto.getRandomValues(recordId)

  await new Promise<void>((resolve, reject) => {
    api.tx.awarizonState
      .deliverToInbox(
        alice.address,
        Array.from(
          Buffer.from(CAMPAIGN_ID.slice(2), 'hex')
        ),
        Array.from(recordId),
      )
      .signAndSend(developer, ({
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
        if (status.isInBlock) {
          console.log('✓ Delivered in block:',
            status.asInBlock.toHex()
          )
        }
        if (status.isFinalized) {
          console.log('✓ Delivery finalized!')
          resolve()
        }
      })
  })

  // Check Alice inbox
  const inbox = await (api.query as any)
    .awarizonState.inboxRecords
    .entries(alice.address)
  console.log('\nAlice inbox records:', inbox.length)

  await api.disconnect()
}

main().catch(console.error)
