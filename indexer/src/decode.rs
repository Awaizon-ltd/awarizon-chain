//! Dynamic decoding helpers on top of subxt's dynamic API.
//!
//! Event/extrinsic fields arrive as `scale_value::Composite<u32>` — a real,
//! typed decode (not a debug-string scrape). `[u8; 32]` fields (accounts,
//! hashes) decode as a nested unnamed composite of 32 byte primitives, so the
//! helpers here unwrap that shape into raw bytes, which callers then render
//! as SS58 (accounts) or hex (opaque hashes/ids) depending on what the field
//! actually represents.

use scale_value::{Composite, Primitive, Value, ValueDef};
use subxt::utils::AccountId32;

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

fn as_u128(value: &Value<u32>) -> Option<u128> {
    match &value.value {
        ValueDef::Primitive(Primitive::U128(n)) => Some(*n),
        ValueDef::Composite(Composite::Unnamed(items)) if items.len() == 1 => as_u128(&items[0]),
        _ => None,
    }
}

/// Look up a named `[u8; 32]` field (account, hash, or id) on an event/call's fields.
pub fn field_bytes32(composite: &Composite<u32>, name: &str) -> Option<[u8; 32]> {
    find_named(composite, name).and_then(as_bytes32)
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

/// Render 32 raw bytes as an SS58 address (ss58Format 42, this chain's default —
/// see node/src/chain_spec.rs).
pub fn ss58(bytes: [u8; 32]) -> String {
    AccountId32(bytes).to_string()
}

/// Render 32 raw bytes as a `0x`-prefixed hex string, for opaque ids/hashes
/// that aren't accounts (campaign_id, record_id, manifest_hash, ...).
pub fn hex32(bytes: [u8; 32]) -> String {
    format!("0x{}", hex::encode(bytes))
}

/// SS58 address for a named account-shaped field.
pub fn field_ss58(composite: &Composite<u32>, name: &str) -> Option<String> {
    field_bytes32(composite, name).map(ss58)
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
