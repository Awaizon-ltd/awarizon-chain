-- Blocks table — one row per SysFi (EVM) block.
CREATE TABLE IF NOT EXISTS blocks (
  block_number      BIGINT PRIMARY KEY,
  block_hash        TEXT NOT NULL UNIQUE,
  parent_hash       TEXT NOT NULL,
  author            TEXT NOT NULL,       -- block author/validator (H160)
  gas_used          BIGINT NOT NULL,
  gas_limit         BIGINT NOT NULL,
  base_fee_per_gas  NUMERIC(78, 0),      -- wei; null pre-EIP1559 blocks (shouldn't occur on SysFi, kept nullable defensively)
  tx_count          INTEGER NOT NULL DEFAULT 0,
  fees_burned       NUMERIC(78, 0) NOT NULL DEFAULT 0, -- wei; sum of gasUsed * effectiveGasPrice over this block's receipts
  timestamp_ms      BIGINT NOT NULL,
  indexed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocks_timestamp ON blocks(timestamp_ms DESC);

-- Transactions table — one row per transaction, denormalized with its receipt.
CREATE TABLE IF NOT EXISTS transactions (
  tx_hash               TEXT PRIMARY KEY,
  block_number          BIGINT NOT NULL REFERENCES blocks(block_number),
  tx_index              INTEGER NOT NULL,
  from_address          TEXT NOT NULL,
  to_address            TEXT,             -- null for contract-creation transactions
  value                 NUMERIC(78, 0) NOT NULL,
  gas                   BIGINT NOT NULL,
  gas_used              BIGINT,           -- from receipt; null only if receipt fetch raced ingestion (shouldn't persist)
  gas_price             NUMERIC(78, 0) NOT NULL, -- effective gas price actually paid
  status                BOOLEAN NOT NULL, -- true = success (receipt.status == 1)
  nonce                 BIGINT NOT NULL,
  input_size            INTEGER NOT NULL DEFAULT 0,
  is_contract_creation  BOOLEAN NOT NULL DEFAULT FALSE,
  contract_address      TEXT,             -- set when is_contract_creation
  timestamp_ms          BIGINT NOT NULL,
  indexed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_block ON transactions(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_tx_from ON transactions(from_address, block_number DESC);
CREATE INDEX IF NOT EXISTS idx_tx_to ON transactions(to_address, block_number DESC) WHERE to_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tx_timestamp ON transactions(timestamp_ms DESC);

-- Addresses table — upserted from every transaction's from/to/contract_address.
-- Exists specifically so "total wallets" and "is this a contract" are O(1)
-- lookups instead of a full chain rescan on every request.
CREATE TABLE IF NOT EXISTS addresses (
  address           TEXT PRIMARY KEY,
  first_seen_block  BIGINT NOT NULL,
  last_seen_block   BIGINT NOT NULL,
  tx_count          BIGINT NOT NULL DEFAULT 0,
  is_contract       BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_last_seen ON addresses(last_seen_block DESC);

-- Indexer sync state — single row, tracks how far ingestion has progressed.
CREATE TABLE IF NOT EXISTS indexer_state (
  id                  INTEGER PRIMARY KEY DEFAULT 1,
  last_indexed_block  BIGINT NOT NULL DEFAULT -1, -- -1 = nothing indexed yet (block 0 is a valid indexed value)
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO indexer_state (id, last_indexed_block)
VALUES (1, -1)
ON CONFLICT (id) DO NOTHING;
