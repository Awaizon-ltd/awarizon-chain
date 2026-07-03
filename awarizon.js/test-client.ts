import { createClient, Wallet } from './src/index'

async function main() {
  console.log('Testing createClient...\n')

  // ── Test 1 — Read-only client (no wallet) ─────────────────────────────────
  console.log('Test 1: Read-only client (no wallet)')
  const readOnly = await createClient({
    endpoint: 'wss://rpc.awarizon.com',
  })
  console.log('  connected:', readOnly.isConnected)
  console.log('  hasWallet:', readOnly.hasWallet)
  console.log('  address:  ', readOnly.address)
  console.log()

  // ── Test 2 — Client with mnemonic string ──────────────────────────────────
  console.log('Test 2: Client with mnemonic string')
  // Alice dev account
  const mnemonic = 'bottom drive obey lake curtain smoke basket hold race lonely fit walk//Alice'
  const awz = await createClient({
    endpoint: 'wss://rpc.awarizon.com',
    wallet: mnemonic,
  })
  console.log('  address:', awz.address)
  console.log('  hasWallet:', awz.hasWallet)

  const myBalance = await awz.wallet.balance()
  console.log('  balance.free:', myBalance.free)

  const aliceBalance = await awz.wallet.balance(awz.address!)
  console.log('  balance by address:', aliceBalance.free)
  console.log()

  // ── Test 3 — Wallet generation ────────────────────────────────────────────
  console.log('Test 3: Wallet.createRandom()')
  const generated = await Wallet.createRandom('pin123')
  console.log('  generated address:', generated.address)
  console.log('  encrypted JSON length:', generated.encrypted.length)

  const words = generated.backup()
  console.log('  word count:', words.length)
  console.log('  words are strings:', typeof words[0] === 'string')

  // Second call must throw
  try {
    generated.backup()
    console.log('  ERROR: backup() should have thrown on second call')
    process.exit(1)
  } catch (err) {
    console.log('  backup() correctly blocked second call ✓')
  }
  console.log()

  // ── Test 4 — Restore from encrypted JSON ─────────────────────────────────
  console.log('Test 4: Wallet.fromEncryptedJson()')
  const restored = await Wallet.fromEncryptedJson(generated.encrypted, 'pin123')
  const addressMatch = restored.address === generated.address
  console.log('  restored address:', restored.address)
  console.log('  address matches generated:', addressMatch)
  if (!addressMatch) { console.log('  ERROR: addresses do not match'); process.exit(1) }
  console.log()

  // ── Test 5 — Client with encrypted wallet config ──────────────────────────
  console.log('Test 5: createClient({ wallet: { encrypted, password } })')
  const awz2 = await createClient({
    endpoint: 'wss://rpc.awarizon.com',
    wallet: {
      encrypted: generated.encrypted,
      password: 'pin123',
    },
  })
  console.log('  awz2.address:', awz2.address)
  console.log('  matches generated:', awz2.address === generated.address)
  console.log()

  // ── Test 6 — Write blocked in read-only mode ──────────────────────────────
  console.log('Test 6: Read-only client blocks write operations')
  try {
    await readOnly.wallet.send({ to: awz.address!, amount: '1 RIZ' })
    console.log('  ERROR: send() should have thrown in read-only mode')
    process.exit(1)
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string }
    console.log('  Write correctly blocked ✓')
    console.log('  Error code:', e.code)
    console.log('  Error message:', (e.message ?? '').slice(0, 80) + '…')
  }
  console.log()

  // ── Test 7 — awz.connect() after creation ────────────────────────────────
  console.log('Test 7: awz.connect(mnemonic) after createClient()')
  const late = await createClient({ endpoint: 'wss://rpc.awarizon.com' })
  console.log('  before connect — hasWallet:', late.hasWallet)
  await late.connect(mnemonic)
  console.log('  after connect  — hasWallet:', late.hasWallet)
  console.log('  address:', late.address)
  console.log()

  // ── Test 8 — Network stats (read-only works) ──────────────────────────────
  console.log('Test 8: Network reads work without wallet')
  const stats = await readOnly.network.stats()
  console.log('  totalWallets:', stats.totalWallets)
  console.log('  currentEpoch:', stats.currentEpoch)
  console.log()

  console.log('✓ All tests passed')
  process.exit(0)
}

main().catch(err => {
  console.error('\nFATAL:', err instanceof Error ? err.message : err)
  process.exit(1)
})
