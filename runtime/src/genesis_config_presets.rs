// This file is part of Substrate.

// Copyright (C) Parity Technologies (UK) Ltd.
// SPDX-License-Identifier: Apache-2.0

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// 	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

use crate::{AccountId, BalancesConfig, RuntimeGenesisConfig, SudoConfig, VestingConfig};
use alloc::{vec, vec::Vec};
use frame_support::{build_struct_json_patch, PalletId};
use hex_literal::hex;
use serde_json::Value;
use sp_consensus_aura::sr25519::AuthorityId as AuraId;
use sp_consensus_grandpa::AuthorityId as GrandpaId;
use sp_core::{hashing::keccak_256, H160};
use sp_genesis_builder::{self, PresetId};
use sp_runtime::traits::AccountIdConversion;

/// Deterministic placeholder H160, derived the same way a real Ethereum
/// address is derived from a public key (keccak256, last 20 bytes) — just
/// applied to a named seed instead of a real pubkey. Replaces the old
/// `blake2_256(seed).into()` (which produced an AccountId32). Used for
/// pallet/allocation-bucket accounts that need *a* stable, derivable
/// address but aren't meant to be controlled by a specific keypair.
/// `pub` (not just module-private) so `node/src/awarizon_rpc.rs` can
/// re-derive the same pool/allocation addresses from the same seeds when
/// reading genesis-seeded accounts back out via RPC.
pub fn awarizon_account(seed: &[u8]) -> AccountId {
	H160::from_slice(&keccak_256(seed)[12..32]).into()
}

fn engagement_pool_account() -> AccountId {
	PalletId(*b"awz/engp").into_account_truncating()
}

/// Standard Frontier/Moonbeam dev accounts — same keys sysfi-runtime's dev
/// preset already uses, so the two chains' local dev setups are consistent.
/// NOT for any real deployment; well-known private keys.
fn alith() -> AccountId {
	H160::from(hex!("f24FF3a9CF04c71Dbc94D0b566f7A27B94566cac")).into()
}
/// `pub` so `node/src/command.rs`'s (feature-gated) benchmarking CLI support
/// can reuse it as a destination account, same reasoning as `awarizon_account`.
pub fn baltathar() -> AccountId {
	H160::from(hex!("3Cd0A705a2DC65e5b1E1205896BaA2be8A07c6e0")).into()
}
fn charleth() -> AccountId {
	H160::from(hex!("798d4Ba9baf0064Ec19eB4F0a1a45785ae9D6DFc")).into()
}
fn dorothy() -> AccountId {
	H160::from(hex!("773539d4Ac0e786233D90A233654CCEe26a613D9")).into()
}

fn team_account() -> AccountId {
	awarizon_account(b"team_allocation")
}

fn advisor_account() -> AccountId {
	awarizon_account(b"advisor_pool")
}

fn liquidity_account() -> AccountId {
	awarizon_account(b"liquidity_reserve")
}

fn airdrop_account() -> AccountId {
	awarizon_account(b"airdrop_pool")
}

