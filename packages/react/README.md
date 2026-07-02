# @awarizon/react

React hooks and Provider for the Awarizon blockchain. Works in React web, React Native, and Expo.

## Installation

```bash
npm install @awarizon/react @awarizon/core
```

For React Native / Expo, also install one of:

```bash
npx expo install expo-secure-store
# or
npm install @react-native-async-storage/async-storage
```

## Quick Start

```tsx
import { AwarizonProvider } from '@awarizon/react'

export default function App() {
  return (
    <AwarizonProvider endpoint="wss://rpc.awarizon.network">
      <YourApp />
    </AwarizonProvider>
  )
}
```

## Hooks

### `useAwarizon` — connection + wallet lifecycle

```tsx
import { useAwarizon } from '@awarizon/react'

function WalletSetup() {
  const {
    connected, connecting, connectionError,
    address, hasStoredWallet, walletLocked, isReady,
    createWallet, importWallet, unlockWallet, lockWallet,
    deleteWallet, exportWallet,
  } = useAwarizon()

  if (!connected) return <p>Connecting...</p>

  const handleCreate = async () => {
    const { mnemonic, address } = await createWallet('my-password')
    console.log('New wallet:', address)
    console.log('Save this mnemonic:', mnemonic)
  }

  const handleImport = async (mnemonic: string) => {
    const { address } = await importWallet(mnemonic, 'my-password')
    console.log('Imported:', address)
  }

  const handleUnlock = async () => {
    await unlockWallet('my-password')
  }

  return (
    <div>
      <p>Address: {address}</p>
      <p>Ready: {isReady ? 'Yes' : 'No'}</p>
      <button onClick={handleCreate}>Create Wallet</button>
      <button onClick={() => handleImport('word1 word2 ...')}>Import</button>
      <button onClick={handleUnlock}>Unlock</button>
      <button onClick={lockWallet}>Lock</button>
    </div>
  )
}
```

### `useWallet` — balance and transfers

```tsx
import { useWallet } from '@awarizon/react'

function Balance() {
  const { balance, loading, send, totalIssuance } = useWallet()

  // balance auto-refreshes on each new block

  const handleSend = async () => {
    const result = await send({ to: '5Grp...', amount: '10 RIZ' })
    console.log('Sent in block', result.blockNumber)
  }

  return (
    <div>
      <p>Free: {balance?.free}</p>
      <p>Total: {balance?.total}</p>
      <button onClick={handleSend}>Send 10 RIZ</button>
    </div>
  )
}
```

### `useNetwork` — chain stats and block subscription

```tsx
import { useNetwork } from '@awarizon/react'

function NetworkInfo() {
  const { stats, latestBlock, tps, loading } = useNetwork()

  return (
    <div>
      <p>Block: #{latestBlock}</p>
      <p>TPS: {tps.toFixed(1)}</p>
      <p>Active campaigns: {stats?.activeCampaigns}</p>
      <p>Total staked: {stats?.totalStaked}</p>
    </div>
  )
}
```

### `useInbox` — ad inbox management

```tsx
import { useInbox } from '@awarizon/react'

function Inbox() {
  const { inbox, unreadCount, rewardEligible, engage, claim, dismiss } = useInbox()

  return (
    <div>
      <p>{unreadCount} unread, {rewardEligible} rewards available</p>
      {inbox.map(item => (
        <div key={item.recordId}>
          <p>{item.category} — {item.status}</p>
          {item.status === 'Delivered' && (
            <button onClick={() => engage(item.recordId)}>Engage</button>
          )}
          {item.rewardEligible && (
            <button onClick={() => claim(item.recordId)}>Claim Reward</button>
          )}
          <button onClick={() => dismiss(item.recordId)}>Dismiss</button>
        </div>
      ))}
    </div>
  )
}
```

### `useIdentity` — on-chain identity

```tsx
import { useIdentity } from '@awarizon/react'

function Profile() {
  const { identity, rizName, displayName, reputationScore, register, update } = useIdentity()

  const handleRegister = async () => {
    await register({
      rizName: 'harry',
      displayName: 'Harry J',
      bio: 'Awarizon developer',
    })
  }

  return (
    <div>
      <p>Name: {rizName}.riz</p>
      <p>Display: {displayName}</p>
      <p>Reputation: {reputationScore}</p>
      <button onClick={handleRegister}>Register Identity</button>
    </div>
  )
}
```

### `useLinks` — cross-chain address linking

```tsx
import { useLinks } from '@awarizon/react'

function LinkedAddresses() {
  const { links, evmAddress, solanaAddress, buildEvmMessage, linkEvm, unlink } = useLinks()

  const handleLinkEvm = async (myAddress: string) => {
    const message = buildEvmMessage(myAddress)
    // Sign message with MetaMask or similar
    const signature = await ethereum.request({
      method: 'personal_sign',
      params: [message, myAddress],
    })
    await linkEvm({ evmAddress: myAddress, signature })
  }

  return (
    <div>
      <p>EVM: {evmAddress ?? 'not linked'}</p>
      <p>Solana: {solanaAddress ?? 'not linked'}</p>
      <button onClick={() => handleLinkEvm('0x...')}>Link EVM</button>
      <button onClick={() => unlink('EVM')}>Unlink EVM</button>
    </div>
  )
}
```

