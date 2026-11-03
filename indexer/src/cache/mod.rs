use anyhow::Result;
use redis::aio::ConnectionManager;
use redis::{AsyncCommands, Client};
use serde::de::DeserializeOwned;
use serde::Serialize;

#[derive(Clone)]
pub struct RedisCache {
    client: Client,
    conn: ConnectionManager,
}

impl RedisCache {
    pub async fn new(url: &str) -> Result<Self> {
        let client = Client::open(url)?;
        let conn = ConnectionManager::new(client.clone()).await?;
        Ok(Self { client, conn })
    }

    /// A fresh client handle for operations `ConnectionManager` doesn't support,
    /// namely pub/sub (used by the WebSocket handler to bridge wallet/developer
    /// notification channels to connected clients).
    pub fn client(&self) -> Client {
        self.client.clone()
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

    pub async fn del(&self, key: &str) -> Result<()> {
        let mut conn = self.conn.clone();
        conn.del::<_, ()>(key).await?;
        Ok(())
    }

    /// Deletes all keys matching a glob pattern via SCAN (not KEYS, which
    /// blocks Redis for the duration of the scan on a large keyspace).
    pub async fn del_pattern(&self, pattern: &str) -> Result<()> {
        let mut conn = self.conn.clone();
        let mut cursor: u64 = 0;
        loop {
            let (next_cursor, keys): (u64, Vec<String>) = redis::cmd("SCAN")
                .arg(cursor)
                .arg("MATCH")
                .arg(pattern)
                .arg("COUNT")
                .arg(200)
                .query_async(&mut conn)
                .await?;
            if !keys.is_empty() {
                conn.del::<_, ()>(keys).await?;
            }
            if next_cursor == 0 {
                break;
            }
            cursor = next_cursor;
        }
        Ok(())
    }

    pub async fn publish(&self, channel: &str, message: &str) -> Result<()> {
        let mut conn = self.conn.clone();
        conn.publish::<_, _, ()>(channel, message).await?;
        Ok(())
    }
}

/// Cache TTLs, in seconds.
pub mod ttl {
    pub const STATS: u64 = 30;
    pub const BLOCKS: u64 = 10;
    pub const RECENT_TRANSACTIONS: u64 = 10;
    pub const CAMPAIGN_EVENTS: u64 = 15;
    pub const INBOX_EVENTS: u64 = 10;
    pub const DEX_POOLS: u64 = 20;
    pub const DEX_STATS: u64 = 30;
    pub const SEARCH_RESULTS: u64 = 60;
    pub const CAMPAIGN_STATS: u64 = 30;
    pub const NFT_COLLECTIONS: u64 = 20;
    pub const NFT_RANKINGS: u64 = 30;
    // Wallet candidates change slowly (a new address just needs to appear
    // once in an event) and the query itself is the heaviest one this
    // service runs (full UNION + GROUP BY across transfers/inbox/identity),
    // so this gets a longer TTL than the per-wallet feeds above.
    pub const WALLET_CANDIDATES: u64 = 120;
    pub const WALLET_INDEX: u64 = 60;
    // Targeting results change as wallets register via update_wallet_index,
    // so this is shorter than WALLET_INDEX's listing TTL.
    pub const TARGETING: u64 = 30;
    pub const CAMPAIGN_DELIVERIES: u64 = 30;
}

/// Cache key builders. Every filter param that affects a query's result must
/// appear in its key — otherwise two different filter combinations collide
/// on one cached value and one request serves the wrong data to the other.
pub mod keys {
    pub fn stats() -> String {
        "idx:stats".to_string()
    }

    pub fn blocks(limit: i64) -> String {
        format!("idx:blocks:{limit}")
    }

    pub fn recent_transactions(limit: i64) -> String {
        format!("idx:txrecent:{limit}")
    }

    pub fn campaign_events(developer: Option<&str>, event_type: Option<&str>, limit: i64, offset: i64) -> String {
        format!(
            "idx:campaign:{}:{}:{}:{}",
            developer.unwrap_or("_"),
            event_type.unwrap_or("_"),
            limit,
            offset,
        )
    }

    pub fn inbox_events(
        wallet: Option<&str>,
        campaign_id: Option<&str>,
        event_type: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> String {
        format!(
            "idx:inbox:{}:{}:{}:{}:{}",
            wallet.unwrap_or("_"),
            campaign_id.unwrap_or("_"),
            event_type.unwrap_or("_"),
            limit,
            offset,
        )
    }

    /// Glob covering every `campaign_events` cache entry, for invalidation
    /// after a write — must stay a prefix of `campaign_events()`'s output.
    pub fn campaign_events_pattern() -> &'static str {
        "idx:campaign:*"
    }

    /// Glob covering every `inbox_events` cache entry for one wallet, for
    /// invalidation after a write — must stay a prefix of `inbox_events()`'s
    /// output. `None` invalidates the unfiltered ("_") feed instead.
    pub fn inbox_events_pattern(wallet: Option<&str>) -> String {
        format!("idx:inbox:{}:*", wallet.unwrap_or("_"))
    }

    pub fn wallet_candidates(limit: i64, offset: i64) -> String {
        format!("idx:walletcand:{limit}:{offset}")
    }

    pub fn campaign_stats(developer: &str) -> String {
        format!("idx:campstats:{developer}")
    }

    pub fn dex_pools() -> String {
        "idx:dex:pools".to_string()
    }

    pub fn dex_stats() -> String {
        "idx:dex:stats".to_string()
    }

    pub fn search(query: &str, category: Option<&str>, developer: Option<&str>, limit: i64) -> String {
        format!(
            "idx:search:{}:{}:{}:{}",
            query.to_lowercase(),
            category.unwrap_or("_"),
            developer.unwrap_or("_"),
            limit,
        )
    }

    pub fn nft_collections(limit: i64, offset: i64) -> String {
        format!("idx:nft:collections:{limit}:{offset}")
    }

    pub fn nft_rankings(limit: i64) -> String {
        format!("idx:nft:rankings:{limit}")
    }

    pub fn nft_search(query: &str, limit: i64) -> String {
        format!("idx:nft:search:{}:{}", query.to_lowercase(), limit)
    }

    pub fn wallet_index(limit: i64, offset: i64) -> String {
        format!("idx:walletindex:{limit}:{offset}")
    }

    #[allow(clippy::too_many_arguments)]
    pub fn targeting_match(
        min_age: i32,
        min_activity: i32,
        categories: &str,
        regions: &str,
        campaign_id: &str,
        limit: i64,
        offset: i64,
    ) -> String {
        format!("idx:targeting:match:{min_age}:{min_activity}:{categories}:{regions}:{campaign_id}:{limit}:{offset}")
    }

    pub fn targeting_summary(min_age: i32, min_activity: i32, categories: &str, regions: &str, campaign_id: &str) -> String {
        format!("idx:targeting:summary:{min_age}:{min_activity}:{categories}:{regions}:{campaign_id}")
    }

    pub fn campaign_deliveries(campaign_id: &str) -> String {
        format!("idx:campaigndeliveries:{campaign_id}")
    }
}
