import { Wallet, AwarizonError } from './src/index'

async function main() {
  console.log('── Wallet offline tests ──\n')

  // Test 1 — createRandom
  console.log('Test 1: Wallet.createRandom()')
  const gen = await Wallet.createRandom('mypassword')
  console.log('  address:', gen.address)
  console.log('  encrypted length:', gen.encrypted.length)

  // Test 2 — backup() works once
  console.log('\nTest 2: backup() first call')
  const words = gen.backup()
  console.log('  word count:', words.length)
  console.log('  all strings:', words.every(w => typeof w === 'string'))
  console.log('  words sample:', words.slice(0, 3).join(' ') + '...')

  // Test 3 — backup() throws on second call
  console.log('\nTest 3: backup() throws on second call')
  try {
    gen.backup()
    console.log('  FAIL — should have thrown')
    process.exit(1)
  } catch (err) {
    console.log('  Correctly threw ✓')
    console.log('  Message:', (err as Error).message.slice(0, 60))
  }

  // Test 4 — fromEncryptedJson
  console.log('\nTest 4: Wallet.fromEncryptedJson()')
  const restored = await Wallet.fromEncryptedJson(gen.encrypted, 'mypassword')
  console.log('  address:', restored.address)
  console.log('  matches:', restored.address === gen.address)
  if (restored.address !== gen.address) { console.log('FAIL'); process.exit(1) }

  // Test 5 — wrong password throws
  console.log('\nTest 5: Wrong password throws')
  try {
    await Wallet.fromEncryptedJson(gen.encrypted, 'wrongpassword')
    console.log('  FAIL — should have thrown')
    process.exit(1)
  } catch (err) {
    console.log('  Correctly threw on wrong password ✓')
  }

  // Test 6 — fromMnemonic
  console.log('\nTest 6: Wallet.fromMnemonic()')
  const mnemonicWallet = await Wallet.fromMnemonic(
    'bottom drive obey lake curtain smoke basket hold race lonely fit walk',
    'pin'
  )
  console.log('  address:', mnemonicWallet.address)
  console.log('  has encrypted JSON:', mnemonicWallet.encrypted.length > 0)

  // Test 7 — AwarizonError code
  console.log('\nTest 7: AwarizonError has .code property')
  const err = new AwarizonError('WALLET_REQUIRED', 'Test error')
  console.log('  err.code:', err.code)
  console.log('  err.name:', err.name)
  console.log('  err instanceof Error:', err instanceof Error)
  console.log('  err instanceof AwarizonError:', err instanceof AwarizonError)

  console.log('\n✓ All offline tests passed')
  process.exit(0)
}

main().catch(err => {
  console.error('FATAL:', err instanceof Error ? err.message : err)
  process.exit(1)
})
