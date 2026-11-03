//! Resolves NFT collection/item off-chain metadata JSON (hosted by whoever
//! minted — Cloudinary for rizart.xyz, potentially IPFS elsewhere) into the
//! `name`/`image_url`/`banner_url`/`description` columns that REST responses
//! serve directly. Without this, every grid/card view in the marketplace
//! frontend would only ever see the raw `metadata_uri` string and show a
//! placeholder — only a page that fetches metadata client-side itself would
//! ever render real art.
//!
//! **Numbered-collection support**: a large generative drop (e.g. a
//! 9,999-item PFP collection) doesn't give every item its own metadata URI —
//! the creator hosts ONE combined JSON file covering the whole collection:
//! its own `name`/`description` *and* an `items` object keyed by item id as
//! a decimal string (`{"name": "...", "items": {"2014": {"name": ...,
//! "image": ...}, ...}}`). That single file is both the collection's AND
//! every item's on-chain metadataUri. Collection resolution reads the
//! top-level fields as usual; item resolution looks inside `items` by id
//! instead — see `extract_item_fields`. A plain standalone item file (no
//! `items` key) is read directly, unchanged. Because many items share one
//! URI, fetched bodies are cached in-process (`METADATA_CACHE`) so a
//! 9,999-item drop costs one HTTP fetch total, not one per item.
//!
//! Resolution is deliberately kept off the block-processing hot path: it's
//! spawned fire-and-forget from routing.rs the moment a *MetadataSet event
//! is seen, so a slow or dead metadata host never stalls indexing. A
//! periodic backfill sweep (`run_backfill_loop`) catches anything that
//! failed transiently or was minted before this resolver existed — it only
//! ever selects rows still missing `image_url`, so steady-state traffic is
//! one fetch per row, once, not a recurring poll.

use crate::db::queries;
use crate::db::sqlx_compat::PgPool;
use once_cell::sync::Lazy;
use serde_json::Value;
use std::collections::HashMap;
use std::time::Duration;
use tokio::sync::Mutex as AsyncMutex;

const REQUEST_TIMEOUT: Duration = Duration::from_secs(8);
const BACKFILL_INTERVAL: Duration = Duration::from_secs(300);
const BACKFILL_BATCH: i64 = 25;

static HTTP: Lazy<reqwest::Client> = Lazy::new(|| {
    reqwest::Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .user_agent("awarizon-indexer/nft-metadata-resolver")
        .build()
        .expect("failed to build metadata resolver HTTP client")
});

/// Raw fetched-JSON cache, keyed by the off-chain URI. Exists so a shared
/// numbered-collection manifest (one URI, thousands of items) is only ever
/// fetched once instead of once per item.
static METADATA_CACHE: Lazy<AsyncMutex<HashMap<String, Value>>> =
    Lazy::new(|| AsyncMutex::new(HashMap::new()));

#[derive(Default)]
struct NftMetadataJson {
    name: Option<String>,
    description: Option<String>,
    image: Option<String>,
    banner_image: Option<String>,
}

fn resolve_uri(uri: &str) -> String {
    if let Some(rest) = uri.strip_prefix("ipfs://") {
        format!("https://ipfs.io/ipfs/{rest}")
    } else {
        uri.to_string()
    }
}

fn parse_fields(value: &Value) -> NftMetadataJson {
    let str_field = |key: &str| value.get(key).and_then(Value::as_str).map(String::from);
    NftMetadataJson {
        name: str_field("name"),
        description: str_field("description"),
        image: str_field("image"),
        banner_image: str_field("banner_image"),
    }
}

/// See the module doc for the combined collection+items file convention
/// this implements. A file with an `items` object is a numbered-collection
/// manifest — look the item up inside it by id, decimal-string-keyed.
/// Anything else is read as a standalone single-item metadata file.
fn extract_item_fields(value: &Value, item_id: i64) -> NftMetadataJson {
    match value.get("items").and_then(|items| items.get(item_id.to_string())) {
        Some(entry) => parse_fields(entry),
        None if value.get("items").is_some() => NftMetadataJson::default(),
        None => parse_fields(value),
    }
}

async fn fetch_json(uri: &str) -> Option<Value> {
    if let Some(cached) = METADATA_CACHE.lock().await.get(uri).cloned() {
        return Some(cached);
    }

    let url = resolve_uri(uri);
    let resp = match HTTP.get(&url).send().await {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!("metadata resolver: request to {} failed: {}", url, e);
            return None;
        }
    };
    if !resp.status().is_success() {
        tracing::warn!("metadata resolver: {} returned {}", url, resp.status());
        return None;
    }
    let value = match resp.json::<Value>().await {
        Ok(v) => v,
        Err(e) => {
            tracing::warn!("metadata resolver: {} did not parse as JSON: {}", url, e);
            return None;
        }
    };

    METADATA_CACHE.lock().await.insert(uri.to_string(), value.clone());
    Some(value)
}

