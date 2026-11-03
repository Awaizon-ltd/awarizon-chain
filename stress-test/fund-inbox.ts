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

  // Use sudo key mnemonic
  const sudo = keyring.addFromMnemonic(
    'dune sting east ribbon sting novel inject fatigue quick obscure labor parrot'
  )

  // Get inbox reserve account
  const inboxReserve = await (api.query as any)
    .awarizonState.inboxStateReserveAccount?.() 

  // Check storage key for inbox reserve account
  console.log('Checking inbox reserve account...')

  // Get the account from pallet config
  // It is a PalletId-derived account
  const FUND_AMOUNT = 10_000_000n * 1_000_000_000_000n
  // 10M RIZ

  // Get inbox reserve address from custom RPC
  const networkStats = await (api.rpc as any)
    .awarizon.getNetworkStats()
  console.log('Network stats:', networkStats.toHuman())

  await api.disconnect()
}

main().catch(console.error)
