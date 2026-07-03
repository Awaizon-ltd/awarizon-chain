# @awarizon/core

High-level SDK for building on the Awarizon blockchain. 10x faster than working with raw chain primitives.

Wraps `@awarizon/sdk` with natural-language amounts, simple async/await, built-in key management, and human-readable errors.

## Install

```bash
npm install @awarizon/core
```

## Quick Start

```typescript
import { createCore } from '@awarizon/core'

const core = await createCore({ endpoint: 'ws://127.0.0.1:9944' })

// Generate a wallet
const wallet = core.keyring.generate()
console.log(wallet.address)   // SS58 address
console.log(wallet.mnemonic)  // 12-word phrase

// Check balance
const balance = await core.wallet.balance(wallet.address)
console.log(balance.free)   // "0.0000 RIZ"

// Send RIZ
const signer = core.keyring.fromMnemonic(wallet.mnemonic)
const tx = await core.wallet.send({ to: '5GrwvaEF...', amount: '10 RIZ', signer })
console.log(tx.hash)

await core.disconnect()
```

## Key Management

```typescript
import { AwarizonKeyring } from '@awarizon/core'

const keyring = new AwarizonKeyring()
await keyring.initialize()

// Generate
const wallet = keyring.generate()           // { mnemonic, address, publicKey }
const wallet24 = keyring.generate(24)       // 24-word mnemonic

// Import
const pair = keyring.fromMnemonic('word1 word2 ... word12')

// Derive child accounts (multi-account support)
const account0 = keyring.derive(wallet.mnemonic, '//0')
const account1 = keyring.derive(wallet.mnemonic, '//1')

// Encrypt/decrypt for storage
const encrypted = keyring.encrypt(pair, 'myPassword')  // JSON string
const decrypted = keyring.decrypt(encrypted, 'myPassword')

// Export/import Polkadot-compatible JSON backup
const json = keyring.exportJson(pair, 'password')
const restored = keyring.importJson(json, 'password')
```

## Wallet Operations

```typescript
// Balance
const balance = await core.wallet.balance(address)
// { free: "100.0000 RIZ", staked: "0.0000 RIZ", total: "100.0000 RIZ", freePlanck: 100000000000000n }

// Send
const tx = await core.wallet.send({ to: recipientAddress, amount: '10 RIZ', signer })
// { hash: "0x...", blockNumber: 0, success: true }

// Total issuance
const supply = await core.wallet.totalIssuance()   // "1,000,000.0000 RIZ"
```

## Inbox

```typescript
// List inbox items
const items = await core.inbox.list(address)
// [{ recordId, campaignId, developer, category, status, rewardEligible, ... }]

// Count
const count = await core.inbox.count(address)

// Engage with content
const tx = await core.inbox.engage({
  recordId: '0xabc...',
  sessionSeconds: 300,   // optional, defaults to MIN_SESSION_SECONDS (120)
  interactions: 10,      // optional, defaults to MIN_INTERACTIONS (5)
  signer,
})

// Claim reward
const reward = await core.inbox.claim({ recordId: '0xabc...', signer })
console.log(reward.reward)   // "1.0000 RIZ"

// Dismiss
await core.inbox.dismiss({ recordId: '0xabc...', signer })
```

## Developer Tools

```typescript
// Register as developer
await core.developer.register({ signer })

// Stake RIZ
await core.developer.stake({ amount: '10000 RIZ', signer })

// Check status
const status = await core.developer.status(address)
// { registered: true, verified: false, stake: "10000.0000 RIZ", totalCampaigns: 0, ... }

// Register app manifest
const app = await core.apps.register({
  manifestHash: '0xabc123...',   // 32-byte hex
  category: 'Gaming',
  metadataUri: 'ipfs://Qm...',
  signer,
})
console.log(app.manifestHash)

// List developer manifests
const manifests = await core.apps.list(developerAddress)

// Create campaign
const campaign = await core.campaigns.create({
  manifestHash: '0xabc123...',
  targeting: {
    categories: ['Gaming', 'DeFi'],
    minBalance: '10 RIZ',
    minWalletAge: 30,     // days
  },
  durationDays: 30,
  maxDeliveries: 10000n,
  signer,
})
console.log(campaign.campaignId)

// Get campaign
const c = await core.campaigns.get(campaignId)
// { campaignId, status, maxDeliveries, currentDeliveries, ... }

// Delivery status
const ds = await core.campaigns.deliveryStatus(campaignId)
// { current: 42, max: 10000, remaining: 9958, percentage: 0 }

// Terminate
await core.campaigns.terminate({ campaignId, signer })
```

