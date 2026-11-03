-- Links a transfer back to the extrinsic that emitted it, so the explorer can
-- deep-link to a precise transaction rather than only the containing block.
-- Existing rows are left NULL — there's no reliable way to backfill without
-- re-scanning historical blocks from the node.
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS extrinsic_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_transfers_extrinsic_hash ON transfers(extrinsic_hash) WHERE extrinsic_hash IS NOT NULL;
