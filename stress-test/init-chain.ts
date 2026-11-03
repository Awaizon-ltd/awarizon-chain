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

  // Use your SUDO key mnemonic here
  const sudo = keyring.addFromMnemonic(
    'dune sting east ribbon sting novel inject fatigue quick obscure labor parrot'
  )

  console.log('Sudo address:', sudo.address)
  console.log('Expected:    5HWFP9YGGYPmjEBrxpjLdtCLf2GD9CC36B5ABpc5GLZkWvRf')

  // Init yield reserve
  console.log('\nInitializing yield reserve...')
  await new Promise<void>((resolve, reject) => {
    api.tx.sudo.sudo(
      (api.tx as any).awarizonConsensus.initYieldReserve()
    ).signAndSend(sudo, ({ status, dispatchError }: any) => {
      if (dispatchError) {
        reject(new Error(dispatchError.toString()))
        return
      }
      if (status.isInBlock) {
        console.log('✓ In block')
      }
      if (status.isFinalized) {
        console.log('✓ Yield reserve initialized')
        resolve()
      }
    })
  })

  // Verify all genesis balances
  const accounts = [
    { name: 'engagement_pool',
      addr: '5EYCAe5fjKE6pfjGSv4eX73q23oxgyrnzK3d3WD7M7SUbjGe' },
    { name: 'yield_reserve',
      addr: '5EYCAe5j8FJAda9JGQP2DJ4yfqLkMahm4zxp4kAwhXjBxmf9' },
    { name: 'developer_fund',
      addr: '5GZYw9G5JfUEhtYdhzhGGNNR2CJPeaz5XzJBXQE5nui7WjLk' },
    { name: 'foundation_reserve',
      addr: '5HAkEcsXaFXp684zYeDfUmo6DXuh4CZmZDZbX51rr44bdCfW' },
    { name: 'community_sale',
      addr: '5HX99ALuQauzF3F7sEPTbSnNdsVSeFLcZrBH4B4z9PXJrAvf' },
    { name: 'team_allocation',
      addr: '5D8FrczoJzXc6zuvcVwSthVxy4uNxoiCV4zhz33wkyhZSaEN' },
    { name: 'advisor_pool',
      addr: '5EUQgpFXdvRXErFHBxpD8Cw6gpzPoEptQwJkxzmanj4xgnCR' },
    { name: 'liquidity_reserve',
      addr: '5DiLjnqpUzRihsxqy4jVLxRW1LiqsqWxkVEZDw12VgufE6Vb' },
    { name: 'airdrop_pool',
      addr: '5DT2m6tNtwdhMhSVqEEcPPHqiux3dQ3FZQK9Fca3ujKhdweX' },
    { name: 'Bob (faucet)',
      addr: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' },
    { name: 'Sudo key',
      addr: '5HWFP9YGGYPmjEBrxpjLdtCLf2GD9CC36B5ABpc5GLZkWvRf' },
  ]

  console.log('\n=== GENESIS BALANCES ===\n')
  let total = 0n

  for (const acc of accounts) {
    const { data } = await api.query.system
      .account(acc.addr) as any
    const free = BigInt(data.free.toString())
    const frozen = BigInt(data.frozen.toString())
    total += free
    console.log(
      `${acc.name.padEnd(20)} ` +
      `${(Number(free)/1e12).toLocaleString().padStart(20)} RIZ` +
      (frozen > 0n
        ? ` (frozen: ${(Number(frozen)/1e12).toLocaleString()} RIZ)`
        : '')
    )
  }

  console.log('\n' + '─'.repeat(60))
  console.log(
    `${'TOTAL'.padEnd(20)} ` +
    `${(Number(total)/1e12).toLocaleString().padStart(20)} RIZ`
  )

  await api.disconnect()
}

main().catch(console.error)
