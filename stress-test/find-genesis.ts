import { ApiPromise, WsProvider } from '@polkadot/api'
import { cryptoWaitReady, blake2AsU8a } from '@polkadot/util-crypto'
import { encodeAddress } from '@polkadot/util-crypto'
import { PalletId } from '@polkadot/types'
import { u8aToHex } from '@polkadot/util'

async function main() {
  await cryptoWaitReady()

  const provider = new WsProvider('wss://rpc.awarizon.com')
  const api = await ApiPromise.create({ provider })

  // Derive addresses exactly as genesis_config_presets.rs does:
  // fn awarizon_account(seed: &[u8]) -> AccountId {
  //     blake2_256(seed).into()
  // }
  // This means the 32-byte blake2_256 hash IS the AccountId directly
  // NOT a keypair seed

  const seeds = [
    'validator_rewards',
    'developer_fund',
    'foundation_reserve',
    'community_sale',
  ]

  console.log('\n=== GENESIS ACCOUNT ADDRESSES ===\n')
  console.log('(derived as blake2_256(seed).into() — raw AccountId)\n')

  for (const seed of seeds) {
    // blake2_256 of the seed bytes = 32 byte AccountId
    const accountId = blake2AsU8a(
      Buffer.from(seed, 'utf8'),
      256
    )
    const address = encodeAddress(accountId, 42)
    console.log(`${seed}:`)
    console.log(`  AccountId hex: ${u8aToHex(accountId)}`)
    console.log(`  SS58 address:  ${address}`)

    // Check balance
    const { data } = await api.query.system
      .account(address) as any
    const free = Number(data.free.toString()) / 1e12
    const frozen = Number(data.frozen.toString()) / 1e12
    console.log(`  Free:   ${free.toLocaleString()} RIZ`)
    console.log(`  Frozen: ${frozen.toLocaleString()} RIZ\n`)
  }

  // Also check the PalletId accounts from new genesis
  // PalletId(*b"riz/vldr") — yield reserve
  // PalletId(*b"riz/fees") — fee pool
  // PalletId(*b"riz/insr") — insurance
  const palletIds = [
    { name: 'riz/vldr (yield reserve)', id: 'riz/vldr' },
    { name: 'riz/fees (fee pool)',       id: 'riz/fees' },
    { name: 'riz/insr (insurance)',      id: 'riz/insr' },
    { name: 'awz/engp (engagement)',     id: 'awz/engp' },
  ]

  console.log('=== PALLET ACCOUNTS ===\n')

  for (const p of palletIds) {
    // PalletId is 8 bytes, into_account_truncating
    // pads to 32 bytes with b"modl" prefix
    const encoder = new TextEncoder()
    const idBytes = encoder.encode(p.id)
    // modl + palletId (8 bytes) + 00...00 padding to 32 bytes
    const prefix = encoder.encode('modl')
    const accountBytes = new Uint8Array(32)
    accountBytes.set(prefix)           // bytes 0-3
    accountBytes.set(idBytes, 4)       // bytes 4-11
    // rest is zeros (padding)

    const address = encodeAddress(accountBytes, 42)
    console.log(`${p.name}:`)
    console.log(`  SS58: ${address}`)

    try {
      const { data } = await api.query.system
        .account(address) as any
      const free = Number(data.free.toString()) / 1e12
      const frozen = Number(data.frozen.toString()) / 1e12
      console.log(`  Free:   ${free.toLocaleString()} RIZ`)
      console.log(`  Frozen: ${frozen.toLocaleString()} RIZ\n`)
    } catch {
      console.log(`  ERROR reading balance\n`)
    }
  }

  // Total issuance
  const total = await (api.query.balances as any)
    .totalIssuance()
  console.log(
    `Total Issuance: ${(
      Number(total.toString()) / 1e12
    ).toLocaleString()} RIZ`
  )

  await api.disconnect()
}

main().catch(console.error)
