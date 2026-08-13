# Awarizon Chain

The official repository for the Awarizon blockchain — a sovereign Layer 1 blockchain with a native app distribution protocol built directly into the runtime.

## Network

| | |
|---|---|
| **Network** | Awarizon Public Testnet |
| **Token** | RIZ |
| **RPC** | wss://rpc.awarizon.com |
| **Explorer** | https://rizscan.awarizon.com |
| **Block Time** | 3 seconds |
| **Bootnode** | `/ip4/31.97.58.198/tcp/30333/p2p/12D3KooWHQUu3gnFJwvdVYNUpF8kyRSoHsxhhXj8ExjnciVtHWf4` |

## Quick Start

### Download

```bash
wget https://github.com/Awaizon-ltd/awarizon-chain/releases/latest/download/awarizon-node
chmod +x awarizon-node
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

## Validator Program

Run a validator and earn RIZ epoch rewards.

- **Managed** — we run everything, you earn rewards → [validators.awarizon.com](https://validators.awarizon.com)
- **Self-hosted** — full control, free forever → follow setup guide above

## Ecosystem

| | |
|---|---|
| **Developer Portal** | https://developer.awarizon.com |
| **NFT Marketplace** | https://rizart.xyz |
| **DEX** | https://dex.awarizon.com |
| **Validator Portal** | https://validators.awarizon.com |
| **Faucet** | https://faucet.awarizon.com |
| **Docs** | https://wiki.awarizon.com |

## License

MIT
