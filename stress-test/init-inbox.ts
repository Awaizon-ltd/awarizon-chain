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

  console.log('Sudo:', sudo.address)

  // Check engagement pool balance
  const ENGAGEMENT_POOL =
    '5EYCAe5fjKE6pfjGSv4eX73q23oxgyrnzK3d3WD7M7SUbjGe'
  const { data } = await api.query.system
    .account(ENGAGEMENT_POOL) as any
  const balance = Number(data.free.toString()) / 1e12
  console.log('Engagement pool balance:', balance.toLocaleString(), 'RIZ')

  // Check current inbox reserve balance counter
  const reserveBal = await (api.query as any)
    .awarizonState.inboxStateReserveBalance()
  console.log('Inbox reserve counter:', 
    (Number(reserveBal.toString()) / 1e12).toLocaleString(), 'RIZ'
  )

  // Use sudo to set the storage value directly
  // This syncs the counter with actual balance
  const INIT_AMOUNT = 200_000_000n * 1_000_000_000_000n

  console.log('\nInitializing inbox reserve balance...')

  await new Promise<void>((resolve, reject) => {
    api.tx.sudo.sudo(
      api.tx.system.setStorage([
        [
          // Storage key for InboxStateReserveBalance
          // pallet prefix + storage item key
          api.query.awarizonState
            .inboxStateReserveBalance.key(),
          // SCALE encode u128 value
          api.createType('u128', INIT_AMOUNT)
            .toHex(),
        ]
      ])
    ).signAndSend(sudo, ({ status, dispatchError }: any) => {
      if (dispatchError) {
        reject(new Error(dispatchError.toString()))
        return
      }
      if (status.isInBlock) {
        console.log('✓ In block:', status.asInBlock.toHex())
      }
      if (status.isFinalized) {
        console.log('✓ Inbox reserve initialized!')
        resolve()
      }
    })
  })

  // Verify
  const newBal = await (api.query as any)
    .awarizonState.inboxStateReserveBalance()
  console.log('\nNew inbox reserve counter:',
    (Number(newBal.toString()) / 1e12).toLocaleString(), 'RIZ'
  )

  await api.disconnect()
}

main().catch(console.error)
