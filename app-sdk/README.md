# @awarizon/app

Zero-friction engagement SDK for Awarizon.
Add 3 lines of code — your users earn RIZ.

## Install

```bash
npm install @awarizon/app
```

## Quick Start

```typescript
import { AwarizonApp } from '@awarizon/app'

const app = new AwarizonApp()

// Initialize once when app loads
const user = await app.init()

if (user) {
  console.log('User from Awarizon:', user.address)
}

// Option 1 — Auto reward after 2 minutes
app.autoRewardAfter()

// Option 2 — Reward after specific event
app.rewardAfterEvents('level_complete', 1)
function onLevelComplete() {
  app.trackEvent('level_complete')
}

// Option 3 — Manual trigger
async function onUserFinishedReading() {
  await app.triggerReward()
}
```

## How It Works

1. Developer creates a campaign on developer.awarizon.com
2. Users receive the app in their Awarizon wallet inbox
3. User opens the app — SDK automatically detects the campaign context
4. User engages with the app normally
5. When the engagement threshold is met, the SDK calls
   `submit_engagement` + `claim_reward` automatically
6. User sees "You earned 1.5000 RIZ!" toast

## Engagement Thresholds

The chain requires:
- Minimum 120 seconds in session
- Minimum 5 interactions

The SDK tracks both automatically. `triggerReward()`'s options are
accepted for documentation purposes, but the actual on-chain call
always submits the chain's own minimum thresholds — there's nothing
to override there.

## Works With Any App

- React web apps
- Vue / Angular apps
- React Native (via WebView)
- Flutter (via WebView)
- Games (Phaser, PixiJS, Unity WebGL)
- Any website

## No API Key Required

The campaign ID is the authentication. The chain enforces all rules.

## License

MIT
