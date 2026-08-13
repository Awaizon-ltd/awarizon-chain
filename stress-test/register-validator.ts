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

  const validator = keyring.addFromMnemonic(
    'answer chuckle census gaze sand fancy giant act dance rhythm budget bamboo'
  )

  console.log('Registering validator:', validator.address)

  // Region codes:
  //   0x04 = AFRICA
  // Country codes (custom u8):
  //   1 = Nigeria (first African country in system)
  // Self stake: 50,000 RIZ
  const SELF_STAKE = 100_000n * 1_000_000_000_000n

  await new Promise<void>((resolve, reject) => {
    api.tx.awarizonConsensus
      .registerValidator(
        SELF_STAKE, // selfStake: 1,000 RIZ
        0x04,       // regionCode: AFRICA
        1,          // countryCode: Nigeria = 1
      )
      .signAndSend(
        validator,
        ({ status, dispatchError }: any) => {
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
            console.log('✓ In block:',
              status.asInBlock.toHex()
            )
          }
          if (status.isFinalized) {
            console.log('✓ Validator registered!')
            resolve()
          }
        }
      )
  })

  // Verify
  const result = await (api.rpc as any)
    .awarizon.getActiveValidators()
  console.log('\nActive validators:',
    JSON.stringify(result.toJSON(), null, 2)
  )

  await api.disconnect()
}

main().catch(console.error)
