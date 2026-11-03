use std::{collections::BTreeMap, str::FromStr};

use hex_literal::hex;
use sc_chain_spec::{ChainType, Properties};
use sp_consensus_aura::sr25519::AuthorityId as AuraId;
use sp_consensus_grandpa::AuthorityId as GrandpaId;
use sp_core::{Pair, Public, H160, U256};
use sp_runtime::traits::Verify;

use sysfi_runtime::{AccountId, Balance, Signature, WASM_BINARY};

/// Specialized `ChainSpec`.
pub type ChainSpec = sc_service::GenericChainSpec;

/// SysFi's real, reserved EVM chain IDs.
pub const SYSFI_TESTNET_CHAIN_ID: u64 = 76081;
/// Reserved for the eventual mainnet spec — not wired up yet.
#[allow(dead_code)]
pub const SYSFI_MAINNET_CHAIN_ID: u64 = 7608;

const UNITS: Balance = 1_000_000_000_000_000_000; // 18 decimals, wei-aligned.

pub fn get_from_seed<TPublic: Public>(seed: &str) -> <TPublic::Pair as Pair>::Public {
	TPublic::Pair::from_string(&format!("//{}", seed), None)
		.expect("static values are valid; qed")
		.public()
}

#[allow(dead_code)]
type AccountPublic = <Signature as Verify>::Signer;

pub fn authority_keys_from_seed(s: &str) -> (AuraId, GrandpaId) {
	(get_from_seed::<AuraId>(s), get_from_seed::<GrandpaId>(s))
}

fn properties() -> Properties {
	let mut properties = Properties::new();
	properties.insert("tokenSymbol".into(), "SYN".into());
	// Wei-aligned, unlike Awarizon's 12 — see plan: MetaMask/wei math assumes
	// the native balance's smallest unit lines up 1:1 with wei.
	properties.insert("tokenDecimals".into(), 18.into());
	properties
}

pub fn development_config() -> ChainSpec {
	ChainSpec::builder(WASM_BINARY.expect("WASM not available"), Default::default())
		.with_name("SysFi Development")
		.with_id("dev")
		.with_chain_type(ChainType::Development)
		.with_properties(properties())
		.with_genesis_config_patch(testnet_genesis(
			// Sudo account (Alith — Frontier/Moonbeam's well-known dev key)
			AccountId::from(hex!("f24FF3a9CF04c71Dbc94D0b566f7A27B94566cac")),
			vec![
				AccountId::from(hex!("f24FF3a9CF04c71Dbc94D0b566f7A27B94566cac")), // Alith
				AccountId::from(hex!("3Cd0A705a2DC65e5b1E1205896BaA2be8A07c6e0")), // Baltathar
				AccountId::from(hex!("798d4Ba9baf0064Ec19eB4F0a1a45785ae9D6DFc")), // Charleth
			],
			vec![authority_keys_from_seed("Alice")],
			SYSFI_TESTNET_CHAIN_ID,
		))
		.build()
}

pub fn local_testnet_config() -> ChainSpec {
	ChainSpec::builder(WASM_BINARY.expect("WASM not available"), Default::default())
		.with_name("SysFi Local Testnet")
		.with_id("local_testnet")
		.with_chain_type(ChainType::Local)
		.with_properties(properties())
		.with_genesis_config_patch(testnet_genesis(
			AccountId::from(hex!("f24FF3a9CF04c71Dbc94D0b566f7A27B94566cac")), // Alith
			vec![
				AccountId::from(hex!("f24FF3a9CF04c71Dbc94D0b566f7A27B94566cac")), // Alith
				AccountId::from(hex!("3Cd0A705a2DC65e5b1E1205896BaA2be8A07c6e0")), // Baltathar
				AccountId::from(hex!("798d4Ba9baf0064Ec19eB4F0a1a45785ae9D6DFc")), // Charleth
			],
			vec![authority_keys_from_seed("Alice"), authority_keys_from_seed("Bob")],
			SYSFI_TESTNET_CHAIN_ID,
		))
		.build()
}

/// SysFi's public testnet (tSYN). Chain ID 76081. Real sudo/validator keys,
/// real faucet/treasury/sale/airdrop wallets, and the actual token-allocation
/// vesting contracts — this is the one that goes on a VPS, not a dev preset.
///
/// Vesting: `SysFiVestingWallet` (Solidity, linear-with-cliff, native-SYN
/// vesting) — source at `docs/sysfi-vesting-wallet/SysFiVestingWallet.sol`,
/// compiled with solc 0.8.26 (optimizer, 200 runs). Deployed directly at
/// genesis (bytecode + storage slots baked in, no deploy transaction) since
/// genesis injection skips the constructor entirely — the slots below were
/// taken from solc's own `storageLayout` output, not hand-computed:
///   slot 0: `beneficiary` (address, low 20 bytes) | `start` (uint64, next 8 bytes)
///   slot 1: `duration` (uint64)
///   slot 2: `released` (uint256) — left at 0
pub fn public_testnet_config() -> ChainSpec {
	ChainSpec::builder(WASM_BINARY.expect("WASM not available"), Default::default())
		.with_name("SysFi Testnet")
		.with_id("sysfi_testnet")
		.with_chain_type(ChainType::Live)
		.with_protocol_id("sysfi-testnet")
		.with_properties(properties())
		.with_genesis_config_patch(public_testnet_genesis())
		.build()
}

