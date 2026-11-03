import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { u8aToHex } from '@polkadot/util'
import { xxhashAsHex } from '@polkadot/util-crypto'

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

  const AMOUNT = 200_000_000n * 1_000_000_000_000n

  // Build storage key manually
  // xxhash128(pallet) + xxhash128(storage item)
  const palletHash = xxhashAsHex('AwarizonState', 128)
  const itemHash = xxhashAsHex('InboxStateReserveBalance', 128)
  const storageKey = palletHash + itemHash.slice(2)
  console.log('Storage key:', storageKey)

  // SCALE encode u128 as little-endian 16 bytes
  const encodedValue = u8aToHex(
    api.createType('u128', AMOUNT).toU8a()
  )
  console.log('Encoded value:', encodedValue)
  console.log('Amount:', (Number(AMOUNT) / 1e12)
    .toLocaleString(), 'RIZ')

  console.log('\nSetting inbox reserve to 200M RIZ...')

  await new Promise<void>((resolve, reject) => {
    api.tx.sudo.sudo(
      api.tx.system.setStorage([
        [storageKey, encodedValue]
      ])
    ).signAndSend(sudo, ({ status, dispatchError }: any) => {
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
        console.log('✓ Fixed!')
        resolve()
      }
    })
  })

  const newBal = await (api.query as any)
    .awarizonState.inboxStateReserveBalance()
  console.log('New inbox reserve:',
    (Number(newBal.toString()) / 1e12)
      .toLocaleString(), 'RIZ'
  )

  await api.disconnect()
}

main().catch(console.error)