## Assets

```typescript
// Create fungible token (pallet-assets)
const asset = await core.assets.create({
  id: 1,
  admin: myAddress,
  minBalance: 1n,
  signer,
})

// Mint tokens
await core.assets.mint({ assetId: 1, to: recipientAddress, amount: 1000n, signer })

// Transfer
await core.assets.transfer({ assetId: 1, to: recipientAddress, amount: 100n, signer })

// Burn
await core.assets.burn({ assetId: 1, who: myAddress, amount: 50n, signer })

// Check balance
const bal = await core.assets.balance({ assetId: 1, address: myAddress })
// { assetId: 1, symbol: "1", balance: "950", balanceRaw: 950n }
```

## NFTs

```typescript
// Create collection (pallet-nfts)
await core.nfts.createCollection({ collectionId: 1, admin: myAddress, signer })

// Mint NFT
await core.nfts.mint({ collection: 1, itemId: 0, owner: myAddress, signer })

// Transfer
await core.nfts.transfer({ collection: 1, item: 0, to: recipientAddress, signer })

// Owner
const owner = await core.nfts.ownerOf({ collection: 1, item: 0 })

// List owned NFTs
const nfts = await core.nfts.list(myAddress)
// [{ collection: 1, item: 0, owner: "5G...", metadata: {} }]
```

## Validators

```typescript
// Register as validator
await core.validators.register({
  stake: '10000 RIZ',
  regionCode: 1,
  countryCode: 44,
  signer,
})

// Delegate stake
await core.validators.delegate({ to: validatorAddress, amount: '1000 RIZ', signer })

// Undelegate
await core.validators.undelegate({ from: validatorAddress, signer })

// Performance info
const info = await core.validators.performance(validatorAddress)
// { selfStake, delegatedStake, totalStake, performanceScore, uptime, slashCount, isActive }

// List all active validators
const validators = await core.validators.list()
```

## Network

```typescript
const stats = await core.network.stats()
// { totalWallets, totalDeliveries, activeCampaigns, totalStaked, currentEpoch, ... }

const count = await core.network.validatorCount()
const active = await core.network.activeValidators()   // string[] of SS58 addresses

// Subscribe to new blocks
const unsub = await core.network.subscribeBlocks((blockNumber, hash) => {
  console.log(`Block #${blockNumber}: ${hash}`)
})
unsub()  // stop subscription
```

## Amount Format

All public API inputs accept human-readable RIZ strings. All outputs return formatted strings.

```typescript
import { parseAmount, formatAmount, isValidAmount } from '@awarizon/core'

// String → planck bigint (internal representation)
parseAmount('10 RIZ')        // 10_000_000_000_000n
parseAmount('0.5 RIZ')       // 500_000_000_000n
parseAmount('10')            // 10_000_000_000_000n  (RIZ suffix optional)

// planck bigint → display string
formatAmount(10_000_000_000_000n)       // "10.0000 RIZ"
formatAmount(10_000_000_000_000n, 2)    // "10.00 RIZ"

// Validate
isValidAmount('10 RIZ')    // true
isValidAmount('abc')       // false
```

RIZ has 12 decimal places (`1 RIZ = 1_000_000_000_000 planck`). Never pass raw planck values to public API methods — always use `"10 RIZ"` strings.
