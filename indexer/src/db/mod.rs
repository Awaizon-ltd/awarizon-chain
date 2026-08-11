use anyhow::Result;

pub mod queries;
pub mod sqlx_compat;

use sqlx_compat::{raw_sql, PgPool, PgPoolOptions};

pub async fn create_pool(database_url: &str, max_connections: u32) -> Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(max_connections)
        .connect(database_url)
        .await?;

    // Schema is idempotent (CREATE TABLE/INDEX/ADD COLUMN IF NOT EXISTS), so
    // it's safe to (re-)apply on every startup without a migration-tracking
    // table.
    let schema = include_str!("../../migrations/001_initial.sql");
    raw_sql(schema).execute(&pool).await?;

    let extrinsic_hash_migration = include_str!("../../migrations/002_add_extrinsic_hash.sql");
    raw_sql(extrinsic_hash_migration).execute(&pool).await?;

    let dex_tables_migration = include_str!("../../migrations/003_add_dex_tables.sql");
    raw_sql(dex_tables_migration).execute(&pool).await?;

    let nft_tables_migration = include_str!("../../migrations/004_add_nft_tables.sql");
    raw_sql(nft_tables_migration).execute(&pool).await?;

    let asset_tables_migration = include_str!("../../migrations/005_add_asset_tables.sql");
    raw_sql(asset_tables_migration).execute(&pool).await?;

    let wallet_index_migration = include_str!("../../migrations/006_add_wallet_index.sql");
    raw_sql(wallet_index_migration).execute(&pool).await?;

    tracing::info!("Database pool created");
    Ok(pool)
}
