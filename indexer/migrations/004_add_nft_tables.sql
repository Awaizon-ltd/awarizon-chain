-- NFT collections (pallet_nfts) — one row per collection, updated on every
-- collection-level event. total_items/listed_items/total_volume/floor_price
-- are denormalized aggregates kept in sync by the item-level queries in
-- db/queries.rs (upsert_nft_collection, set_nft_item_price, process_nft_sale, ...).
CREATE TABLE IF NOT EXISTS nft_collections (
  collection_id       BIGINT PRIMARY KEY,
  owner               TEXT NOT NULL,
  creator             TEXT,
  metadata_uri        TEXT,
  name                TEXT,
  image_url           TEXT,
  description         TEXT,
  total_items         BIGINT NOT NULL DEFAULT 0,
  listed_items        BIGINT NOT NULL DEFAULT 0,
  total_volume        NUMERIC(39, 0) NOT NULL DEFAULT 0,
  floor_price         NUMERIC(39, 0),
  max_supply          BIGINT,
  created_block       BIGINT NOT NULL,
  last_updated_block  BIGINT NOT NULL,
  indexed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nft_collections_owner ON nft_collections(owner);
CREATE INDEX IF NOT EXISTS idx_nft_collections_volume ON nft_collections(total_volume DESC);

-- NFT items — one row per minted item, updated on transfer/list/sale/burn.
CREATE TABLE IF NOT EXISTS nft_items (
  id                  BIGSERIAL PRIMARY KEY,
  collection_id       BIGINT NOT NULL,
  item_id             BIGINT NOT NULL,
  owner               TEXT NOT NULL,
  metadata_uri        TEXT,
  name                TEXT,
  image_url           TEXT,
  description         TEXT,
  listed              BOOLEAN NOT NULL DEFAULT false,
  price               NUMERIC(39, 0),
  whitelisted_buyer   TEXT,
  minted_block        BIGINT NOT NULL,
  last_updated_block  BIGINT NOT NULL,
  burned              BOOLEAN NOT NULL DEFAULT false,
  indexed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(collection_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_nft_items_collection ON nft_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_nft_items_owner ON nft_items(owner);
CREATE INDEX IF NOT EXISTS idx_nft_items_listed ON nft_items(listed, price ASC) WHERE listed = true AND burned = false;

-- NFT activity feed — one row per significant marketplace event.
-- event_type: 'create' | 'mint' | 'transfer' | 'burn' | 'list' | 'delist' | 'sale'
--   | 'owner_changed' | 'destroy'
CREATE TABLE IF NOT EXISTS nft_events (
  id                BIGSERIAL PRIMARY KEY,
  block_number      BIGINT NOT NULL,
  block_hash        TEXT NOT NULL,
  extrinsic_hash    TEXT,
  event_index       INTEGER NOT NULL,
  event_type        TEXT NOT NULL,
  collection_id     BIGINT NOT NULL,
  item_id           BIGINT,
  from_address      TEXT,
  to_address        TEXT,
  price             NUMERIC(39, 0),
  timestamp_ms      BIGINT,
  indexed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(block_number, event_index)
);

CREATE INDEX IF NOT EXISTS idx_nft_events_block ON nft_events(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_nft_events_collection ON nft_events(collection_id, block_number DESC);
CREATE INDEX IF NOT EXISTS idx_nft_events_from ON nft_events(from_address) WHERE from_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nft_events_to ON nft_events(to_address) WHERE to_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nft_events_type ON nft_events(event_type, block_number DESC);
