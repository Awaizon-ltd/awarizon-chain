export const CONFIG = {
  // Target node — change to wss://rpc.awarizon.com for VPS stress test
  endpoint: process.env.AWARIZON_ENDPOINT
    ?? 'ws://127.0.0.1:9944',

  // SURI for the account that funds all test wallets.
  // '//Alice' resolves to the well-known dev account that is
  // pre-endowed on --dev chains. Override with a real mnemonic/SURI
  // (and sufficient balance) when targeting a live VPS.
  funderUri: process.env.FUNDER_URI
    ?? process.env.FUNDER_MNEMONIC
    ?? '//Alice',

  // Batch sizes for parallel submission
  // Substrate nodes handle ~50-100 concurrent tx well
  // before mempool pressure causes drops
  batchSize: parseInt(process.env.BATCH_SIZE ?? '50'),

  // Delay between batches in ms
  // 0 = maximum pressure, 3000 = one batch per block
  batchDelay: parseInt(process.env.BATCH_DELAY ?? '100'),

  // Amount to send in each test transfer (in RIZ)
  transferAmount: '0.001',

  // Amount to fund each test wallet (in RIZ)
  fundAmount: '10',

  // Where to save wallet files and results
  walletsFile: './data/wallets.json',
  resultsDir: './results',

  // Progressive test levels
  progressiveLevels: [
    10_000,
    50_000,
    100_000,
    200_000,
    500_000,
    1_000_000,
  ],
}
