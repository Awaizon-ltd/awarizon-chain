-- Wallet index table
-- Populated from the AwarizonState.update_wallet_index extrinsic's call
-- arguments (wallet_age_days, activity_count, category_history, region_code)
-- correlated with its signer. The WalletIndexUpdated event itself only
-- carries the wallet address, not these fields, so this is populated from
-- the extrinsic args at indexing time, not the event.
-- This is the targeting pool for campaigns.

CREATE TABLE IF NOT EXISTS wallet_index (
  address            TEXT PRIMARY KEY,
  wallet_age_days    INTEGER NOT NULL DEFAULT 0,
  activity_count     INTEGER NOT NULL DEFAULT 0,
  -- category_history stored as array
  -- 0=DeFi 1=Gaming 2=Social 3=Productivity
  -- 4=Infrastructure 5=DigitalAssets
  -- 6=DeveloperTools 7=Education
  category_history   INTEGER[] NOT NULL DEFAULT '{}',
  region_code        SMALLINT NOT NULL DEFAULT 0,
  -- Derived targeting fields
  -- Computed from above for fast filtering
  is_active          BOOLEAN NOT NULL DEFAULT true,
  -- Block when wallet last updated index
  last_indexed_block BIGINT NOT NULL DEFAULT 0,
  -- When first indexed
  first_indexed_block BIGINT NOT NULL DEFAULT 0,
  indexed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_index_age
  ON wallet_index(wallet_age_days DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_index_activity
  ON wallet_index(activity_count DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_index_region
  ON wallet_index(region_code);
CREATE INDEX IF NOT EXISTS idx_wallet_index_active
  ON wallet_index(address)
  WHERE is_active = true;

-- Campaign delivery tracking
-- Tracks which wallets received which campaigns
-- Prevents duplicate deliveries

CREATE TABLE IF NOT EXISTS campaign_deliveries (
  id              BIGSERIAL PRIMARY KEY,
  campaign_id     TEXT NOT NULL,
  wallet          TEXT NOT NULL,
  delivered_block BIGINT NOT NULL,
  record_id       TEXT,
  indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, wallet)
);

CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_campaign
  ON campaign_deliveries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_wallet
  ON campaign_deliveries(wallet);
