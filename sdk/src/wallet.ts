import { Keyring } from '@polkadot/keyring'
import type { KeyringPair } from '@polkadot/keyring/types'
import { ApiPromise } from '@polkadot/api'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { ISubmittableResult } from '@polkadot/types/types'
import { parseChainError } from './errors'

// Create a Keyring instance for sr25519 (Substrate default)
export function createKeyring(): Keyring {
  return new Keyring({ type: 'sr25519' })
}

// Load a keypair from a mnemonic (BIP39)
export function keypairFromMnemonic(mnemonic: string): KeyringPair {
  const keyring = createKeyring()
  return keyring.addFromMnemonic(mnemonic)
}

// Load a keypair from a seed hex (0x...)
export function keypairFromSeed(seed: string): KeyringPair {
  const keyring = createKeyring()
  return keyring.addFromSeed(Buffer.from(seed.replace('0x', ''), 'hex'))
}

// Dev/test keypairs (only available on --dev chains)
export function aliceKeypair(): KeyringPair {
  const keyring = createKeyring()
  return keyring.addFromUri('//Alice')
}

export function bobKeypair(): KeyringPair {
  const keyring = createKeyring()
  return keyring.addFromUri('//Bob')
}

// Sign and submit an extrinsic, returning the final status
export async function signAndSend(
  api: ApiPromise,
  extrinsic: SubmittableExtrinsic<'promise', ISubmittableResult>,
  signer: KeyringPair
): Promise<{ blockHash: string; txHash: string; blockNumber: number }> {
  return new Promise((resolve, reject) => {
    extrinsic
      .signAndSend(signer, ({ status, dispatchError }: ISubmittableResult) => {
        if (status.isInBlock || status.isFinalized) {
          if (dispatchError) {
            reject(parseChainError(dispatchError.toString()))
          } else {
            const blockHash = status.isInBlock
              ? status.asInBlock.toHex()
              : status.asFinalized.toHex()
            const txHash = extrinsic.hash.toHex()
            api.rpc.chain.getHeader(blockHash)
              .then(header => resolve({ blockHash, txHash, blockNumber: header.number.toNumber() }))
              .catch(() => resolve({ blockHash, txHash, blockNumber: 0 }))
          }
        }
      })
      .catch(reject)
  })
}
