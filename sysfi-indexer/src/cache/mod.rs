use anyhow::Result;
use redis::aio::ConnectionManager;
use redis::{AsyncCommands, Client};
use serde::de::DeserializeOwned;
use serde::Serialize;

#[derive(Clone)]
pub struct RedisCache {
    conn: ConnectionManager,
}

impl RedisCache {
    pub async fn new(url: &str) -> Result<Self> {
        let client = Client::open(url)?;
        let conn = ConnectionManager::new(client).await?;
        Ok(Self { conn })
    }

    pub async fn get<T: DeserializeOwned>(&self, key: &str) -> Option<T> {
        let mut conn = self.conn.clone();
        let val: Option<String> = conn.get(key).await.ok()?;
        val.and_then(|s| serde_json::from_str(&s).ok())
    }

    pub async fn set<T: Serialize>(&self, key: &str, value: &T, ttl_secs: u64) -> Result<()> {
        let mut conn = self.conn.clone();
        let json = serde_json::to_string(value)?;
        conn.set_ex::<_, _, ()>(key, json, ttl_secs).await?;
        Ok(())
    }
}

/// Cache TTLs, in seconds.
pub mod ttl {
    pub const STATS: u64 = 10;
    pub const BLOCKS: u64 = 10;
    pub const TRANSACTIONS: u64 = 10;
}

/// Cache key builders — every filter param that affects a query's result must
/// appear in the key.
pub mod keys {
    pub fn stats() -> String {
        "sysfi:stats".to_string()
    }

    pub fn blocks(limit: i64, offset: i64) -> String {
        format!("sysfi:blocks:{limit}:{offset}")
    }

    pub fn transactions(address: Option<&str>, limit: i64, offset: i64) -> String {
        format!("sysfi:tx:{}:{}:{}", address.unwrap_or("_"), limit, offset)
    }
}
