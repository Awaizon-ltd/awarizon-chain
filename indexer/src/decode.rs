//! Dynamic decoding helpers on top of subxt's dynamic API.
//!
//! Event/extrinsic fields arrive as `scale_value::Composite<u32>` — a real,
//! typed decode (not a debug-string scrape). Account-shaped fields decode as
//! a nested unnamed composite of 20 byte primitives now (H160/AccountId20,
//! since the chain's hard-reset migration off AccountId32 — was 32 bytes,
//! rendered as SS58, before that), while unrelated `[u8; 32]` hash/id fields
//! (campaign_id, manifest_hash, record_id) are untouched by that migration
//! and still decode/render the original 32-byte-hex way.

use scale_value::{Composite, Primitive, Value, ValueDef};

/// Convert a decoded event/extrinsic's fields into JSON for generic capture
/// (the `events`/`extrinsics.args` columns store this regardless of pallet).
pub fn composite_to_json(composite: &Composite<u32>) -> serde_json::Value {
    serde_json::to_value(composite).unwrap_or(serde_json::Value::Null)
}

fn find_named<'a>(composite: &'a Composite<u32>, name: &str) -> Option<&'a Value<u32>> {
    match composite {
        Composite::Named(fields) => fields.iter().find(|(n, _)| n == name).map(|(_, v)| v),
        Composite::Unnamed(_) => None,
    }
}

/// Unwrap a value down to a raw `[u8; 32]`, if that's what it decodes as.
/// Handles both a bare `[u8; 32]` array (unnamed composite of 32 bytes) and a
/// one-field newtype wrapping one (e.g. `AccountId32([u8; 32])`).
fn as_bytes32(value: &Value<u32>) -> Option<[u8; 32]> {
    match &value.value {
        ValueDef::Composite(Composite::Unnamed(items)) if items.len() == 32 => {
            let mut bytes = [0u8; 32];
            for (i, item) in items.iter().enumerate() {
                bytes[i] = match &item.value {
                    ValueDef::Primitive(Primitive::U128(n)) => u8::try_from(*n).ok()?,
                    _ => return None,
                };
            }
            Some(bytes)
        }
        ValueDef::Composite(Composite::Unnamed(items)) if items.len() == 1 => as_bytes32(&items[0]),
        _ => None,
    }
}

/// Unwrap a value down to a raw `[u8; 20]` — an H160/AccountId20 account
/// field. Same shape-handling as `as_bytes32` above, just 20 bytes.
fn as_bytes20(value: &Value<u32>) -> Option<[u8; 20]> {
    match &value.value {
        ValueDef::Composite(Composite::Unnamed(items)) if items.len() == 20 => {
            let mut bytes = [0u8; 20];
            for (i, item) in items.iter().enumerate() {
                bytes[i] = match &item.value {
                    ValueDef::Primitive(Primitive::U128(n)) => u8::try_from(*n).ok()?,
                    _ => return None,
                };
            }
            Some(bytes)
        }
        ValueDef::Composite(Composite::Unnamed(items)) if items.len() == 1 => as_bytes20(&items[0]),
        _ => None,
    }
}

fn as_u128(value: &Value<u32>) -> Option<u128> {
    match &value.value {
        ValueDef::Primitive(Primitive::U128(n)) => Some(*n),
        ValueDef::Composite(Composite::Unnamed(items)) if items.len() == 1 => as_u128(&items[0]),
        _ => None,
    }
}

/// Look up a named `[u8; 32]` field (hash or id — not an account anymore,
/// see module doc) on an event/call's fields.
pub fn field_bytes32(composite: &Composite<u32>, name: &str) -> Option<[u8; 32]> {
    find_named(composite, name).and_then(as_bytes32)
}

/// Look up a named `[u8; 20]` account field.
pub fn field_bytes20(composite: &Composite<u32>, name: &str) -> Option<[u8; 20]> {
    find_named(composite, name).and_then(as_bytes20)
}

/// Look up a named numeric field, truncated/converted as needed.
pub fn field_u128(composite: &Composite<u32>, name: &str) -> Option<u128> {
    find_named(composite, name).and_then(as_u128)
}

pub fn field_u64(composite: &Composite<u32>, name: &str) -> Option<u64> {
    field_u128(composite, name).and_then(|n| u64::try_from(n).ok())
}

pub fn field_u32(composite: &Composite<u32>, name: &str) -> Option<u32> {
    field_u128(composite, name).and_then(|n| u32::try_from(n).ok())
}

pub fn field_u8(composite: &Composite<u32>, name: &str) -> Option<u8> {
    field_u128(composite, name).and_then(|n| u8::try_from(n).ok())
}

/// Render 20 raw bytes as a `0x`-prefixed hex account address — was SS58
/// (ss58Format 42) over 32 bytes before the chain's AccountId32 -> H160
/// hard-reset migration; accounts are H160/AccountId20 now, with no SS58
/// encoding at all, so this is just hex like any other byte string.
pub fn account_hex(bytes: [u8; 20]) -> String {
    format!("0x{}", hex::encode(bytes))
}

