//! Thin re-export layer over `sqlx-core` + `sqlx-postgres` (bypassing the `sqlx`
//! facade crate). The facade unconditionally version-locks `sqlx-mysql`, which
//! pulls in `rsa` -> `zeroize` -> `zeroize_derive` at a version that requires a
//! newer edition than this workspace's pinned rustc supports — even though
//! mysql support is never activated or compiled. Depending on the backend
//! crates directly avoids that dead dependency entirely.

pub use sqlx_core::raw_sql::raw_sql;
pub use sqlx_core::row::Row;
pub use sqlx_core::types;
pub use sqlx_postgres::{PgPool, PgPoolOptions, Postgres};

pub fn query(sql: &str) -> sqlx_core::query::Query<'_, Postgres, <Postgres as sqlx_core::database::Database>::Arguments<'_>> {
    sqlx_core::query::query::<Postgres>(sql)
}