### `useDeveloper` — developer registration

```tsx
import { useDeveloper } from '@awarizon/react'

function DeveloperPanel() {
  const { status, isRegistered, stakedAmount, totalCampaigns, register, stake } = useDeveloper()

  return (
    <div>
      <p>Registered: {isRegistered ? 'Yes' : 'No'}</p>
      <p>Stake: {stakedAmount}</p>
      <p>Campaigns: {totalCampaigns}</p>
      {!isRegistered && <button onClick={register}>Register as Developer</button>}
      <button onClick={() => stake('1000 RIZ')}>Stake 1000 RIZ</button>
    </div>
  )
}
```

### `useApps` — app manifest registration

```tsx
import { useApps } from '@awarizon/react'

function MyApps() {
  const { apps, register } = useApps()

  const handleRegister = async () => {
    await register({
      manifestHash: '0xabc123...',
      category: 'Finance',
      metadataUri: 'ipfs://Qm...',
    })
  }

  return (
    <div>
      {apps.map(app => <p key={app.manifestHash}>{app.manifestHash}</p>)}
      <button onClick={handleRegister}>Register App</button>
    </div>
  )
}
```

### `useCampaigns` — ad campaign management

```tsx
import { useCampaigns } from '@awarizon/react'

function Campaigns() {
  const { campaigns, activeCampaigns, create, terminate } = useCampaigns()

  const handleCreate = async () => {
    await create({
      manifestHash: '0xabc...',
      targeting: { categories: ['Finance', 'Gaming'], minBalance: '10 RIZ' },
      durationDays: 30,
      maxDeliveries: 10000n,
    })
  }

  return (
    <div>
      <p>{activeCampaigns.length} active campaigns</p>
      {campaigns.map(c => (
        <div key={c.campaignId}>
          <p>{c.campaignId} — {c.status}</p>
          {c.status === 'Active' && (
            <button onClick={() => terminate(c.campaignId)}>Terminate</button>
          )}
        </div>
      ))}
      <button onClick={handleCreate}>Create Campaign</button>
    </div>
  )
}
```

### `useAssets` — pallet-assets tokens

```tsx
import { useAssets } from '@awarizon/react'

function TokenManager() {
  const { create, mint, transfer, burn, balance, info } = useAssets()

  const handleCreate = () => create({ id: 1, admin: myAddress, minBalance: 1n })
  const handleMint = () => mint({ assetId: 1, to: myAddress, amount: 1000n })
  const handleTransfer = () => transfer({ assetId: 1, to: '5Grp...', amount: 100n })
  const handleBalance = async () => {
    const bal = await balance(1)
    console.log(bal?.balance)
  }

  return <button onClick={handleBalance}>Check Balance</button>
}
```

### `useNFTs` — pallet-nfts

```tsx
import { useNFTs } from '@awarizon/react'

function NFTGallery() {
  const { nfts, createCollection, mint, transfer, burn, ownerOf } = useNFTs()

  const handleSetup = async () => {
    await createCollection({ collectionId: 1, admin: myAddress })
    await mint({ collection: 1, itemId: 1, owner: myAddress })
  }

  return (
    <div>
      {nfts.map(nft => (
        <div key={`${nft.collection}-${nft.item}`}>
          <p>Collection {nft.collection} / Item {nft.item}</p>
          <p>Owner: {nft.owner}</p>
          <button onClick={() => transfer({ collection: nft.collection, item: nft.item, to: '5Grp...' })}>
            Transfer
          </button>
        </div>
      ))}
    </div>
  )
}
```

### `useValidators` — validator staking

```tsx
import { useValidators } from '@awarizon/react'

function ValidatorList() {
  const { validators, activeValidators, myValidator, register, delegate, undelegate } = useValidators()

  const handleRegister = () => register({ stake: '5000 RIZ', regionCode: 1, countryCode: 826 })
  const handleDelegate = () => delegate({ to: '5Val...', amount: '100 RIZ' })
  const handleUndelegate = () => undelegate({ from: '5Val...' })

  return (
    <div>
      <p>{activeValidators.length} active validators</p>
      {validators.map(v => (
        <div key={v.address}>
          <p>{v.address} — Score: {v.performanceScore}</p>
          <button onClick={() => delegate({ to: v.address, amount: '100 RIZ' })}>
            Delegate
          </button>
        </div>
      ))}
    </div>
  )
}
```

## Custom Storage

Override the default storage adapter:

```tsx
import { AwarizonProvider, type StorageAdapter } from '@awarizon/react'

const myStorage: StorageAdapter = {
  async save(key, value) { /* ... */ },
  async load(key) { return null },
  async remove(key) { /* ... */ },
  async keys() { return [] },
  async clear() { /* ... */ },
}

<AwarizonProvider endpoint="wss://..." storage={myStorage}>
  <App />
</AwarizonProvider>
```

## Platform Support

| Platform     | Storage Backend             |
|--------------|-----------------------------|
| Web          | `localStorage`              |
| Expo / RN    | `expo-secure-store` (preferred) or `AsyncStorage` |
| SSR / Node   | In-memory `Map` (session-only) |

## License

MIT
