import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
})

export default pool

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS faucet_requests (
      id            SERIAL PRIMARY KEY,
      address       TEXT NOT NULL,
      amount_planck BIGINT NOT NULL,
      tx_hash       TEXT,
      ip_address    TEXT,
      status        TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_faucet_address
      ON faucet_requests(address);

    CREATE INDEX IF NOT EXISTS idx_faucet_created
      ON faucet_requests(created_at DESC);

    CREATE TABLE IF NOT EXISTS faucet_stats (
      id               SERIAL PRIMARY KEY,
      total_requests   INTEGER NOT NULL DEFAULT 0,
      total_riz_sent   BIGINT NOT NULL DEFAULT 0,
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    INSERT INTO faucet_stats (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING;
  `)
  console.log('Faucet DB initialized ✓')
}
