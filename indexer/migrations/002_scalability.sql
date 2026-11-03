-- Composite indexes for common query patterns introduced by the scalability
-- upgrade (campaign/inbox REST filters, DEX per-trader/per-pair lookups).
-- Not run automatically — apply manually against production.

-- Campaign events: developer + type + block
CREATE INDEX IF NOT EXISTS idx_campaign_dev_type_block
ON campaign_events(developer, event_type, block_number DESC)
WHERE developer IS NOT NULL;

-- Inbox events: wallet + type + block
CREATE INDEX IF NOT EXISTS idx_inbox_wallet_type_block
ON inbox_events(wallet, event_type, block_number DESC);

-- Inbox events: campaign + type
CREATE INDEX IF NOT EXISTS idx_inbox_campaign_type
ON inbox_events(campaign_id, event_type)
WHERE campaign_id IS NOT NULL;

-- Transfers: block + timestamp for time-range queries
CREATE INDEX IF NOT EXISTS idx_transfers_block_ts
ON transfers(block_number DESC, timestamp_ms DESC);

-- Staking events: validator + epoch
CREATE INDEX IF NOT EXISTS idx_staking_val_epoch
ON staking_events(validator, epoch DESC)
WHERE validator IS NOT NULL;

-- DEX swaps: trader + block
CREATE INDEX IF NOT EXISTS idx_dex_swaps_trader_block
ON dex_swaps(trader, block_number DESC);

-- DEX price history: assets + block (for charts)
CREATE INDEX IF NOT EXISTS idx_dex_price_assets_block
ON dex_price_history(asset_a, asset_b, block_number DESC);

-- Partial index: active campaigns only
CREATE INDEX IF NOT EXISTS idx_campaign_active
ON campaign_events(campaign_id)
WHERE event_type = 'created';
