mod api;
mod config;
mod db;
mod decode;
mod indexer;

use anyhow::Result;
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

    let (block_tx, _) = broadcast::channel::<serde_json::Value>(256);

    // Indexer sync loop runs in the background; the API serves whatever has
    // been indexed so far regardless of sync progress.
    {
        let config = config.clone();
        let pool = pool.clone();
        let block_tx = block_tx.clone();
        tokio::spawn(async move {
            if let Err(e) = indexer::run(config, pool, block_tx).await {
                tracing::error!("Indexer stopped with error: {}", e);
            }
        });
    }

    let app = api::build_router(pool, block_tx);
    let addr = format!("0.0.0.0:{}", config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    tracing::info!("API listening on {}", addr);
    axum::serve(listener, app).await?;

    Ok(())
}
