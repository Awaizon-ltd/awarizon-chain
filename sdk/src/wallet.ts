import type { ApiPromise } from '@polkadot/api'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { ISubmittableResult, Signer, SignerResult } from '@polkadot/types/types'
import { blake2AsU8a } from '@polkadot/util-crypto'
import { u8aToHex } from '@polkadot/util'
import { getBytes, keccak256, SigningKey, Wallet as EthersWallet } from 'ethers'
import { parseChainError } from './errors'

// Accounts are H160/AccountId20 now (the chain's AccountId32 -> H160
// hard-reset migration) — signing is ECDSA/keccak256 (Ethereum's scheme),
// not sr25519. `createKeyring`/`keypairFromMnemonic`/`keypairFromSeed`/
// `aliceKeypair`/`bobKeypair` (sr25519 `@polkadot/keyring`) are gone;
// an `EvmSigner` wraps an ethers `SigningKey` instead, matching how
// `fp_account::EthereumSigner` derives/verifies accounts on-chain.
export interface EvmSigner {
  address: string
  signingKey: SigningKey
}

// Create a signer from a raw private key (0x-prefixed, 32 bytes).
export function signerFromPrivateKey(privateKey: string): EvmSigner {
  const wallet = new EthersWallet(privateKey)
  return { address: wallet.address, signingKey: wallet.signingKey }
}

// Create a signer from a BIP39 mnemonic.
export function signerFromMnemonic(mnemonic: string): EvmSigner {
  const wallet = EthersWallet.fromPhrase(mnemonic)
  return { address: wallet.address, signingKey: wallet.signingKey }
}

// Alith — well-known Moonbeam/Frontier dev test account, funded by this
// runtime's --dev/--local genesis presets (runtime/src/genesis_config_presets.rs,
// same key already used and verified this session for a real signed
// transfer). Public test data, not a secret. Deliberately the only
// well-known dev signer included here — add others once their private
// keys are independently verified; a wrong one would silently derive a
// signer for the wrong address rather than failing loudly.
export function alithSigner(): EvmSigner {
  return signerFromPrivateKey('0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133')
}

/**
 * Signs raw bytes the way this runtime's `fp_account::EthereumSignature`
 * verifies them: `secp256k1_ecdsa_recover(sig, keccak_256(msg))`, where
 * `msg` is whatever bytes `Signature::verify` actually receives. Per
 * `sp_runtime`'s generic (signature-scheme-independent) extrinsic
 * `Checkable` logic, that's the payload itself when <= 256 bytes, or
 * blake2-256(payload) when longer — never the raw payload once it's long,
 * regardless of signature scheme. Mirrors node/src/benchmarking.rs's
 * `create_benchmark_extrinsic`, generalized for the long-payload case that
 * a simple bench extrinsic never hits but a real dApp call might.
 */
function signSubstrateBytes(signer: EvmSigner, payload: Uint8Array): Uint8Array {
  const toHash = payload.length > 256 ? blake2AsU8a(payload, 256) : payload
  const digest = keccak256(toHash)
  const sig = signer.signingKey.sign(digest)
  // 65-byte [R(32) | S(32) | V(1)] — same layout sp_core::ecdsa::Signature
  // (which fp_account::EthereumSignature wraps) expects. ethers' `.v` is
  // 27/28 (Ethereum's legacy-offset convention); Substrate's ecdsa
  // signature format expects the raw recovery id (0/1), so subtract 27.
  const v = sig.v - 27
  return getBytes(sig.r + sig.s.slice(2) + v.toString(16).padStart(2, '0'))
}

// A `Signer` implementation `@polkadot/api`'s normal `.signAndSend()` flow
// accepts in place of a KeyringPair — the same interface browser
// extensions (Polkadot{.js}, Talisman) implement for injected signing,
// just backed by an ethers SigningKey here instead.
function makeSigner(api: ApiPromise, signer: EvmSigner): Signer {
  let id = 0
  return {
    async signPayload(payload): Promise<SignerResult> {
      const extrinsicPayload = api.registry.createType('ExtrinsicPayload', payload, {
        version: payload.version,
      })
      const payloadBytes = extrinsicPayload.toU8a(true)
      const signature = signSubstrateBytes(signer, payloadBytes)
      return { id: ++id, signature: u8aToHex(signature) }
    },
  }
}

// Sign and submit an extrinsic, returning the final status. `signer` is an
// EvmSigner (ECDSA/H160) now, not a sr25519 KeyringPair.
export async function signAndSend(
  api: ApiPromise,
  extrinsic: SubmittableExtrinsic<'promise', ISubmittableResult>,
  signer: EvmSigner
): Promise<{ blockHash: string; txHash: string; blockNumber: number }> {
  const polkadotSigner = makeSigner(api, signer)
  return new Promise((resolve, reject) => {
    extrinsic
      .signAndSend(
        signer.address,
        { signer: polkadotSigner },
        ({ status, dispatchError }: ISubmittableResult) => {
          if (status.isInBlock || status.isFinalized) {
            if (dispatchError) {
              reject(parseChainError(dispatchError.toString()))
            } else {
              const blockHash = status.isInBlock
                ? status.asInBlock.toHex()
                : status.asFinalized.toHex()
              const txHash = extrinsic.hash.toHex()
              api.rpc.chain
                .getHeader(blockHash)
                .then((header) => resolve({ blockHash, txHash, blockNumber: header.number.toNumber() }))
                .catch(() => resolve({ blockHash, txHash, blockNumber: 0 }))
            }
          }
        }
      )
      .catch(reject)
  })
}
