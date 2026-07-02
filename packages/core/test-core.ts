import { createCore, parseAmount, formatAmount } from './src/index'

async function main() {
  console.log('Connecting to Awarizon node...')

  const core = await createCore({
    endpoint: 'ws://127.0.0.1:9944',
  })

  console.log('Connected. Testing modules...')

  // Test keyring
  const wallet = core.keyring.generate()
  console.log('Generated wallet:', wallet.address)
  console.log('Mnemonic word count:', wallet.mnemonic.split(' ').length)

  // Test mnemonic validation
  const valid = core.keyring.validate(wallet.mnemonic)
  console.log('Mnemonic valid:', valid)

  // Test encryption/decryption roundtrip
  const pair = core.keyring.fromMnemonic(wallet.mnemonic)
  const encrypted = core.keyring.encrypt(pair, 'testpass123')
  const decrypted = core.keyring.decrypt(encrypted, 'testpass123')
  console.log('Encrypt/decrypt works:', decrypted.address === pair.address)

  // Test derivation
  const derived = core.keyring.derive(wallet.mnemonic, '//0')
  console.log('Derived account:', derived.address)

  // Test network module
  const stats = await core.network.stats()
  console.log('Network stats:', stats)

  // Test wallet balance (Alice dev account)
  const aliceAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
  const balance = await core.wallet.balance(aliceAddress)
  console.log('Alice balance free:', balance.free)
  console.log('Alice balance total:', balance.total)

  // Test total issuance
  const supply = await core.wallet.totalIssuance()
  console.log('Total supply:', supply)

  // Test inbox (empty on fresh chain)
  const inbox = await core.inbox.list(aliceAddress)
  console.log('Alice inbox count:', inbox.length)

  // Test amount utilities
  const parsed = parseAmount('10 RIZ')
  console.log('parseAmount("10 RIZ"):', parsed.toString())
  if (parsed !== 10_000_000_000_000n) {
    throw new Error(`Expected 10_000_000_000_000n, got ${parsed}`)
  }

  const formatted = formatAmount(parsed)
  console.log('formatAmount(10_000_000_000_000n):', formatted)
  if (formatted !== '10.0000 RIZ') {
    throw new Error(`Expected "10.0000 RIZ", got "${formatted}"`)
  }

  // Test parseAmount edge cases
  console.log('parseAmount("0.5 RIZ"):', parseAmount('0.5 RIZ').toString())
  console.log('parseAmount("1000000"):', parseAmount('1000000').toString())

  // Test network validator count
  const validatorCount = await core.network.validatorCount()
  console.log('Validator count:', validatorCount)

  // Test developer status (not registered)
  const devStatus = await core.developer.status(aliceAddress)
  console.log('Alice developer status:', devStatus)

  await core.disconnect()
  console.log('\nAll tests passed.')
}

main().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
