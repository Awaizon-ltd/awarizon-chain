//! Setup code for [`super::command`] which would otherwise bloat that module.
//!
//! Should only be used for benchmarking as it may break in other contexts.

use crate::service::FullClient;

use runtime::{AccountId, Balance, BalancesCall, SystemCall};
use sc_cli::Result;
use sc_client_api::BlockBackend;
use solochain_template_runtime as runtime;
use sp_core::{ecdsa, hashing::keccak_256, Encode, Pair};
use sp_inherents::{InherentData, InherentDataProvider};
use sp_runtime::{traits::IdentifyAccount, OpaqueExtrinsic, SaturatedConversion};

use std::{sync::Arc, time::Duration};

/// Generates extrinsics for the `benchmark overhead` command.
///
/// Note: Should only be used for benchmarking.
pub struct RemarkBuilder {
	client: Arc<FullClient>,
}

impl RemarkBuilder {
	/// Creates a new [`Self`] from the given client.
	pub fn new(client: Arc<FullClient>) -> Self {
		Self { client }
	}
}

impl frame_benchmarking_cli::ExtrinsicBuilder for RemarkBuilder {
	fn pallet(&self) -> &str {
		"system"
	}

	fn extrinsic(&self) -> &str {
		"remark"
	}

	fn build(&self, nonce: u32) -> std::result::Result<OpaqueExtrinsic, &'static str> {
		// Was `Sr25519Keyring::Bob.pair()` — accounts are H160/ecdsa now, so
		// this derives via the same well-known "//Bob" dev path, just under
		// ecdsa instead of sr25519. Note this produces a *different* address
		// than the sr25519 Bob did, and isn't one of the funded dev accounts
		// in genesis_config_presets.rs (Alith/Baltathar/Charleth/Dorothy) —
		// fund it first if running this against a real dev chain's state.
		let acc = ecdsa::Pair::from_string("//Bob", None).expect("static derivation path is valid; qed");
		let extrinsic: OpaqueExtrinsic = create_benchmark_extrinsic(
			self.client.as_ref(),
			acc,
			SystemCall::remark { remark: vec![] }.into(),
			nonce,
		)
		.into();

		Ok(extrinsic)
	}
}

/// Generates `Balances::TransferKeepAlive` extrinsics for the benchmarks.
///
/// Note: Should only be used for benchmarking.
pub struct TransferKeepAliveBuilder {
	client: Arc<FullClient>,
	dest: AccountId,
	value: Balance,
}

impl TransferKeepAliveBuilder {
	/// Creates a new [`Self`] from the given client.
	pub fn new(client: Arc<FullClient>, dest: AccountId, value: Balance) -> Self {
		Self { client, dest, value }
	}
}

impl frame_benchmarking_cli::ExtrinsicBuilder for TransferKeepAliveBuilder {
	fn pallet(&self) -> &str {
		"balances"
	}

	fn extrinsic(&self) -> &str {
		"transfer_keep_alive"
	}

	fn build(&self, nonce: u32) -> std::result::Result<OpaqueExtrinsic, &'static str> {
		let acc = ecdsa::Pair::from_string("//Bob", None).expect("static derivation path is valid; qed");
		let extrinsic: OpaqueExtrinsic = create_benchmark_extrinsic(
			self.client.as_ref(),
			acc,
			BalancesCall::transfer_keep_alive { dest: self.dest.clone().into(), value: self.value }
				.into(),
			nonce,
		)
		.into();

		Ok(extrinsic)
	}
}

/// Create a transaction using the given `call`.
///
/// Note: Should only be used for benchmarking.
pub fn create_benchmark_extrinsic(
	client: &FullClient,
	sender: ecdsa::Pair,
	call: runtime::RuntimeCall,
	nonce: u32,
) -> runtime::UncheckedExtrinsic {
	let genesis_hash = client.block_hash(0).ok().flatten().expect("Genesis block exists; qed");
	let best_hash = client.chain_info().best_hash;
	let best_block = client.chain_info().best_number;

	let period = runtime::configs::BlockHashCount::get()
		.checked_next_power_of_two()
		.map(|c| c / 2)
		.unwrap_or(2) as u64;
	let tx_ext: runtime::TxExtension = (
		frame_system::CheckNonZeroSender::<runtime::Runtime>::new(),
		frame_system::CheckSpecVersion::<runtime::Runtime>::new(),
		frame_system::CheckTxVersion::<runtime::Runtime>::new(),
		frame_system::CheckGenesis::<runtime::Runtime>::new(),
		frame_system::CheckEra::<runtime::Runtime>::from(sp_runtime::generic::Era::mortal(
			period,
			best_block.saturated_into(),
		)),
		frame_system::CheckNonce::<runtime::Runtime>::from(nonce),
		frame_system::CheckWeight::<runtime::Runtime>::new(),
		pallet_transaction_payment::ChargeTransactionPayment::<runtime::Runtime>::from(0),
		frame_metadata_hash_extension::CheckMetadataHash::<runtime::Runtime>::new(false),
		frame_system::WeightReclaim::<runtime::Runtime>::new(),
	);

	let raw_payload = runtime::SignedPayload::from_raw(
		call.clone(),
		tx_ext.clone(),
		(
			(),
			runtime::VERSION.spec_version,
			runtime::VERSION.transaction_version,
			genesis_hash,
			best_hash,
			(),
			(),
			(),
			None,
			(),
		),
	);
	// `EthereumSignature::verify` does secp256k1_ecdsa_recover(sig,
	// keccak_256(payload)), so signing must hash with keccak_256 first via
	// `sign_prehashed` — the default `Pair::sign` (blake2b-based) would
	// produce a signature this runtime's accounts can never verify.
	let signature = raw_payload.using_encoded(|e| sender.sign_prehashed(&keccak_256(e)));

	runtime::UncheckedExtrinsic::new_signed(
		call,
		fp_account::EthereumSigner::from(sender.public()).into_account(),
		runtime::Signature::new(signature),
		tx_ext,
	)
}

/// Generates inherent data for the `benchmark overhead` command.
///
/// Note: Should only be used for benchmarking.
pub fn inherent_benchmark_data() -> Result<InherentData> {
	let mut inherent_data = InherentData::new();
	let d = Duration::from_millis(0);
	let timestamp = sp_timestamp::InherentDataProvider::new(d.into());

	futures::executor::block_on(timestamp.provide_inherent_data(&mut inherent_data))
		.map_err(|e| format!("creating inherent data: {:?}", e))?;
	Ok(inherent_data)
}
