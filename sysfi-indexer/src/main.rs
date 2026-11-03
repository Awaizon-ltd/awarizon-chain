mod api;
mod cache;
mod config;
mod db;
mod indexer;

use anyhow::Result;
use cache::RedisCache;
use std::net::SocketAddr;
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("sysfi_indexer=info".parse()?)
                .add_directive("sqlx_core=warn".parse()?),
        )
        .init();

    let config = Arc::new(config::Config::from_env()?);
    tracing::info!("Starting sysfi-indexer on port {}", config.port);

    let pool = Arc::new(db::create_pool(&config.database_url, config.db_pool_size).await?);
    let cache = RedisCache::new(&config.redis_url).await.expect("Failed to connect to Redis");
    tracing::info!("Redis cache connected");

    // Ingestion loop runs in the background; the API serves whatever has
    // been indexed so far regardless of sync progress.
    {
        let config = config.clone();
        let pool = pool.clone();
        tokio::spawn(async move {
            if let Err(e) = indexer::run(config, pool).await {
                tracing::error!("Indexer stopped with error: {e:#}");
            }
        });
    }

    let app = api::build_router(pool, cache);
    let addr = format!("0.0.0.0:{}", config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    tracing::info!("API listening on {addr}");
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>()).await?;
    Ok(())
}
