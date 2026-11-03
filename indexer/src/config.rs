use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    /// WebSocket URL of the Awarizon node.
    pub node_url: String,

    /// PostgreSQL connection string.
    pub database_url: String,

    /// API port.
    pub port: u16,

    /// How many blocks to process per batch during historical sync.
    pub batch_size: u64,

    /// Delay between batches in ms. 0 = maximum speed for initial sync.
    pub batch_delay_ms: u64,

    /// Maximum Postgres connections.
    pub db_pool_size: u32,

    /// Redis connection string (caching + pub/sub notifications).
    pub redis_url: String,

    /// Block number to begin syncing from when the indexer state is fresh
    /// (last_indexed_block == 0). Ignored once the indexer has real
    /// progress, so it never rewinds an already-running sync. 0 = disabled
    /// (sync from genesis, the historical default).
    pub start_block: u64,

    /// Number of most-recent blocks' worth of indexed data to retain.
    /// Rows older than (latest indexed block - retention) are deleted by the
    /// pruning loop. Matches the node's `--state-pruning` window so the
    /// indexer doesn't keep data the node itself can no longer prove.
    /// 0 = pruning disabled (keep everything). Default: 200_000.
    pub prune_retention_blocks: u64,

    /// How often the pruning loop runs, in seconds. Default: 3600 (1 hour).
    pub prune_interval_secs: u64,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        dotenv::dotenv().ok();

        Ok(Self {
            node_url: env::var("NODE_URL").unwrap_or_else(|_| "ws://127.0.0.1:9944".to_string()),
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            port: env::var("PORT").unwrap_or_else(|_| "3036".to_string()).parse()?,
            batch_size: env::var("BATCH_SIZE").unwrap_or_else(|_| "10".to_string()).parse()?,
            batch_delay_ms: env::var("BATCH_DELAY_MS").unwrap_or_else(|_| "0".to_string()).parse()?,
            db_pool_size: env::var("DB_POOL_SIZE").unwrap_or_else(|_| "10".to_string()).parse()?,
            redis_url: env::var("REDIS_URL").expect("REDIS_URL must be set"),
            start_block: env::var("START_BLOCK").unwrap_or_else(|_| "0".to_string()).parse()?,
            prune_retention_blocks: env::var("PRUNE_RETENTION_BLOCKS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(200_000),
            prune_interval_secs: env::var("PRUNE_INTERVAL_SECS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(3600),
        })
    }
}