/// One linear-vesting-with-cliff allocation bucket, injected as a genesis EVM
/// contract account.
struct VestingBucket {
	/// Where the vesting contract itself lives.
	contract: [u8; 20],
	/// Who can eventually `release()` the vested tokens.
	beneficiary: [u8; 20],
	/// Cliff length in days — nothing vests before `TGE + cliff_days`.
	cliff_days: u64,
	/// Linear-vesting length in days, starting once the cliff ends.
	vesting_days: u64,
	/// Whole-token allocation (i.e. before applying 18 decimals).
	tokens: u128,
}

/// Deployed (runtime) bytecode for `SysFiVestingWallet`, solc 0.8.26,
/// optimizer enabled (200 runs). No `immutable` fields — genesis injection
/// sets storage slots directly, so every constructor argument had to be a
/// plain storage variable instead (see the doc comment above for slots).
/// Generated programmatically from the compiler's own JSON output — not
/// hand-transcribed — to rule out copy errors in a blob this size.
fn vesting_wallet_bytecode() -> Vec<u8> {
	hex!(
		"608060405260043610610071575f3560e01c806386d1a69f1161004c57806386d1a69f1461011d5780639613252114610133\
		578063be9a655514610148578063fbccedae1461016e575f80fd5b80630a17b06b1461007c5780630fb5a6b4146100ae5780\
		6338af3eed146100e7575f80fd5b3661007857005b5f80fd5b348015610087575f80fd5b5061009b6100963660046103ca56\
		5b610182565b6040519081526020015b60405180910390f35b3480156100b9575f80fd5b506001546100ce9067ffffffffff\
		ffffff1681565b60405167ffffffffffffffff90911681526020016100a5565b3480156100f2575f80fd5b505f5461010590\
		6001600160a01b031681565b6040516001600160a01b0390911681526020016100a5565b348015610128575f80fd5b506101\
		31610247565b005b34801561013e575f80fd5b5061009b60025481565b348015610153575f80fd5b505f546100ce90600160\
		a01b900467ffffffffffffffff1681565b348015610179575f80fd5b5061009b6103ae565b5f806002544761019291906104\
		05565b5f5490915067ffffffffffffffff600160a01b909104811690841610156101bb57505f92915050565b6001545f5461\
		01de9167ffffffffffffffff90811691600160a01b90041661041e565b67ffffffffffffffff168367ffffffffffffffff16\
		106101fe5792915050565b6001545f5467ffffffffffffffff9182169161022291600160a01b9004168561043e565b610236\
		9067ffffffffffffffff168361045e565b6102409190610475565b9392505050565b5f6102506103ae565b90505f81116102\
		b55760405162461bcd60e51b815260206004820152602660248201527f537973466956657374696e6757616c6c65743a206e\
		6f7468696e6720746f2072604482015265656c6561736560d01b60648201526084015b60405180910390fd5b8060025f8282\
		546102c69190610405565b90915550505f80546040516001600160a01b039091169083908381818185875af1925050503d80\
		5f8114610315576040519150601f19603f3d011682016040523d82523d5f602084013e61031a565b606091505b5050905080\
		6103775760405162461bcd60e51b815260206004820152602360248201527f537973466956657374696e6757616c6c65743a\
		207472616e73666572206661696044820152621b195960ea1b60648201526084016102ac565b6040518281527ffb81f9b30d\
		73d830c3544b34d827c08142579ee75710b490bab0b3995468c5659060200160405180910390a15050565b5f6002546103bb\
		42610182565b6103c59190610494565b905090565b5f602082840312156103da575f80fd5b813567ffffffffffffffff8116\
		8114610240575f80fd5b634e487b7160e01b5f52601160045260245ffd5b80820180821115610418576104186103f1565b92\
		915050565b67ffffffffffffffff8181168382160190811115610418576104186103f1565b67ffffffffffffffff82811682\
		82160390811115610418576104186103f1565b8082028115828204841417610418576104186103f1565b5f8261048f57634e\
		487b7160e01b5f52601260045260245ffd5b500490565b81810381811115610418576104186103f156fea264697066735822\
		1220be05d410906405d0797345e439c3e2995184d9ed1418c23b79cced849cc221dc64736f6c634300081a0033"
	)
	.to_vec()
}