// Returns the genesis config presets populated with given parameters.
fn testnet_genesis(
	initial_authorities: Vec<(AuraId, GrandpaId)>,
	endowed_accounts: Vec<AccountId>,
	root: AccountId,
) -> Value {
	let riz: u128 = crate::UNIT; // 1 RIZ, 18 decimals (was hardcoded to the old 12-decimal value)
	let mut balances: Vec<(AccountId, u128)> = endowed_accounts
		.iter()
		.cloned()
		// Was `1u128 << 60` — a fixed bit-pattern, not UNIT-relative, so it
		// meant ~1.15M RIZ under the old 12-decimal UNIT but would silently
		// shrink to ~1.15 RIZ under the new 18-decimal one. Rewritten to
		// stay a generous, obviously-intentional dev endowment either way.
		.map(|k| (k, 1_000_000u128 * riz))
		.collect();
	// Small seed so pallet-controlled accounts exist on chain (module accounts need ED to be created).
	let ed = crate::EXISTENTIAL_DEPOSIT;
	balances.extend(vec![
		(engagement_pool_account(),                                 200_000_000u128 * riz),
		(PalletId(*b"riz/vldr").into_account_truncating(),          250_000_000u128 * riz),
		(awarizon_account(b"developer_fund"),                       100_000_000u128 * riz),
		(awarizon_account(b"foundation_reserve"),                   100_000_000u128 * riz),
		(awarizon_account(b"community_sale"),                       100_000_000u128 * riz),
		(team_account(),                                             50_000_000u128 * riz),
		(advisor_account(),                                          20_000_000u128 * riz),
		(liquidity_account(),                                        50_000_000u128 * riz),
		(airdrop_account(),                                          10_000_000u128 * riz),
		(PalletId(*b"riz/fees").into_account_truncating(),          ed),
		(PalletId(*b"riz/insr").into_account_truncating(),          ed),
	]);
	build_struct_json_patch!(RuntimeGenesisConfig {
		balances: BalancesConfig { balances },
		vesting: VestingConfig {
			vesting: vec![
				(awarizon_account(b"developer_fund"),     5_184_001u32,  21_024_000u32, 0u128),
				(awarizon_account(b"foundation_reserve"), 10_512_001u32, 31_536_000u32, 0u128),
				(awarizon_account(b"community_sale"),     1u32,          10_368_000u32, 60_000_000u128 * riz),
				(team_account(),                          1u32,          63_072_000u32, 10_000_000u128 * riz),
				(advisor_account(),                       2_592_001u32,  21_024_000u32, 0u128),
			],
		},
		aura: pallet_aura::GenesisConfig {
			authorities: initial_authorities.iter().map(|x| (x.0.clone())).collect::<Vec<_>>(),
		},
		grandpa: pallet_grandpa::GenesisConfig {
			authorities: initial_authorities.iter().map(|x| (x.1.clone(), 1)).collect::<Vec<_>>(),
		},
		sudo: SudoConfig { key: Some(root) },
	})
}

