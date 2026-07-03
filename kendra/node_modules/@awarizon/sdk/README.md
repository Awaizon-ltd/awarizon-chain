# @awarizon/sdk

TypeScript SDK for the Awarizon Layer 1 blockchain.

## Installation

```bash
npm install @awarizon/sdk
```

## Quick Start

```typescript
import { connect, getNetworkStats, formatRiz } from '@awarizon/sdk'

const client = await connect('ws://127.0.0.1:9944')
const api = client.getApi()

const stats = await getNetworkStats(api)
console.log('Active campaigns:', stats.active_campaigns)

const balance = await client.getBalance('5GrwvaEF5zXb26Fz9rcQpDWS57...')
console.log('Balance:', formatRiz(balance), 'RIZ')

await client.disconnect()
```

## Constants Reference

| Constant | Value | Description |
|---|---|---|
| `RIZ` | `1_000_000_000_000n` | 1 RIZ in planck units |
| `MILLI_RIZ` | `1_000_000_000n` | 0.001 RIZ |
| `MICRO_RIZ` | `1_000_000n` | 0.000001 RIZ |
| `BLOCK_TIME_SECONDS` | `3` | Target block time |
| `EPOCH_LENGTH_BLOCKS` | `28_800` | Blocks per epoch (~1 day) |
| `MIN_SESSION_SECONDS` | `120` | Minimum engagement session |
| `MIN_INTERACTIONS` | `5` | Minimum engagement interactions |
| `MIN_CAMPAIGN_DURATION_DAYS` | `1` | Minimum campaign duration |
| `MAX_CAMPAIGN_DURATION_DAYS` | `90` | Maximum campaign duration |
| `DEVELOPER_MIN_TENURE_DAYS` | `30` | Minimum developer tenure |

## Utility Functions

```typescript
import { formatRiz, parseRiz, blocksToTime, generateCampaignId } from '@awarizon/sdk'

formatRiz(1_000_000_000_000n)       // "1.0000"
formatRiz(1_500_000_000_000n, 2)    // "1.50"
parseRiz("1.5")                      // 1_500_000_000_000n
blocksToTime(28800)                  // "1d"
generateCampaignId('0xabc...')       // "0x<hash_prefix><timestamp>"
```

## RPC Methods

All 15 custom Awarizon RPC methods are available as typed async functions.

```typescript
import {
  getNetworkStats,        // () → NetworkStats
  getTokenStats,          // () → TokenStats
  getActiveCampaignCount, // () → bigint
  getActiveValidators,    // () → string[]
  getValidatorCount,      // () → number
  getValidatorPerformance,// (account) → ValidatorPerformanceResponse | null
  getDeveloperProfile,    // (account) → DeveloperProfile | null
  getDeveloperCampaigns,  // (account) → string[]
  getDeveloperManifests,  // (account) → string[]
  getCampaign,            // (campaignId) → Campaign | null
  getCampaignDeliveryStatus, // (campaignId) → CampaignDeliveryStatus | null
  getInboxCount,          // (wallet) → number
  getInboxRecord,         // (wallet, recordId) → InboxRecord | null
  getWalletTargetingProfile, // (wallet) → WalletTargetingProfile
  checkCampaignMatch,     // (campaignId, wallet) → boolean
} from '@awarizon/sdk'
```

## Extrinsic Builders

```typescript
import {
  buildRegisterDeveloper,   // () → SubmittableExtrinsic
  buildStakeRiz,            // (amount: bigint) → SubmittableExtrinsic
  buildRegisterManifest,    // (hash, category, uri) → SubmittableExtrinsic
  buildCreateCampaign,      // (id, hash, targeting, days, maxDeliveries)
  buildTerminateCampaign,   // (campaignId)
  buildExpireCampaign,      // (campaignId)
  buildDeliverToInbox,      // (wallet, campaignId, recordId)
  buildDismissInboxRecord,  // (recordId)
  buildSubmitEngagement,    // (recordId, sessionSecs, interactions)
  buildClaimReward,         // (recordId)
  buildUpdateWalletIndex,   // (ageDays, activity, categories, region)
  buildBloomFilter,         // (campaignId)
  buildCheckWalletMatch,    // (campaignId, wallet)
  buildRunTargetingBatch,   // (campaignId, wallets[])
  buildRegisterValidator,   // (selfStake, region, country)
  buildDelegateStake,       // (validator, amount)
  buildUndelegateStake,     // (validator)
  buildUpdatePerformance,   // (validator, uptime, finality, blocks)
  buildRunEpochElection,    // (epoch)
  buildSlashValidator,      // (validator, reason)  — root only
  buildCreateAsset,         // (id, admin, minBalance)
  buildMintAsset,           // (id, beneficiary, amount)
  buildTransferAsset,       // (id, target, amount)
} from '@awarizon/sdk'
```

## Wallet Helpers

```typescript
import { aliceKeypair, keypairFromMnemonic, signAndSend } from '@awarizon/sdk'
import { buildRegisterDeveloper } from '@awarizon/sdk'

const signer = aliceKeypair()    // dev chain only
const tx = buildRegisterDeveloper(api)
const { blockHash, txHash } = await signAndSend(api, tx, signer)
```

## Error Handling

```typescript
import { parseChainError, DeveloperNotFoundError } from '@awarizon/sdk'

try {
  await signAndSend(api, tx, signer)
} catch (err) {
  const sdkError = parseChainError(err)
  if (sdkError instanceof DeveloperNotFoundError) {
    console.log('Register as developer first')
  }
}
```

## End-to-End Example

```typescript
import {
  connect, aliceKeypair, signAndSend,
  buildRegisterDeveloper, buildStakeRiz, buildRegisterManifest,
  buildCreateCampaign, buildDeliverToInbox,
  buildSubmitEngagement, buildClaimReward,
  generateCampaignId, parseRiz,
} from '@awarizon/sdk'

const client = await connect()
const api = client.getApi()
const alice = aliceKeypair()

// 1. Register as developer
await signAndSend(api, buildRegisterDeveloper(api), alice)

// 2. Stake RIZ to get verified
await signAndSend(api, buildStakeRiz(api, parseRiz('1000')), alice)

// 3. Register an app manifest
const manifestHash = '0x' + '01'.repeat(32)
await signAndSend(api, buildRegisterManifest(api, manifestHash, 'DeFi', 'ipfs://...'), alice)

// 4. Create a campaign
const campaignId = generateCampaignId(manifestHash)
await signAndSend(api, buildCreateCampaign(api, campaignId, manifestHash, {
  wallet_age_min: 30, wallet_age_max: null,
  riz_balance_min: null, riz_balance_max: null,
  activity_min: null, activity_max: null,
  region_codes: [], category_history: [],
  custom_logic_hash: null,
}, 7, 1000n), alice)

// 5. Deliver to a wallet inbox
const bob = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'
const recordId = '0x' + '02'.repeat(32)
await signAndSend(api, buildDeliverToInbox(api, bob, campaignId, recordId), alice)

// 6. User engages (signed by Bob's key)
// await signAndSend(api, buildSubmitEngagement(api, recordId, 120, 5), bob)

// 7. User claims reward
// await signAndSend(api, buildClaimReward(api, recordId), bob)

await client.disconnect()
```
