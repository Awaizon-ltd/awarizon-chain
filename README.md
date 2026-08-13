# Awarizon Chain

The official repository for the Awarizon blockchain — a sovereign Layer 1 blockchain with a native app distribution protocol built directly into the runtime.

## Overview

Awarizon enables developers to register apps and deliver them directly to matching wallets via on-chain targeting. Users receive apps in their inbox, engage, and earn RIZ tokens automatically.

## Network

| | |
|---|---|
| **Network** | Awarizon Testnet |
| **Token** | RIZ |
| **RPC** | wss://rpc.awarizon.com |
| **Explorer** | https://rizscan.awarizon.com |
| **Chain ID** | public-testnet |
| **Block Time** | 3 seconds |

## Quick Start — Run a Node

### Download binary

```bash
wget https://github.com/Awaizon-ltd/awarizon-chain/releases/latest/download/awarizon-node
chmod +x awarizon-node
```

### Download chain spec

```bash
wget https://github.com/Awaizon-ltd/awarizon-chain/releases/latest/download/public-testnet.json
```

### Run a full node

```bash
./awarizon-node \
  --base-path ./data \
  --chain public-testnet.json \
  --name "MyNode" \
  --rpc-port 9944 \
  --port 30333
```

### Run a validator node

```bash
./awarizon-node \
  --base-path ./data \
  --chain public-testnet.json \
  --validator \
  --name "MyValidator" \
  --unsafe-rpc-external \
  --rpc-cors all \
  --rpc-port 9944 \
  --port 30333
```

## Pallets

| Pallet | Description |
|---|---|
| `pallet-awarizon-state` | App registration, campaigns, inbox delivery |
| `pallet-awarizon-consensus` | Validator registration, staking, epoch rewards |
| `pallet-awarizon-dex` | On-chain AMM DEX for RIZ and native tokens |
| `pallet-awarizon-identity` | On-chain .riz name system |
| `pallet-awarizon-links` | Cross-chain address linking |
| `pallet-awarizon-types` | Shared types across pallets |

## SDK

```bash
npm install awarizon.js
npm install @awarizon/sdk
npm install @awarizon/app
```

## Ecosystem

| | |
|---|---|
| **Developer Portal** | https://developer.awarizon.com |
| **NFT Marketplace** | https://rizart.xyz |
| **DEX** | https://dex.awarizon.com |
| **Validator Portal** | https://validators.awarizon.com |
| **Faucet** | https://faucet.awarizon.com |
| **Docs** | https://wiki.awarizon.com |

## Validator Program

Run a validator and earn RIZ epoch rewards.

- **Managed** — we run everything, you earn rewards → [validators.awarizon.com](https://validators.awarizon.com)
- **Self-hosted** — full control, free forever → see setup guide above

## License

MIT