/// Render 32 raw bytes as a `0x`-prefixed hex string, for opaque ids/hashes
/// that aren't accounts (campaign_id, record_id, manifest_hash, ...).
pub fn hex32(bytes: [u8; 32]) -> String {
    format!("0x{}", hex::encode(bytes))
}

/// Hex address for a named account-shaped field. Named `field_account_hex`
/// (was `field_ss58`) — every call site in `routing.rs` just calls this one
/// function name, so renaming it here is the only change needed there.
pub fn field_account_hex(composite: &Composite<u32>, name: &str) -> Option<String> {
    field_bytes20(composite, name).map(account_hex)
}

/// Hex string for a named hash/id-shaped field.
pub fn field_hex32(composite: &Composite<u32>, name: &str) -> Option<String> {
    field_bytes32(composite, name).map(hex32)
}

/// Unwrap an `Option<T>`-shaped value (SCALE enum `Some`/`None`) to its inner
/// value, if present.
fn unwrap_option(value: &Value<u32>) -> Option<&Value<u32>> {
    match &value.value {
        ValueDef::Variant(v) if v.name == "Some" => v.values.values().next(),
        ValueDef::Variant(v) if v.name == "None" => None,
        _ => Some(value),
    }
}

/// Decode a `Vec<u8>`-shaped value as a UTF-8 string.
fn as_utf8(value: &Value<u32>) -> Option<String> {
    match &value.value {
        ValueDef::Composite(Composite::Unnamed(items)) => {
            let bytes: Option<Vec<u8>> = items
                .iter()
                .map(|v| match &v.value {
                    ValueDef::Primitive(Primitive::U128(n)) => u8::try_from(*n).ok(),
                    _ => None,
                })
                .collect();
            bytes.and_then(|b| String::from_utf8(b).ok())
        }
        ValueDef::Primitive(Primitive::String(s)) => Some(s.clone()),
        _ => None,
    }
}

/// Look up a named `Vec<u8>` or `Option<Vec<u8>>` field as a UTF-8 string.
pub fn field_string(composite: &Composite<u32>, name: &str) -> Option<String> {
    find_named(composite, name).and_then(unwrap_option).and_then(as_utf8)
}

fn as_bool(value: &Value<u32>) -> Option<bool> {
    match &value.value {
        ValueDef::Primitive(Primitive::Bool(b)) => Some(*b),
        _ => None,
    }
}

/// Look up a named `bool` field.
pub fn field_bool(composite: &Composite<u32>, name: &str) -> Option<bool> {
    find_named(composite, name).and_then(as_bool)
}

/// Decode a value shaped as `pallet_awarizon_dex::types::Asset` (`Native` or `Token(u32)`)
/// into `"native"` or `"token:42"`.
fn as_asset(value: &Value<u32>) -> Option<String> {
    match &value.value {
        ValueDef::Variant(v) if v.name == "Native" => Some("native".to_string()),
        ValueDef::Variant(v) if v.name == "Token" => {
            let id = as_u128(v.values.values().next()?)?;
            Some(format!("token:{id}"))
        }
        _ => None,
    }
}

/// Look up a named `Asset` field as `"native"` / `"token:42"`.
pub fn field_asset(composite: &Composite<u32>, name: &str) -> Option<String> {
    find_named(composite, name).and_then(as_asset)
}

/// Decode a value shaped as `pallet_awarizon_dex::types::PoolId { asset_a, asset_b }`.
fn as_pool_id(value: &Value<u32>) -> Option<(String, String)> {
    match &value.value {
        ValueDef::Composite(Composite::Named(fields)) => {
            let asset_a = fields.iter().find(|(n, _)| n == "asset_a").map(|(_, v)| v).and_then(as_asset)?;
            let asset_b = fields.iter().find(|(n, _)| n == "asset_b").map(|(_, v)| v).and_then(as_asset)?;
            Some((asset_a, asset_b))
        }
        _ => None,
    }
}

/// Look up a named `PoolId` field as an `(asset_a, asset_b)` string pair.
pub fn field_pool_id(composite: &Composite<u32>, name: &str) -> Option<(String, String)> {
    find_named(composite, name).and_then(as_pool_id)
}

/// Look up a named `Vec<Asset>` field (the DEX router's swap path) as a list of
/// `"native"` / `"token:42"` strings, in path order.
pub fn field_asset_vec(composite: &Composite<u32>, name: &str) -> Option<Vec<String>> {
    let value = find_named(composite, name)?;
    match &value.value {
        ValueDef::Composite(Composite::Unnamed(items)) => items.iter().map(as_asset).collect(),
        _ => None,
    }
}

/// Look up a named `Vec<u8>` / `BoundedVec<u8, N>` field as raw bytes (not
/// UTF-8 text) — used for `category_history`, where each byte is an
/// `AppCategory` enum discriminant rather than string data.
pub fn field_u8_vec(composite: &Composite<u32>, name: &str) -> Option<Vec<u8>> {
    let value = find_named(composite, name)?;
    match &value.value {
        ValueDef::Composite(Composite::Unnamed(items)) => items
            .iter()
            .map(|v| match &v.value {
                ValueDef::Primitive(Primitive::U128(n)) => u8::try_from(*n).ok(),
                _ => None,
            })
            .collect(),
        _ => None,
    }
}
