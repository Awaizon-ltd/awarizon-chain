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
        })
    }
}
