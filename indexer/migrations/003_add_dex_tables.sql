-- DEX pool snapshots (pallet_awarizon_dex) — one row per pool, updated on every
-- PoolCreated / LiquidityAdded / LiquidityRemoved / Swapped event.
-- asset_a/asset_b are "native" (RIZ) or "token:<id>" (pallet-assets token), always
-- in the pallet's own sorted PoolId order.
CREATE TABLE IF NOT EXISTS dex_pools (
  id                  BIGSERIAL PRIMARY KEY,
  asset_a             TEXT NOT NULL,
  asset_b             TEXT NOT NULL,
  lp_asset_id         INTEGER NOT NULL,
  reserve_a           NUMERIC(39, 0) NOT NULL DEFAULT 0,
  reserve_b           NUMERIC(39, 0) NOT NULL DEFAULT 0,
  lp_total_supply     NUMERIC(39, 0) NOT NULL DEFAULT 0,
  total_volume        NUMERIC(39, 0) NOT NULL DEFAULT 0,
  total_fees          NUMERIC(39, 0) NOT NULL DEFAULT 0,
  total_burned        NUMERIC(39, 0) NOT NULL DEFAULT 0,
  creator             TEXT,
  created_block       BIGINT NOT NULL,
  last_updated_block  BIGINT NOT NULL,
  indexed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(asset_a, asset_b)
);

CREATE INDEX IF NOT EXISTS idx_dex_pools_assets ON dex_pools(asset_a, asset_b);

-- DEX swaps — one row per swap, direct (Swapped) or multi-hop (MultiHopSwapped).
-- Multi-hop swaps don't carry a fee breakdown or pool reserves in their event
-- (the pallet emits per-hop Swapped/PriceUpdated events for that instead), so
-- those columns are left null for is_multi_hop rows.
CREATE TABLE IF NOT EXISTS dex_swaps (
  id                  BIGSERIAL PRIMARY KEY,
  block_number        BIGINT NOT NULL,
  block_hash          TEXT NOT NULL,
  extrinsic_hash      TEXT,
  event_index         INTEGER NOT NULL,
  trader              TEXT NOT NULL,
  asset_in            TEXT NOT NULL,
  asset_out           TEXT NOT NULL,
  amount_in           NUMERIC(39, 0) NOT NULL,
  amount_out          NUMERIC(39, 0) NOT NULL,
  fee                 NUMERIC(39, 0),
  protocol_fee        NUMERIC(39, 0),
  protocol_fee_burned BOOLEAN,
  reserve_a           NUMERIC(39, 0),
  reserve_b           NUMERIC(39, 0),
  price_a_per_b       NUMERIC(39, 0),
  price_b_per_a       NUMERIC(39, 0),
  is_multi_hop        BOOLEAN NOT NULL DEFAULT false,
  hop_path            TEXT,  -- JSON array of assets, multi-hop only
  timestamp_ms        BIGINT,
  indexed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(block_number, event_index)
);

CREATE INDEX IF NOT EXISTS idx_dex_swaps_block ON dex_swaps(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_dex_swaps_trader ON dex_swaps(trader);
CREATE INDEX IF NOT EXISTS idx_dex_swaps_assets ON dex_swaps(asset_in, asset_out);

-- DEX liquidity events — one row per add/remove liquidity call.
CREATE TABLE IF NOT EXISTS dex_liquidity_events (
  id                  BIGSERIAL PRIMARY KEY,
  block_number        BIGINT NOT NULL,
  block_hash          TEXT NOT NULL,
  extrinsic_hash      TEXT,
  event_index         INTEGER NOT NULL,
  event_type          TEXT NOT NULL,  -- 'added' | 'removed'
  asset_a             TEXT NOT NULL,
  asset_b             TEXT NOT NULL,
  provider            TEXT NOT NULL,
  amount_a            NUMERIC(39, 0) NOT NULL,
  amount_b            NUMERIC(39, 0) NOT NULL,
  lp_amount           NUMERIC(39, 0) NOT NULL,
  reserve_a           NUMERIC(39, 0),
  reserve_b           NUMERIC(39, 0),
  lp_total_supply     NUMERIC(39, 0),
  timestamp_ms        BIGINT,
  indexed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(block_number, event_index)
);

CREATE INDEX IF NOT EXISTS idx_dex_liquidity_block ON dex_liquidity_events(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_dex_liquidity_provider ON dex_liquidity_events(provider);
CREATE INDEX IF NOT EXISTS idx_dex_liquidity_assets ON dex_liquidity_events(asset_a, asset_b);

-- DEX price history (from PriceUpdated events) — feeds TWAP/price charts.
CREATE TABLE IF NOT EXISTS dex_price_history (
  id              BIGSERIAL PRIMARY KEY,
  block_number    BIGINT NOT NULL,
  asset_a         TEXT NOT NULL,
  asset_b         TEXT NOT NULL,
  price_a_per_b   NUMERIC(39, 0) NOT NULL,
  price_b_per_a   NUMERIC(39, 0) NOT NULL,
  timestamp_ms    BIGINT,
  indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dex_price_block ON dex_price_history(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_dex_price_lookup ON dex_price_history(asset_a, asset_b, block_number DESC);

-- DEX protocol fee events (ProtocolFeeProcessed) — burn vs treasury tracking.
CREATE TABLE IF NOT EXISTS dex_protocol_fees (
  id              BIGSERIAL PRIMARY KEY,
  block_number    BIGINT NOT NULL,
  extrinsic_hash  TEXT,
  amount          NUMERIC(39, 0) NOT NULL,
  burned          BOOLEAN NOT NULL DEFAULT true,
  timestamp_ms    BIGINT,
  indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dex_fees_block ON dex_protocol_fees(block_number DESC);