fn public_testnet_genesis() -> serde_json::Value {
	// TGE (token generation event) anchor — every cliff/vesting window below
	// is computed relative to this fixed instant, not "whenever this file
	// happens to be built", so the genesis JSON is reproducible.
	const TGE_UNIX: u64 = 1_788_825_600; // 2026-09-08T00:00:00Z
	const DAY: u64 = 86_400;

	// Real validator keys (sr25519/Aura, ed25519/Grandpa) generated via
	// `sysfi-node key generate` — NOT dev seeds. Before this genesis is used
	// for a real run, insert the matching secret into the VPS's keystore via
	// `author_insertKey` (key type "aura" / "gran") rather than ever storing
	// the seed in this repo.
	let aura_authority: AuraId =
		sp_core::sr25519::Public::from_raw(hex!("1e4f132c42222685eb6bcd3c91e4fceacb17b6a17d06c9e9e6cdddbacec9b65c")).into();
	let grandpa_authority: GrandpaId =
		sp_core::ed25519::Public::from_raw(hex!("8392e915a844f4a1af89c739ca757e6d12894c4922f70654dc7d995d0942d934")).into();

	// Real sudo key — generated fresh, not Alice/dev. Operational balance
	// only (covers its own tx fees); it has no allocation-bucket funds.
	let sudo_key = AccountId::from(hex!("1CB4bF15ae435C447391a023fD1a375959166e6A"));

	// Faucet — dispenses tSYN to testnet users. 10M tSYN, no vesting.
	let faucet = AccountId::from(hex!("307CD508739673128fBf25a2ECB350cEff2d9b4D"));

	// The 4 liquid (no-vesting-contract-needed) tokenomics buckets — real
	// wallets, generated fresh for this purpose.
	let validator_reserve = AccountId::from(hex!("C17943E3F83574ef8e47b2a75c0929249fB603b2")); // 150M
	let foundation_liquid = AccountId::from(hex!("DC22660b99601A00Af8d92901723C9FD85685782")); // 30M (20% of Foundation's 150M)
	let public_sale_liquidity = AccountId::from(hex!("652BAC7Dc830bd7E9fB185e6f349C5B9b30BDD2b")); // 100M
	let airdrop = AccountId::from(hex!("4C2ef2e444E5E40c914C4B789b6442ab832345B8")); // 50M

	let mut balances: Vec<(AccountId, u128)> = vec![
		(sudo_key.clone(), 10_000u128 * UNITS),
		(faucet, 10_000_000u128 * UNITS),
		(validator_reserve, 150_000_000u128 * UNITS),
		(foundation_liquid, 30_000_000u128 * UNITS),
		(public_sale_liquidity, 100_000_000u128 * UNITS),
		(airdrop, 50_000_000u128 * UNITS),
	];

	// The 5 vested buckets — each gets its own `SysFiVestingWallet` instance.
	//
	// Funded via this same `balances` list (pallet_balances genesis), NOT via
	// `evm.accounts[..].balance` — verified on a live node that pallet_evm's
	// own genesis build doesn't reliably credit `frame_system::Account`
	// (nonce/balance) for an address that *also* gets `code` in the same
	// entry: `eth_getCode`/`eth_getStorageAt` came back correct, but
	// `eth_getBalance`/`eth_getTransactionCount` both read back 0 for such an
	// account, while a plain no-code `evm.accounts` entry (and every
	// `balances`-pallet-funded EOA) was correct. `evm.accounts` below is
	// therefore code+storage only; balance comes from here instead.
	// Beneficiaries marked "(placeholder)" are well-known dev keys, standing
	// in until real recipient addresses are ready — swap the `beneficiary`
	// bytes below, nothing else needs to change.
	let vesting_buckets = [
		VestingBucket {
			contract: hex!("4E96FBE2b12b2f1c487616BA7BAF9D48678A2602"),
			beneficiary: hex!("773539d4Ac0e786233D90A233654ccEE26a613D9"), // Dorothy (placeholder)
			cliff_days: 180,
			vesting_days: 1460, // 4 years
			tokens: 300_000_000,
		},
		VestingBucket {
			contract: hex!("853D2ecc341ECAD13b870c5305746A52928eF645"),
			beneficiary: hex!("Ff64d3F6efE2317EE2807d223a0Bdc4c0c49dfDB"), // Ethan (placeholder)
			cliff_days: 365,
			vesting_days: 1095, // 3 years
			tokens: 150_000_000,
		},
		VestingBucket {
			contract: hex!("7F8B4A3eA0708eA37cb3Ed0E6ce0a92108E9e772"),
			beneficiary: hex!("DC22660b99601A00Af8d92901723C9FD85685782"), // Foundation (real — same wallet as its liquid slice)
			cliff_days: 0,
			vesting_days: 1095, // 3 years, no cliff
			tokens: 120_000_000, // remaining 80% of Foundation's 150M
		},
		VestingBucket {
			contract: hex!("84C8e16Bb302EFD1e44beEaE59175Fb05258f2a8"),
			beneficiary: hex!("C0F0f4ab324C46e55D02D0033343B4Be8A55532d"), // Faith (placeholder)
			cliff_days: 180,
			vesting_days: 730, // 2 years
			tokens: 50_000_000,
		},
		VestingBucket {
			contract: hex!("7B95a9fA99146E8469Cb0be3290E073EcB2dE03c"),
			beneficiary: hex!("7BF369283338E12C90514468aa3868A551AB2929"), // Goliath (placeholder)
			cliff_days: 365,
			vesting_days: 730, // 2 years
			tokens: 50_000_000,
		},
	];

	let code = vesting_wallet_bytecode();
	let mut evm_accounts: BTreeMap<H160, fp_evm::GenesisAccount> = BTreeMap::new();
	for b in &vesting_buckets {
		let start = TGE_UNIX + b.cliff_days * DAY;
		let duration = b.vesting_days * DAY;

		// slot0 = (start << 160) | beneficiary — packed exactly as solc laid
		// it out (beneficiary at offset 0, start at offset 20, same slot).
		let mut slot0 = [0u8; 32];
		slot0[12..32].copy_from_slice(&b.beneficiary);
		slot0[4..12].copy_from_slice(&start.to_be_bytes());

		let mut slot1 = [0u8; 32];
		slot1[24..32].copy_from_slice(&duration.to_be_bytes());

		let mut storage = BTreeMap::new();
		storage.insert(sp_core::H256::zero(), sp_core::H256::from(slot0));
		storage.insert(sp_core::H256::from_low_u64_be(1), sp_core::H256::from(slot1));

		// Balance goes through the `balances` list above, not here — see the
		// comment on `balances` for why.
		balances.push((AccountId::from(b.contract), b.tokens * UNITS));

		evm_accounts.insert(
			H160::from(b.contract),
			fp_evm::GenesisAccount {
				nonce: Default::default(),
				balance: U256::zero(),
				code: code.clone(),
				storage,
			},
		);
	}

	serde_json::json!({
		"sudo": { "key": Some(sudo_key) },
		"balances": { "balances": balances },
		"aura": { "authorities": vec![aura_authority] },
		"grandpa": { "authorities": vec![(grandpa_authority, 1)] },
		"evmChainId": { "chainId": SYSFI_TESTNET_CHAIN_ID },
		"evm": { "accounts": evm_accounts },
	})
}

