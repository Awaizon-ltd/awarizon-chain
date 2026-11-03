mod api;
mod cache;
mod config;
mod db;
mod decode;
mod indexer;
mod notifications;

use anyhow::Result;
use cache::RedisCache;
use notifications::NotificationService;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::broadcast;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("awarizon_indexer=info".parse()?)
                .add_directive("sqlx_core=warn".parse()?),
        )
        .init();

    let config = Arc::new(config::Config::from_env()?);

    tracing::info!("Starting Awarizon Indexer on port {}", config.port);

    let pool = Arc::new(db::create_pool(&config.database_url, config.db_pool_size).await?);

    let cache = RedisCache::new(&config.redis_url).await.expect("Failed to connect to Redis");
    tracing::info!("Redis cache connected");
    let notifier = Arc::new(NotificationService::new(cache.clone()));

    let (block_tx, _) = broadcast::channel::<serde_json::Value>(256);

    // Indexer sync loop runs in the background; the API serves whatever has
    // been indexed so far regardless of sync progress.
    {
        let config = config.clone();
        let pool = pool.clone();
        let notifier = notifier.clone();
        let block_tx = block_tx.clone();
        tokio::spawn(async move {
            if let Err(e) = indexer::run(config, pool, notifier, block_tx).await {
                tracing::error!("Indexer stopped with error: {}", e);
            }
        });
    }

    // Periodic sweep for NFT collections/items whose metadata_uri was set
    // but never resolved into name/image_url/banner_url — see
    // indexer::metadata_resolver for why this is separate from the
    // per-event fire-and-forget resolution in routing.rs.
    {
        let pool = pool.as_ref().clone();
        tokio::spawn(indexer::metadata_resolver::run_backfill_loop(pool));
    }

    // Periodic pruning of indexed data older than the retention window, to
    // keep the database bounded in line with the node's --state-pruning.
    {
        let pool = pool.as_ref().clone();
        tokio::spawn(indexer::pruning::run_pruning_loop(
            pool,
            config.prune_retention_blocks,
            config.prune_interval_secs,
        ));
    }

    let app = api::build_router(pool, cache, notifier, block_tx);
    let addr = format!("0.0.0.0:{}", config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    tracing::info!("API listening on {}", addr);
    // into_make_service_with_connect_info is required for the rate limiter's
    // ConnectInfo<SocketAddr> extractor to resolve.
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>()).await?;

    Ok(())
}