/// Awarizon public testnet genesis.
///
/// Token allocation (total ~890M RIZ):
///   200M — Engagement pool (inbox rewards)
///   250M — Yield reserve  (validator rewards)
///   100M — Developer fund  (2yr vest, day 180)
///   100M — Foundation      (3yr vest, day 365)
///   100M — Community sale  (1yr vest, 60M liquid)
///    50M — Team            (6yr vest, 10M liquid)
///    20M — Advisors        (2yr vest, day 90)
///    50M — Liquidity       (no vest, sudo access)
///    10M — Airdrop pool    (no vest, sudo access)
///    10M — Faucet (Bob)    (no vest, testnet use)
///   10K  — Sudo key        (operational)
pub fn public_testnet_genesis() -> Value {
	let riz: u128 = crate::UNIT; // 1 RIZ, 18 decimals (was hardcoded to the old 12-decimal value)
	let ed = crate::EXISTENTIAL_DEPOSIT;

	// ── Session keys ──────────────────────────────
	let aura_key: AuraId =
		sp_core::sr25519::Public::from_raw(hex!("3e840a8482f3bf93c8b1ad1f5dab285893337a0446fe4399de98a7bc7b6c6d55"))
			.into();

	let grandpa_key: GrandpaId =
		sp_core::ed25519::Public::from_raw(hex!("07a1d2318f0df27ccde49b8053f74b908babc4fa0457a3c8f48af610dc048aa3"))
			.into();

	// ── Key accounts ─────────────────────────────
	// PLACEHOLDER — the old sudo key was a real SS58 AccountId32 address,
	// which has no equivalent under H160; there's no address-space mapping
	// from it to carry over. This derives a stable placeholder instead of
	// fabricating a "real" one — swap for an actual controlled H160 key
	// before this preset is ever used for a real deployment (not before
	// then, per the migration plan: real allocation-bucket/role addresses
	// are a separate decision, not something to invent here).
	let sudo_key: AccountId = awarizon_account(b"sudo_placeholder_REPLACE_BEFORE_REAL_DEPLOY");

	// Liquidity and airdrop controlled by sudo key
	// Use sudo forceTransfer to distribute these
	let _liquidity_controller = sudo_key.clone();
	let _airdrop_controller = sudo_key.clone();

	// Faucet — was Bob (well-known Substrate dev account); Alith is the
	// equivalent well-known Frontier/EVM dev account (same role: publicly
	// known key, intentionally funded, meant for testnet faucet use).
	let faucet: AccountId = alith();

	// ── Genesis balances ─────────────────────────
	let balances: Vec<(AccountId, u128)> = vec![
		// ── PROTOCOL POOLS ────────────────────────

		// Engagement pool — 200M RIZ
		// PalletId: awz/engp (pallet-controlled)
		// Funds RIZ inbox rewards for app deliveries
		// No vesting — pallet distributes directly
		(engagement_pool_account(), 200_000_000u128 * riz),
		// Yield reserve — 250M RIZ
		// PalletId: riz/vldr (consensus pallet)
		// Emits 15,000 RIZ/day as staking rewards
		// Split: 60% base + 20% perf + 20% stake
		// No vesting — pallet controls emission
		(PalletId(*b"riz/vldr").into_account_truncating(), 250_000_000u128 * riz),
		// ── VESTED ALLOCATIONS ────────────────────

		// Developer fund — 100M RIZ
		// blake2_256("developer_fund")
		// Vesting: starts block 5,184,001 (~180 days)
		// Duration: 21,024,000 blocks (~2 years)
		// Liquid at vest start: 0
		(awarizon_account(b"developer_fund"), 100_000_000u128 * riz),
		// Foundation reserve — 100M RIZ
		// blake2_256("foundation_reserve")
		// Vesting: starts block 10,512,001 (~1 year)
		// Duration: 31,536,000 blocks (~3 years)
		// Liquid at vest start: 0
		(awarizon_account(b"foundation_reserve"), 100_000_000u128 * riz),
		// Community sale — 100M RIZ
		// blake2_256("community_sale")
		// Vesting: starts block 1 (immediate)
		// Duration: 10,368,000 blocks (~360 days)
		// Liquid immediately: 60M RIZ
		// Remaining 40M vests over 360 days
		(awarizon_account(b"community_sale"), 100_000_000u128 * riz),
		// Team allocation — 50M RIZ
		// blake2_256("team_allocation")
		// Vesting: starts block 1 (immediate)
		// Duration: 63,072,000 blocks (~6 years)
		// Liquid immediately: 10M RIZ
		// Remaining 40M vests over 6 years
		(team_account(), 50_000_000u128 * riz),
		// Advisor pool — 20M RIZ
		// blake2_256("advisor_pool")
		// Vesting: starts block 2,592,001 (~90 days)
		// Duration: 21,024,000 blocks (~2 years)
		// Liquid at vest start: 0
		// Advisors receive via sudo forceTransfer
		(advisor_account(), 20_000_000u128 * riz),
		// ── NON-VESTED OPERATIONAL ────────────────

		// Liquidity reserve — 50M RIZ
		// blake2_256("liquidity_reserve")
		// No vesting — for CEX/DEX listings
		// Controlled via sudo forceTransfer
		(liquidity_account(), 50_000_000u128 * riz),
		// Airdrop pool — 10M RIZ
		// blake2_256("airdrop_pool")
		// No vesting — distributed to community
		// Controlled via sudo forceTransfer
		(airdrop_account(), 10_000_000u128 * riz),
		// ── PALLET ACCOUNTS (need ED) ─────────────

		// Fee pool — collects tx fees each block
		// 60% → staking, 20% → inbox, 20% burned
		(PalletId(*b"riz/fees").into_account_truncating(), ed),
		// Insurance pool — receives 50% of slashes
		// Compensates delegators of slashed validators
		(PalletId(*b"riz/insr").into_account_truncating(), ed),
		// ── OPERATIONAL ACCOUNTS ──────────────────

		// Sudo key — operational balance for tx fees
		(sudo_key.clone(), 10_000u128 * riz),
		// Faucet (Bob) — 10M RIZ for testnet
		// Gives 10 RIZ per request via faucet site
		// 1,000 RIZ lifetime cap per address
		// Funds ~10,000 unique testnet addresses
		(faucet, 10_000_000u128 * riz),
	];

	build_struct_json_patch!(RuntimeGenesisConfig {
		balances: BalancesConfig { balances },
		vesting: VestingConfig {
			vesting: vec![
				// Developer fund
				// Starts: block 5,184,001 (~180 days)
				// Duration: 21,024,000 blocks (~2 years)
				// Per-block: 100M / 21,024,000 ≈ 4.76 RIZ
				(awarizon_account(b"developer_fund"), 5_184_001u32, 21_024_000u32, 0u128),
				// Foundation reserve
				// Starts: block 10,512,001 (~1 year)
				// Duration: 31,536,000 blocks (~3 years)
				// Per-block: 100M / 31,536,000 ≈ 3.17 RIZ
				(awarizon_account(b"foundation_reserve"), 10_512_001u32, 31_536_000u32, 0u128),
				// Community sale
				// Starts: block 1 (immediate)
				// Duration: 10,368,000 blocks (~360 days)
				// Liquid now: 60M RIZ
				// Vesting: 40M over 360 days
				(awarizon_account(b"community_sale"), 1u32, 10_368_000u32, 60_000_000u128 * riz),
				// Team allocation
				// Starts: block 1 (immediate)
				// Duration: 63,072,000 blocks (~6 years)
				//   At 3s/block:
				//   63,072,000 × 3 = 189,216,000s
				//   = ~6 years exactly
				// Liquid now: 10M RIZ
				// Vesting: 40M over 6 years
				// Per-block: 40M / 63,072,000 ≈ 0.634 RIZ
				(team_account(), 1u32, 63_072_000u32, 10_000_000u128 * riz),
				// Advisor pool
				// Starts: block 2,592,001 (~90 days)
				// Duration: 21,024,000 blocks (~2 years)
				// Liquid at vest start: 0
				// Per-block: 20M / 21,024,000 ≈ 0.95 RIZ
				(advisor_account(), 2_592_001u32, 21_024_000u32, 0u128),
			],
		},
		aura: pallet_aura::GenesisConfig { authorities: vec![aura_key] },
		grandpa: pallet_grandpa::GenesisConfig { authorities: vec![(grandpa_key, 1)] },
		sudo: SudoConfig { key: Some(sudo_key) },
	})
}

