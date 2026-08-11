-- Asset registry (pallet_assets) — one row per token created via `create` or
-- `force_create`. total_supply/holder_count are denormalized aggregates kept
-- in sync by the holder-mutating queries in db/queries.rs (upsert_asset_holder,
-- update_asset_supply).
CREATE TABLE IF NOT EXISTS assets (
  asset_id           BIGINT PRIMARY KEY,
  creator            TEXT,
  owner              TEXT NOT NULL,
  name               TEXT,
  symbol             TEXT,
  decimals           SMALLINT NOT NULL DEFAULT 0,
  is_frozen          BOOLEAN NOT NULL DEFAULT false,
  total_supply       NUMERIC(39, 0) NOT NULL DEFAULT 0,
  holder_count       BIGINT NOT NULL DEFAULT 0,
  destroyed          BOOLEAN NOT NULL DEFAULT false,
  created_block      BIGINT NOT NULL,
  last_updated_block BIGINT NOT NULL,
  indexed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner);
CREATE INDEX IF NOT EXISTS idx_assets_symbol ON assets(symbol) WHERE symbol IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_active ON assets(asset_id) WHERE destroyed = false;

-- Asset holders — one row per (asset, address) pair, updated on every
-- Issued/Transferred/Burned/Deposited/Withdrawn event.
CREATE TABLE IF NOT EXISTS asset_holders (
  id                 BIGSERIAL PRIMARY KEY,
  asset_id           BIGINT NOT NULL,
  address            TEXT NOT NULL,
  balance            NUMERIC(39, 0) NOT NULL DEFAULT 0,
  last_updated_block BIGINT NOT NULL,
  UNIQUE(asset_id, address)
);

CREATE INDEX IF NOT EXISTS idx_asset_holders_asset ON asset_holders(asset_id, balance DESC);
CREATE INDEX IF NOT EXISTS idx_asset_holders_address ON asset_holders(address);
CREATE INDEX IF NOT EXISTS idx_asset_holders_active ON asset_holders(asset_id) WHERE balance > 0;

-- Asset transfers — one row per Issued (mint, from_address NULL) / Transferred
-- / Burned (burn, to_address NULL) event.
CREATE TABLE IF NOT EXISTS asset_transfers (
  id             BIGSERIAL PRIMARY KEY,
  block_number   BIGINT NOT NULL,
  block_hash     TEXT NOT NULL,
  extrinsic_hash TEXT,
  event_index    INTEGER NOT NULL,
  asset_id       BIGINT NOT NULL,
  from_address   TEXT,
  to_address     TEXT,
  amount         NUMERIC(39, 0) NOT NULL,
  timestamp_ms   BIGINT,
  indexed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(block_number, event_index)
);

CREATE INDEX IF NOT EXISTS idx_asset_transfers_asset ON asset_transfers(asset_id, block_number DESC);
CREATE INDEX IF NOT EXISTS idx_asset_transfers_from ON asset_transfers(from_address, block_number DESC) WHERE from_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_asset_transfers_to ON asset_transfers(to_address, block_number DESC) WHERE to_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_asset_transfers_block ON asset_transfers(block_number DESC);
