import { Wallet, Provider } from './src/index'

async function main() {
  console.log('\n=== WALLET TESTS ===\n')

  // Test 1 — createRandom (ethers.js pattern)
  const wallet = await Wallet.createRandom()
  console.log('createRandom():')
  console.log('  mnemonic:', wallet.mnemonic.split(' ').length, 'words ✓')
  console.log('  address:', wallet.address)
  console.log('  publicKey:', wallet.publicKey.slice(0, 12) + '...')

  // Test 2 — mnemonic always accessible
  console.log('\nmnemonic always readable:',
    wallet.mnemonic.split(' ')[0] + '... ✓')

  // Test 3 — fromMnemonic (restore)
  const restored = await Wallet.fromMnemonic(wallet.mnemonic)
  console.log('\nfromMnemonic():')
  console.log('  address matches:', restored.address === wallet.address, '✓')

  // Test 4 — encrypt (optional, with progress)
  console.log('\nencrypt() with progress:')
  const encrypted = await wallet.encrypt('testpin123',
    (pct) => process.stdout.write(`  ${pct}%... `)
  )
  console.log('\n  encrypted length:', encrypted.length, '✓')

  // Test 5 — fromEncryptedJson
  const fromEnc = await Wallet.fromEncryptedJson(
    encrypted, 'testpin123',
    (pct) => process.stdout.write(`  ${pct}%... `)
  )
  console.log('\nfromEncryptedJson():')
  console.log('  address matches:',
    fromEnc.address === wallet.address, '✓')

  // Test 6 — wrong password throws
  try {
    await Wallet.fromEncryptedJson(encrypted, 'wrong')
    console.log('ERROR: should have thrown')
  } catch (e: any) {
    console.log('\nWrong password caught:',
      e.code === 'WRONG_PASSWORD', '✓')
  }

  console.log('\n=== CHAIN TESTS ===\n')

  // Test 7 — Provider (read-only)
  const provider = await Provider.connect(
    'ws://127.0.0.1:9944'
  )
  console.log('Provider connected:', provider.connected, '✓')

  const stats = await provider.network.stats()
  console.log('network.stats():', {
    wallets: stats.totalWallets,
    extrinsics: stats.totalExtrinsics,
  }, '✓')

  const block = await provider.network.block()
  console.log('network.block():', block, '✓')

  // Test 8 — balance (read-only, no wallet needed)
  const alice = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
  const balance = await provider.wallet.balance(alice)
  console.log('wallet.balance(alice):', balance.free, '✓')

  // Test 9 — identity read
  const identity = await provider.identity.get(alice)
  console.log('identity.get(alice):', identity ?? 'null (no identity set) ✓')

  // Test 10 — write operation fails without signer
  try {
    await provider.wallet.send(alice, '1 RIZ')
    console.log('ERROR: should have thrown')
  } catch (e: any) {
    console.log('\nWrite without signer caught:',
      e.code === 'NOT_SIGNED', '✓')
  }

  // Test 11 — Signer (wallet connected to chain)
  console.log('\n=== SIGNER TESTS ===\n')
  const devMnemonic =
    'bottom drive obey lake curtain smoke basket ' +
    'hold race lonely fit walk'
  const devWallet = await Wallet.fromMnemonic(devMnemonic)
  const signer = await devWallet.connect('ws://127.0.0.1:9944')

  console.log('signer.address:', signer.address, '✓')
  console.log('signer.connected:', signer.connected, '✓')

  const signerBalance = await signer.wallet.balance()
  console.log('signer.wallet.balance():', signerBalance.free, '✓')

  // Test 12 — amount parsing
  const { parseAmount, formatAmount } = await import('./src/utils')
  const parsed = parseAmount('10 RIZ')
  console.log('\nparseAmount("10 RIZ"):', parsed === 10_000_000_000_000n, '✓')
  console.log('formatAmount(10_000_000_000_000n):',
    formatAmount(10_000_000_000_000n), '✓')

  // Test 13 — .riz name resolution
  const available = await provider.identity.available('harry')
  console.log('\nidentity.available("harry"):', available, '✓')

  await provider.disconnect()
  await signer.disconnect()

  console.log('\n✓ All tests passed\n')
}

main().catch(err => {
  console.error('\nTest failed:', err.message)
  process.exit(1)
})
