use anyhow::Result;

pub mod queries;
pub mod sqlx_compat;

use sqlx_compat::{raw_sql, PgPool, PgPoolOptions};

pub async fn create_pool(database_url: &str, max_connections: u32) -> Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(max_connections)
        .connect(database_url)
        .await?;

    // Schema is idempotent (CREATE TABLE/INDEX IF NOT EXISTS), so it's safe to
    // (re-)apply on every startup without a migration-tracking table.
    let schema = include_str!("../../migrations/001_initial.sql");
    raw_sql(schema).execute(&pool).await?;

    tracing::info!("Database pool created");
    Ok(pool)
}
