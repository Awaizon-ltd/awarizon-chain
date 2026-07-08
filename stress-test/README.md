# Awarizon Stress Test Suite

Generates funded test wallets and runs configurable transaction load
against an Awarizon node, measuring TPS, latency, finality, and error
rate.

## Quick Start

```bash
# 1. Generate wallets
npm run wallet:generate -- 10000

# 2. Fund wallets (funder must have enough RIZ — see below)
npm run wallet:fund -- 10000

# 3. Run scenarios
npm run test:transfers -- 10000     # 10k native transfers
npm run test:transfers -- 100000    # 100k native transfers
npm run test:identity -- 10000      # registers/updates .riz identities
npm run test:named -- 10000         # transfers resolved via .riz names
npm run test:mixed -- 10000         # 70% transfer / 20% identity / 10% remark
npm run test:progressive            # 10k → 50k → 100k → 200k → 500k → 1M
npm run benchmark                   # full benchmark suite across scales

# 4. Run against a VPS
AWARIZON_ENDPOINT=wss://rpc.awarizon.com FUNDER_URI="<mnemonic or SURI>" \
  npm run test:transfers -- 10000
```

Run `test:identity` (or `test:mixed`) before `test:named` if you want the
named-transfer scenario to actually exercise `.riz` name resolution —
otherwise recipients have no registered name and transfers fall back to
raw addresses.

## Environment Variables

| Variable          | Default                | Description |
|--------------------|------------------------|-------------|
| `AWARIZON_ENDPOINT` | `ws://127.0.0.1:9944`  | Node WebSocket URL |
| `FUNDER_URI`        | `//Alice`               | SURI/mnemonic for the account that funds test wallets. `//Alice` is the genesis-endowed dev account; pass a real mnemonic (with balance) for a VPS run |
| `BATCH_SIZE`        | `50`                   | Concurrent transactions per batch |
| `BATCH_DELAY`       | `100`                  | Milliseconds between batches (`0` = max pressure) |

## Notes

- This runtime has no `pallet-utility`, so wallet funding submits one
  `balances.transferKeepAlive` per wallet (concurrently, in batches) rather
  than a single `batch_all` call.
- Never point `test:progressive` / `benchmark` at a live VPS funder without
  first validating against a local `--dev` node at a small scale (1000,
  then 10000).

## Results

Each scenario run writes a JSON result to `results/`. Multi-scenario runs
(`progressive`, `benchmark`) additionally write a Markdown summary report.
