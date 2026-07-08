use sc_service::ChainType;
use serde_json::{map::Map, Value};
use solochain_template_runtime::WASM_BINARY;

/// Specialized `ChainSpec`. This is a specialization of the general Substrate ChainSpec type.
pub type ChainSpec = sc_service::GenericChainSpec;

fn awarizon_properties() -> Map<String, Value> {
	let mut properties = Map::new();
	properties.insert("tokenSymbol".to_string(), Value::String("RIZ".to_string()));
	properties.insert("tokenDecimals".to_string(), Value::Number(12.into()));
	properties.insert("ss58Format".to_string(), Value::Number(42.into()));
	properties
}

pub fn development_chain_spec() -> Result<ChainSpec, String> {
	Ok(ChainSpec::builder(
		WASM_BINARY.ok_or_else(|| "Development wasm not available".to_string())?,
		None,
	)
	.with_name("Awarizon Development")
	.with_id("dev")
	.with_chain_type(ChainType::Development)
	.with_genesis_config_preset_name(sp_genesis_builder::DEV_RUNTIME_PRESET)
	.with_protocol_id("awarizon")
	.with_properties(awarizon_properties())
	.build())
}

pub fn local_chain_spec() -> Result<ChainSpec, String> {
	Ok(ChainSpec::builder(
		WASM_BINARY.ok_or_else(|| "Development wasm not available".to_string())?,
		None,
	)
	.with_name("Awarizon Local")
	.with_id("local_testnet")
	.with_chain_type(ChainType::Local)
	.with_genesis_config_preset_name(sp_genesis_builder::LOCAL_TESTNET_RUNTIME_PRESET)
	.with_protocol_id("awarizon")
	.with_properties(awarizon_properties())
	.build())
}

pub fn public_testnet_chain_spec() -> Result<ChainSpec, String> {
	Ok(ChainSpec::builder(
		WASM_BINARY.ok_or_else(|| "Development wasm not available".to_string())?,
		None,
	)
	.with_name("Awarizon Public Testnet")
	.with_id("public_testnet")
	.with_chain_type(ChainType::Live)
	.with_genesis_config_preset_name("public-testnet")
	.with_protocol_id("awarizon")
	.with_properties(awarizon_properties())
	.build())
}
