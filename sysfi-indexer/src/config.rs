use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    /// JSON-RPC HTTP URL of the SysFi node (eth_* namespace).
    pub rpc_url: String,

    /// PostgreSQL connection string. Must point at a database dedicated to
    /// this indexer — never the Awarizon indexer's database.
    pub database_url: String,

    /// API port.
    pub port: u16,

    /// How many blocks to fetch per batch during historical backfill.
    pub batch_size: u64,

    /// Delay between batches in ms during backfill. 0 = as fast as the RPC allows.
    pub batch_delay_ms: u64,

    /// How often (ms) to poll for new blocks once backfill has caught up to
    /// the chain tip. SysFi's Aura block time is ~6s; polling faster just
    /// wastes RPC calls between blocks.
    pub poll_interval_ms: u64,

    /// Maximum Postgres connections.
    pub db_pool_size: u32,

    /// Redis connection string (response caching).
    pub redis_url: String,

    /// Block number to begin syncing from when indexer state is fresh
    /// (last_indexed_block == -1). Ignored once real progress exists, so it
    /// never rewinds an already-running sync. 0 = genesis (the default).
    pub start_block: u64,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        dotenv::dotenv().ok();

        Ok(Self {
            rpc_url: env::var("RPC_URL").expect("RPC_URL must be set"),
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            port: env::var("PORT").unwrap_or_else(|_| "3037".to_string()).parse()?,
            batch_size: env::var("BATCH_SIZE").unwrap_or_else(|_| "25".to_string()).parse()?,
            batch_delay_ms: env::var("BATCH_DELAY_MS").unwrap_or_else(|_| "0".to_string()).parse()?,
            poll_interval_ms: env::var("POLL_INTERVAL_MS").unwrap_or_else(|_| "3000".to_string()).parse()?,
            db_pool_size: env::var("DB_POOL_SIZE").unwrap_or_else(|_| "10".to_string()).parse()?,
            redis_url: env::var("REDIS_URL").expect("REDIS_URL must be set"),
            start_block: env::var("START_BLOCK").unwrap_or_else(|_| "0".to_string()).parse()?,
        })
    }
}