/// Fire-and-forget resolution of a collection's metadata. Non-blocking by
/// design — call sites don't (and shouldn't) await this.
pub fn spawn_resolve_collection(pool: PgPool, collection_id: i64, uri: String) {
    tokio::spawn(async move {
        let Some(value) = fetch_json(&uri).await else { return };
        let meta = parse_fields(&value);
        if let Err(e) = queries::set_nft_collection_resolved_metadata(
            &pool,
            collection_id,
            meta.name.as_deref(),
            meta.image.as_deref(),
            meta.banner_image.as_deref(),
            meta.description.as_deref(),
        )
        .await
        {
            tracing::warn!("metadata resolver: failed to store collection #{} metadata: {}", collection_id, e);
        }
    });
}

/// Fire-and-forget resolution of an item's metadata. See
/// `spawn_resolve_collection` and the module doc for manifest handling.
pub fn spawn_resolve_item(pool: PgPool, collection_id: i64, item_id: i64, uri: String) {
    tokio::spawn(async move {
        let Some(value) = fetch_json(&uri).await else { return };
        let meta = extract_item_fields(&value, item_id);
        if let Err(e) = queries::set_nft_item_resolved_metadata(
            &pool,
            collection_id,
            item_id,
            meta.name.as_deref(),
            meta.image.as_deref(),
            meta.description.as_deref(),
        )
        .await
        {
            tracing::warn!(
                "metadata resolver: failed to store item ({}, {}) metadata: {}",
                collection_id, item_id, e
            );
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn standalone_item_metadata_is_read_directly() {
        let value = json!({ "name": "Ape #2014", "image": "ipfs://img2014" });
        let meta = extract_item_fields(&value, 2014);
        assert_eq!(meta.name.as_deref(), Some("Ape #2014"));
        assert_eq!(meta.image.as_deref(), Some("ipfs://img2014"));
    }

    #[test]
    fn manifest_item_is_looked_up_inside_the_items_map() {
        let value = json!({
            "name": "My Collection",
            "description": "A numbered drop",
            "items": {
                "2014": { "name": "Ape #2014", "image": "ipfs://img2014" },
                "2015": { "name": "Ape #2015", "image": "ipfs://img2015" },
            },
        });
        let meta = extract_item_fields(&value, 2014);
        assert_eq!(meta.name.as_deref(), Some("Ape #2014"));
        assert_eq!(meta.image.as_deref(), Some("ipfs://img2014"));

        let other = extract_item_fields(&value, 2015);
        assert_eq!(other.name.as_deref(), Some("Ape #2015"));

        // Collection-level resolution reads the same file's top-level fields.
        let collection_meta = parse_fields(&value);
        assert_eq!(collection_meta.name.as_deref(), Some("My Collection"));
    }

    #[test]
    fn missing_manifest_entry_resolves_to_empty() {
        let value = json!({
            "name": "My Collection",
            "items": { "2014": { "name": "Ape #2014", "image": "ipfs://img2014" } },
        });
        let meta = extract_item_fields(&value, 9999);
        assert!(meta.name.is_none());
        assert!(meta.image.is_none());
    }
}

/// Runs forever, sweeping up collections/items whose metadata_uri is known
/// but whose image_url never got resolved (pre-resolver mints, or a
/// transient failure in the fire-and-forget path above). Intended to be
/// spawned once at process startup.
pub async fn run_backfill_loop(pool: PgPool) {
    let mut interval = tokio::time::interval(BACKFILL_INTERVAL);
    loop {
        interval.tick().await;

        match queries::unresolved_nft_collections(&pool, BACKFILL_BATCH).await {
            Ok(rows) => {
                for (collection_id, uri) in rows {
                    spawn_resolve_collection(pool.clone(), collection_id, uri);
                }
            }
            Err(e) => tracing::warn!("metadata resolver: backfill collection scan failed: {}", e),
        }

        match queries::unresolved_nft_items(&pool, BACKFILL_BATCH).await {
            Ok(rows) => {
                for (collection_id, item_id, uri) in rows {
                    spawn_resolve_item(pool.clone(), collection_id, item_id, uri);
                }
            }
            Err(e) => tracing::warn!("metadata resolver: backfill item scan failed: {}", e),
        }
    }
}
