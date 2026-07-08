-- Blocks table
CREATE TABLE IF NOT EXISTS blocks (
  id              BIGSERIAL PRIMARY KEY,
  block_number    BIGINT NOT NULL UNIQUE,
  block_hash      TEXT NOT NULL UNIQUE,
  parent_hash     TEXT NOT NULL,
  state_root      TEXT NOT NULL,
  extrinsics_root TEXT NOT NULL,
  extrinsic_count INTEGER NOT NULL DEFAULT 0,
  event_count     INTEGER NOT NULL DEFAULT 0,
  timestamp_ms    BIGINT,
  indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocks_number ON blocks(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_blocks_hash ON blocks(block_hash);

-- Extrinsics table
CREATE TABLE IF NOT EXISTS extrinsics (
  id              BIGSERIAL PRIMARY KEY,
  block_number    BIGINT NOT NULL REFERENCES blocks(block_number),
  block_hash      TEXT NOT NULL,
  extrinsic_index INTEGER NOT NULL,
  extrinsic_hash  TEXT NOT NULL,
  pallet          TEXT NOT NULL,
  method          TEXT NOT NULL,
  signer          TEXT,            -- null for unsigned
  nonce           BIGINT,
  fee             NUMERIC(39, 0),  -- in planck; fee decoding not implemented yet, left null
  success         BOOLEAN NOT NULL DEFAULT true,
  error           TEXT,
  args            JSONB,           -- decoded arguments
  indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(block_number, extrinsic_index)
);

CREATE INDEX IF NOT EXISTS idx_ext_block ON extrinsics(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_ext_hash ON extrinsics(extrinsic_hash);
CREATE INDEX IF NOT EXISTS idx_ext_signer ON extrinsics(signer) WHERE signer IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ext_pallet_method ON extrinsics(pallet, method);

-- Events table — generic capture for every decoded event, regardless of pallet
CREATE TABLE IF NOT EXISTS events (
  id              BIGSERIAL PRIMARY KEY,
  block_number    BIGINT NOT NULL REFERENCES blocks(block_number),
  block_hash      TEXT NOT NULL,
  event_index     INTEGER NOT NULL,
  pallet          TEXT NOT NULL,
  method          TEXT NOT NULL,  -- event variant name
  data            JSONB,          -- decoded event fields
  indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(block_number, event_index)
);

CREATE INDEX IF NOT EXISTS idx_events_block ON events(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_events_pallet ON events(pallet, method);

-- Transfers table (denormalized from Balances.Transfer events)
CREATE TABLE IF NOT EXISTS transfers (
  id              BIGSERIAL PRIMARY KEY,
  block_number    BIGINT NOT NULL,
  block_hash      TEXT NOT NULL,
  event_index     INTEGER NOT NULL,
  from_address    TEXT NOT NULL,
  to_address      TEXT NOT NULL,
  amount_planck   NUMERIC(39, 0) NOT NULL,
  fee_planck      NUMERIC(39, 0),  -- fee decoding not implemented yet, left null
  timestamp_ms    BIGINT,
  indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(block_number, event_index)
);

CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_address);
CREATE INDEX IF NOT EXISTS idx_transfers_to ON transfers(to_address);
CREATE INDEX IF NOT EXISTS idx_transfers_block ON transfers(block_number DESC);

-- Identity events table (pallet_awarizon_identity)
-- event_type: 'registered' | 'updated' | 'reputation_updated' | 'name_transferred'
CREATE TABLE IF NOT EXISTS identity_events (
  id                BIGSERIAL PRIMARY KEY,
  block_number      BIGINT NOT NULL,
  extrinsic_hash    TEXT,
  event_type        TEXT NOT NULL,
  account           TEXT NOT NULL,
  riz_name          TEXT,
  new_score         INTEGER,
  transferred_from  TEXT,
  transferred_to    TEXT,
  timestamp_ms      BIGINT,
  indexed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_identity_account ON identity_events(account);
CREATE INDEX IF NOT EXISTS idx_identity_riz_name ON identity_events(riz_name) WHERE riz_name IS NOT NULL;

-- Inbox events table (pallet_awarizon_state)
-- event_type: 'delivered' | 'dismissed' | 'engaged' | 'claimed'
CREATE TABLE IF NOT EXISTS inbox_events (
  id              BIGSERIAL PRIMARY KEY,
  block_number    BIGINT NOT NULL,
  extrinsic_hash  TEXT,
  event_type      TEXT NOT NULL,
  wallet          TEXT NOT NULL,
  record_id       TEXT NOT NULL,
  campaign_id     TEXT,
  reward_planck   NUMERIC(39, 0),
  timestamp_ms    BIGINT,
  indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbox_wallet ON inbox_events(wallet);
CREATE INDEX IF NOT EXISTS idx_inbox_record ON inbox_events(record_id);
CREATE INDEX IF NOT EXISTS idx_inbox_campaign ON inbox_events(campaign_id) WHERE campaign_id IS NOT NULL;

-- Campaign events table (pallet_awarizon_state)
-- event_type: 'created' | 'terminated' | 'expired'
CREATE TABLE IF NOT EXISTS campaign_events (
  id              BIGSERIAL PRIMARY KEY,
  block_number    BIGINT NOT NULL,
  extrinsic_hash  TEXT,
  event_type      TEXT NOT NULL,
  campaign_id     TEXT NOT NULL,
  developer       TEXT,
  timestamp_ms    BIGINT,
  indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_id ON campaign_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_developer ON campaign_events(developer) WHERE developer IS NOT NULL;

-- Staking events table (pallet_awarizon_consensus)
-- event_type: 'validator_registered' | 'validator_deactivated' | 'delegated' | 'undelegated'
--   | 'slashed' | 'misbehavior_slashed' | 'commission_updated' | 'epoch_election_completed'
--   | 'rewards_distributed' | 'validator_reward_claimed' | 'delegator_reward_claimed'
--   | 'delegator_compensated' | 'yield_reserve_emission' | 'fee_deposited'
CREATE TABLE IF NOT EXISTS staking_events (
  id              BIGSERIAL PRIMARY KEY,
  block_number    BIGINT NOT NULL,
  extrinsic_hash  TEXT,
  event_type      TEXT NOT NULL,
  delegator       TEXT,
  validator       TEXT,
  amount_planck   NUMERIC(39, 0),
  epoch           BIGINT,
  commission      INTEGER,
  timestamp_ms    BIGINT,
  indexed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staking_delegator ON staking_events(delegator) WHERE delegator IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staking_validator ON staking_events(validator) WHERE validator IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staking_epoch ON staking_events(epoch) WHERE epoch IS NOT NULL;

-- Indexer state (tracks sync progress)
CREATE TABLE IF NOT EXISTS indexer_state (
  id                  INTEGER PRIMARY KEY DEFAULT 1,
  last_indexed_block  BIGINT NOT NULL DEFAULT 0,
  last_indexed_hash   TEXT,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO indexer_state (id, last_indexed_block)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;
