import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import * as fs from 'fs'

async function main() {
  await cryptoWaitReady()

  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({ provider })

  const keyring = new Keyring({ type: 'sr25519' })
  const sudo = keyring.addFromMnemonic(
    'dune sting east ribbon sting novel inject fatigue quick obscure labor parrot'
  )

  console.log('Sudo:', sudo.address)
  console.log('Current spec version:',
    api.runtimeVersion.specVersion.toString()
  )

  // Read the new WASM runtime
  const wasm = fs.readFileSync(
    '/home/user/awarizon-chain/target/release/wbuild/' +
    'solochain-template-runtime/' +
    'solochain_template_runtime.compact.compressed.wasm'
  )

  console.log('WASM size:', wasm.length, 'bytes')
  console.log('Submitting runtime upgrade...')

  await new Promise<void>((resolve, reject) => {
    api.tx.sudo.sudoUncheckedWeight(
      api.tx.system.setCode(`0x${wasm.toString('hex')}`),
      { refTime: 0, proofSize: 0 }
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
      if (status.isInBlock) {
        console.log('✓ In block:', status.asInBlock.toHex())
      }
      if (status.isFinalized) {
        console.log('✓ Runtime upgrade finalized!')
        resolve()
      }
    })
  })

  // Verify new spec version
  await new Promise(r => setTimeout(r, 3000))
  const newVersion = await api.rpc.state.getRuntimeVersion()
  console.log('New spec version:',
    newVersion.specVersion.toString()
  )

  await api.disconnect()
}

main().catch(console.error)