/// Return the development genesis config.
///
/// Aura/Grandpa session (consensus) keys are unaffected by the H160
/// migration — consensus still runs on sr25519/ed25519 regardless of the
/// account/transaction-signing model, same as sysfi-runtime — so these
/// stay `sp_keyring::{Sr25519,Ed25519}Keyring::Alice`. The *endowed
/// accounts* and *sudo key* below are the part that changed: standard
/// Frontier dev accounts (H160) instead of `Sr25519Keyring` AccountId32s.
pub fn development_config_genesis() -> Value {
	testnet_genesis(
		vec![(
			sp_keyring::Sr25519Keyring::Alice.public().into(),
			sp_keyring::Ed25519Keyring::Alice.public().into(),
		)],
		vec![alith(), baltathar(), charleth(), dorothy()],
		alith(),
	)
}

/// Return the local genesis config preset.
pub fn local_config_genesis() -> Value {
	testnet_genesis(
		vec![
			(
				sp_keyring::Sr25519Keyring::Alice.public().into(),
				sp_keyring::Ed25519Keyring::Alice.public().into(),
			),
			(
				sp_keyring::Sr25519Keyring::Bob.public().into(),
				sp_keyring::Ed25519Keyring::Bob.public().into(),
			),
		],
		vec![alith(), baltathar(), charleth(), dorothy()],
		alith(),
	)
}

/// Provides the JSON representation of predefined genesis config for given `id`.
pub fn get_preset(id: &PresetId) -> Option<Vec<u8>> {
	let patch = match id.as_ref() {
		sp_genesis_builder::DEV_RUNTIME_PRESET => development_config_genesis(),
		sp_genesis_builder::LOCAL_TESTNET_RUNTIME_PRESET => local_config_genesis(),
		"public-testnet" => public_testnet_genesis(),
		_ => return None,
	};
	Some(
		serde_json::to_string(&patch)
			.expect("serialization to json is expected to work. qed.")
			.into_bytes(),
	)
}

/// List of supported presets.
pub fn preset_names() -> Vec<PresetId> {
	vec![
		PresetId::from(sp_genesis_builder::DEV_RUNTIME_PRESET),
		PresetId::from(sp_genesis_builder::LOCAL_TESTNET_RUNTIME_PRESET),
		PresetId::from("public-testnet"),
	]
}