/// Configure initial storage state for FRAME modules.
fn testnet_genesis(
	sudo_key: AccountId,
	endowed_accounts: Vec<AccountId>,
	initial_authorities: Vec<(AuraId, GrandpaId)>,
	chain_id: u64,
) -> serde_json::Value {
	// Dev/CI H160 accounts pre-funded on the EVM side too (same addresses as
	// Frontier's own template dev genesis), so `eth_getBalance` matches what
	// `balances` shows — same account, same balance, both views of one chain.
	let evm_accounts = {
		let mut map = BTreeMap::new();
		for addr in [
			"f24FF3a9CF04c71Dbc94D0b566f7A27B94566cac", // Alith
			"3Cd0A705a2DC65e5b1E1205896BaA2be8A07c6e0", // Baltathar
			"798d4Ba9baf0064Ec19eB4F0a1a45785ae9D6DFc", // Charleth
		] {
			map.insert(
				H160::from_str(addr).expect("internal H160 is valid; qed"),
				fp_evm::GenesisAccount {
					balance: U256::from(1_000_000u128 * UNITS),
					code: Default::default(),
					nonce: Default::default(),
					storage: Default::default(),
				},
			);
		}
		map
	};

	serde_json::json!({
		"sudo": { "key": Some(sudo_key) },
		"balances": {
			"balances": endowed_accounts
				.iter()
				.cloned()
				.map(|k| (k, 1_000_000 * UNITS))
				.collect::<Vec<_>>()
		},
		"aura": { "authorities": initial_authorities.iter().map(|x| x.0.clone()).collect::<Vec<_>>() },
		"grandpa": { "authorities": initial_authorities.iter().map(|x| (x.1.clone(), 1)).collect::<Vec<_>>() },
		"evmChainId": { "chainId": chain_id },
		"evm": { "accounts": evm_accounts },
	})
}
