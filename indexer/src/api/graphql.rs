use crate::db::sqlx_compat::{PgPool, Row};
use crate::db::sqlx_compat as db;
use async_graphql::{Context, EmptyMutation, EmptySubscription, Object, Schema, SimpleObject};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use axum::extract::State;
use std::sync::Arc;

pub type AppSchema = Schema<QueryRoot, EmptyMutation, EmptySubscription>;

#[derive(SimpleObject)]
pub struct Block {
    pub block_number: i64,
    pub block_hash: String,
    pub extrinsic_count: i32,
    pub event_count: i32,
    pub timestamp_ms: Option<i64>,
}

#[derive(SimpleObject)]
pub struct Transaction {
    pub block_number: i64,
    pub block_hash: String,
    pub from_address: String,
    pub to_address: String,
    pub amount: String,
    pub timestamp_ms: Option<i64>,
}

#[derive(SimpleObject)]
pub struct IndexerStats {
    pub last_indexed_block: i64,
    pub total_blocks: i64,
    pub total_transfers: i64,
    pub total_extrinsics: i64,
}

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    async fn blocks(&self, ctx: &Context<'_>, limit: Option<i64>) -> async_graphql::Result<Vec<Block>> {
        let pool = ctx.data::<Arc<PgPool>>()?;
        let limit = limit.unwrap_or(20).min(100);

        let rows = db::query("SELECT * FROM blocks ORDER BY block_number DESC LIMIT $1")
            .bind(limit)
            .fetch_all(pool.as_ref())
            .await?;

        Ok(rows
            .into_iter()
            .map(|r| Block {
                block_number: r.get("block_number"),
                block_hash: r.get("block_hash"),
                extrinsic_count: r.get("extrinsic_count"),
                event_count: r.get("event_count"),
                timestamp_ms: r.get("timestamp_ms"),
            })
            .collect())
    }

    async fn block(&self, ctx: &Context<'_>, number: i64) -> async_graphql::Result<Option<Block>> {
        let pool = ctx.data::<Arc<PgPool>>()?;

        let row = db::query("SELECT * FROM blocks WHERE block_number = $1")
            .bind(number)
            .fetch_optional(pool.as_ref())
            .await?;

        Ok(row.map(|r| Block {
            block_number: r.get("block_number"),
            block_hash: r.get("block_hash"),
            extrinsic_count: r.get("extrinsic_count"),
            event_count: r.get("event_count"),
            timestamp_ms: r.get("timestamp_ms"),
        }))
    }

    async fn transactions(
        &self,
        ctx: &Context<'_>,
        address: String,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> async_graphql::Result<Vec<Transaction>> {
        let pool = ctx.data::<Arc<PgPool>>()?;
        let limit = limit.unwrap_or(20).min(100);
        let offset = offset.unwrap_or(0);

        let rows = db::query(
            r#"
            SELECT block_number, block_hash, from_address, to_address,
                   amount_planck::TEXT as amount, timestamp_ms
            FROM transfers
            WHERE from_address = $1 OR to_address = $1
            ORDER BY block_number DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(&address)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool.as_ref())
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| Transaction {
                block_number: r.get("block_number"),
                block_hash: r.get("block_hash"),
                from_address: r.get("from_address"),
                to_address: r.get("to_address"),
                amount: r.get("amount"),
                timestamp_ms: r.get("timestamp_ms"),
            })
            .collect())
    }

    async fn stats(&self, ctx: &Context<'_>) -> async_graphql::Result<IndexerStats> {
        let pool = ctx.data::<Arc<PgPool>>()?;
        let stats = crate::db::queries::get_indexer_stats(pool).await?;

        Ok(IndexerStats {
            last_indexed_block: stats["lastIndexedBlock"].as_i64().unwrap_or(0),
            total_blocks: stats["totalBlocks"].as_i64().unwrap_or(0),
            total_transfers: stats["totalTransfers"].as_i64().unwrap_or(0),
            total_extrinsics: stats["totalExtrinsics"].as_i64().unwrap_or(0),
        })
    }
}

pub async fn graphql_handler(State(schema): State<AppSchema>, req: GraphQLRequest) -> GraphQLResponse {
    schema.execute(req.into_inner()).await.into()
}

pub async fn graphql_playground() -> impl axum::response::IntoResponse {
    axum::response::Html(async_graphql::http::playground_source(async_graphql::http::GraphQLPlaygroundConfig::new(
        "/graphql",
    )))
}
