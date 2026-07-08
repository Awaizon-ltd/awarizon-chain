# awarizon.js

The official all-in-one SDK for building on the Awarizon blockchain — a `Wallet` / `Provider` / `Signer` API modeled directly on ethers.js, for Node, React, and React Native.

```bash
npm install awarizon.js
```

## Quick start

```ts
import { Wallet, Provider } from 'awarizon.js'

// Create a new wallet — mnemonic, address, and publicKey are always
// plain, readable properties, just like ethers.js Wallet.createRandom()
const wallet = await Wallet.createRandom()
console.log(wallet.mnemonic, wallet.address)

// Read-only access to the chain — no wallet required
const provider = await Provider.connect('wss://rpc.awarizon.com')
const balance = await provider.wallet.balance(wallet.address)
console.log(balance.free) // '0.0000 RIZ'

// Connect a wallet to the chain to get read + write access
const signer = await wallet.connect('wss://rpc.awarizon.com')
await signer.wallet.send('harry.riz', '10 RIZ')

await provider.disconnect()
await signer.disconnect()
```

## Wallet

Key material only — never touches the network.

```ts
Wallet.createRandom(wordCount?: 12 | 24)       // new random wallet
Wallet.fromMnemonic(phrase)                    // restore from seed phrase
wallet.encrypt(password, onProgress?)          // -> encrypted JSON string
Wallet.fromEncryptedJson(json, password, onProgress?)
wallet.connect(endpoint?)                      // -> Signer
```

`wallet.mnemonic`, `wallet.address`, and `wallet.publicKey` are always
accessible, plain readonly properties — never hidden behind a method.
`fromEncryptedJson` cannot recover the original mnemonic (`mnemonic` will
be `''`), matching ethers.js behavior.

## Provider and Signer

`Provider.connect(endpoint?)` gives you read-only access to the chain.
`wallet.connect(endpoint?)` gives you a `Signer` — everything `Provider`
has, plus write access using the wallet's keypair.

Both expose the same 11 modules:

| Module | Read | Write (Signer only) |
|---|---|---|
| `wallet` | `balance()`, `totalSupply()` | `send()` |
| `inbox` | `list()`, `count()` | `engage()`, `claim()`, `dismiss()` |
| `identity` | `get()`, `resolve()`, `available()`, `total()` | `register()`, `update()` |
| `links` | `list()`, `evmMessage()`, `solanaMessage()` | `linkEvm()`, `linkSolana()`, `unlink()` |
| `developer` | `status()` | `register()`, `stake()` |
| `apps` | `list()` | `register()` |
| `campaigns` | `get()`, `stats()`, `activeCount()` | `create()`, `terminate()`, `deliver()` |
| `assets` | `balance()`, `metadata()` | `create()`, `mint()`, `transfer()`, `burn()` |
| `nfts` | `ownerOf()` | `createCollection()`, `mint()`, `transfer()`, `burn()` |
| `validators` | `list()`, `count()`, `performance()` | `register()`, `delegate()`, `undelegate()`, `updatePerformance()` |
| `network` | `stats()`, `block()`, `subscribe()` | — |

Read methods work on both `Provider` and `Signer`. Write methods throw an
`AwarizonError` with code `NOT_SIGNED` if called on a plain `Provider`.

Addresses accept either an SS58 address or a registered `.riz` name
(e.g. `signer.wallet.send('harry.riz', '10 RIZ')`). Amounts accept a
`string`, `number`, or `bigint`, with or without a `RIZ` suffix
(`'10'`, `10`, `'10.5 RIZ'`, `10_000_000_000_000n`) and are always
returned as formatted strings (`'10.0000 RIZ'`).

## React

```tsx
import { AwarizonProvider, useAwarizon } from 'awarizon.js/react'

function App() {
  return (
    <AwarizonProvider endpoint="wss://rpc.awarizon.com">
      <Balance />
    </AwarizonProvider>
  )
}

function Balance() {
  const { connected, address, wallet, connectWallet } = useAwarizon()
  // wallet is read-only until connectWallet(walletInstance) is called
  ...
}
```

`awarizon.js/native` re-exports the same `AwarizonProvider`/`useAwarizon`
for React Native — neither touches any DOM API. See the migration notes
in this repo if you're running under Expo Go vs. a custom dev client;
`@polkadot/util-crypto` needs a native `crypto.getRandomValues` source
(`expo-crypto`, or `react-native-get-random-values` in a bare/dev-client
build).

## Errors

Every failure — chain rejection, bad input, missing wallet — throws an
`AwarizonError` with a stable `.code`:

```ts
try {
  await provider.wallet.send(to, amount)
} catch (e) {
  if (e instanceof AwarizonError && e.code === 'NOT_SIGNED') {
    // provider has no wallet attached — connect one first
  }
}
```

## Related packages

This package wraps [`@awarizon/sdk`](https://www.npmjs.com/package/@awarizon/sdk),
which is re-exported in full — you only need to install `awarizon.js`.
