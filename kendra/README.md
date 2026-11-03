# Kendra — Awarizon Developer Toolchain

The Hardhat of Awarizon. Build, deploy, and test ink! smart contracts without touching Rust.

Rust is installed **automatically** on first compile. Developers only need Node.js.

## Install

```bash
npm install -g @awarizon/kendra
# or without installing:
npx kendra init my_contract
```

## Quick Start (5 minutes)

```bash
npx kendra init my_contract
cd my_contract
npm install

# In one terminal:
kendra node

# In another terminal:
kendra compile
kendra deploy
```

## Commands

### `kendra init [name]`
Scaffold a new contract project with a sample ink! contract, deploy script, and test file.

```bash
kendra init my_token
```

### `kendra compile [contract]`
Compile ink! contracts to WebAssembly. Installs Rust and `cargo-contract` automatically if needed.

```bash
kendra compile           # compile all contracts in config
kendra compile MyToken   # compile a specific contract
```

Outputs to `artifacts/` and generates TypeScript types in `typechain/`.

### `kendra deploy [--network <name>] [--contract <name>]`
Deploy compiled contracts to local node, testnet, or mainnet.

```bash
kendra deploy                         # deploy to local (default)
kendra deploy --network testnet       # deploy to testnet
kendra deploy --network mainnet --contract MyToken
```

Saves deployment addresses to `deployments/<network>.json`.

### `kendra node`
Start a local Awarizon development node (`--dev` mode, RPC at `ws://127.0.0.1:9944`).

```bash
kendra node
```

### `kendra accounts [list|generate]`
Manage accounts for development.

```bash
kendra accounts          # list dev accounts (//Alice, //Bob, etc.)
kendra accounts list     # same as above
kendra accounts generate # generate a new random account
```

### `kendra call <contract> <method> [args]`
Call a deployed contract method (coming in next release).

## kendra.config.ts

```typescript
import { defineConfig } from '@awarizon/kendra'
import * as dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  networks: {
    local: {
      endpoint: 'ws://127.0.0.1:9944',
      accounts: ['//Alice'],
    },
    testnet: {
      endpoint: 'wss://testnet.awarizon.com',
      accounts: [process.env.DEPLOYER_MNEMONIC ?? ''],
    },
    mainnet: {
      endpoint: 'wss://rpc.awarizon.com',
      accounts: [process.env.DEPLOYER_MNEMONIC ?? ''],
    },
  },
  contracts: {
    MyToken: 'contracts/my_token',
  },
  compiler: {
    optimization: true,
  },
  typechain: {
    outDir: 'typechain',
  },
  defaultNetwork: 'local',
})
```

## Writing Contracts

Kendra uses [ink! 5.x](https://use.ink/) contracts. The `init` command scaffolds a starter:

```rust
#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod my_contract {
    #[ink(storage)]
    pub struct MyContract {
        value: u32,
    }

    impl MyContract {
        #[ink(constructor)]
        pub fn new(initial_value: u32) -> Self {
            Self { value: initial_value }
        }

        #[ink(message)]
        pub fn get(&self) -> u32 { self.value }

        #[ink(message)]
        pub fn set(&mut self, new_value: u32) {
            self.value = new_value;
        }
    }
}
```

See `templates/token/lib.rs` for a full ERC-20 token example.

## TypeChain

After compiling, Kendra generates TypeScript types in `typechain/`:

```typescript
// typechain/MyContract.ts — auto-generated
export interface MyContractQuery {
  get(): Promise<number>
}
export interface MyContractTx {
  set(newValue: number): Promise<TxResult>
}
```

## Programmatic API

Use `kendra` from deploy scripts or tests:

```typescript
import { kendra } from '@awarizon/kendra'

const [alice] = await kendra.getAccounts()

const result = await kendra.deploy('MyContract', [42], {
  signer: alice,
  network: 'local',
})

console.log('Deployed to:', result.address)
```

## Networks

| Network | Endpoint |
|---------|----------|
| local   | `ws://127.0.0.1:9944` |
| testnet | `wss://testnet.awarizon.com` |
| mainnet | `wss://rpc.awarizon.com` |

## Environment Setup

Kendra auto-installs on first `kendra compile`:
1. Rust toolchain (rustup)
2. `wasm32-unknown-unknown` target
3. `cargo-contract` (ink! compiler)

This takes ~2-3 minutes on first install. Subsequent compiles are instant.

## Project Structure

```
my_contract/
├── contracts/
│   └── my_contract/
│       ├── lib.rs          ← Write your ink! contract here
│       └── Cargo.toml
├── tests/
│   └── my_contract.test.ts
├── scripts/
│   └── deploy.ts
├── artifacts/              ← Compiled .wasm and .json (auto-generated)
├── typechain/              ← TypeScript types (auto-generated)
├── deployments/            ← Deployment records (auto-generated)
└── kendra.config.ts        ← Project configuration
```
