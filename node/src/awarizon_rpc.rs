use codec::{Decode, Encode};
use jsonrpsee::{
    core::{async_trait, RpcResult},
    proc_macros::rpc,
    types::error::ErrorObject,
};
use pallet_awarizon_consensus::ValidatorInfo;
use pallet_awarizon_types::{
    AppCategory, Campaign, CampaignStatus, DeveloperProfile, DeveloperStatus, InboxRecord,
    InboxRecordStatus,
};
use sc_client_api::StorageProvider;
use sc_service::TFullBackend;
use sp_blockchain::HeaderBackend;
use sp_core::{
    crypto::Ss58Codec,
    hashing::{blake2_128, blake2_256, twox_128},
    storage::StorageKey,
};
use sp_runtime::{traits::{Block as BlockT, SaturatedConversion}, AccountId32};
use std::sync::Arc;

pub const ERROR_RUNTIME: i32 = 1;
#[allow(dead_code)]
pub const ERROR_NOT_FOUND: i32 = 2;
pub const ERROR_INVALID_PARAM: i32 = 3;

fn runtime_error(msg: &str) -> ErrorObject<'static> {
    ErrorObject::owned(ERROR_RUNTIME, msg.to_string(), None::<()>)
}

// ============================================================
// Response types
// ============================================================

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct NetworkStats {
    pub total_wallets: u64,
    pub total_deliveries: u64,
    pub active_campaigns: u64,
    pub total_staked: String,
    pub current_epoch: u64,
    pub inbox_reserve_balance: String,
    pub total_extrinsics: u64,
    pub circulating_supply: String,
    pub non_circulating_supply: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct CampaignDeliveryStatus {
    pub current_deliveries: u64,
    pub max_deliveries: u64,
    pub remaining: u64,
    pub percentage_used: u32,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct WalletTargetingProfile {
    pub wallet_age_days: u32,
    pub activity_count: u32,
    pub category_history: Vec<u8>,
    pub region_code: u8,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ValidatorPerformanceResponse {
    pub performance_score: u32,
    pub effective_rank: String,
    pub uptime_bps: u32,
    pub finality_bps: u32,
    pub blocks_bps: u32,
    pub slash_count: u32,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct TokenStats {
    pub total_issuance: String,
    pub engagement_pool_balance: String,
}
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct LinkedAddressResponse {
    pub chain: String,
    pub address: String,
    pub status: String,
    pub linked_at: u32,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct IdentityResponse {
    pub account: String,
    pub riz_name: Option<String>,
    pub display_name: Option<String>,
    pub bio: Option<String>,
    pub avatar_uri: Option<String>,
    pub website: Option<String>,
    pub registered_at: u32,
    pub verified: bool,
    pub reputation_score: u32,
    pub linked_addresses: Vec<LinkedAddressResponse>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct NameLookupResponse {
    pub riz_name: String,
    pub account: String,
    pub identity: Option<IdentityResponse>,
}


#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct TransactionSummary {
    pub block_number: u32,
    pub extrinsic_index: u32,
    pub success: bool,
}

// Mirrors pallet_awarizon_state::TransactionRecord for SCALE decoding.
// Field order and types must match exactly.
#[derive(Decode)]
#[allow(dead_code)]
struct TransactionRecordRaw {
    block_number: u32,
    extrinsic_index: u32,
    signer: Option<AccountId32>,
    pallet_index: u8,
    call_index: u8,
    success: bool,
}

// Mirrors pallet_vesting::VestingInfo for SCALE decoding.
#[derive(Decode)]
struct VestingInfoRaw {
    locked: u128,
    per_block: u128,
    starting_block: u32,
}

fn locked_at(v: &VestingInfoRaw, now: u32) -> u128 {
    if now < v.starting_block {
        return v.locked;
    }
    let elapsed = (now - v.starting_block) as u128;
    v.locked.saturating_sub(v.per_block.saturating_mul(elapsed))
}

// ============================================================
// Storage key helpers
// ============================================================

fn value_key(pallet: &str, name: &str) -> StorageKey {
    let mut k = twox_128(pallet.as_bytes()).to_vec();
    k.extend_from_slice(&twox_128(name.as_bytes()));
    StorageKey(k)
}

fn map_key_b2(pallet: &str, name: &str, key_bytes: &[u8]) -> StorageKey {
    let mut k = twox_128(pallet.as_bytes()).to_vec();
    k.extend_from_slice(&twox_128(name.as_bytes()));
    k.extend_from_slice(&blake2_128(key_bytes));
    k.extend_from_slice(key_bytes);
    StorageKey(k)
}

fn double_map_key_b2(pallet: &str, name: &str, k1: &[u8], k2: &[u8]) -> StorageKey {
    let mut k = twox_128(pallet.as_bytes()).to_vec();
    k.extend_from_slice(&twox_128(name.as_bytes()));
    k.extend_from_slice(&blake2_128(k1));
    k.extend_from_slice(k1);
    k.extend_from_slice(&blake2_128(k2));
    k.extend_from_slice(k2);
    StorageKey(k)
}

// ============================================================
// Parsing helpers
// ============================================================

fn parse_account(s: &str) -> RpcResult<AccountId32> {
    AccountId32::from_ss58check(s)
        .map_err(|_| ErrorObject::owned(ERROR_INVALID_PARAM, "Invalid SS58 account", None::<()>))
}

fn parse_hash32(s: &str) -> RpcResult<[u8; 32]> {
    let bytes = hex::decode(s.trim_start_matches("0x"))
        .map_err(|_| runtime_error("Invalid hex string"))?;
    if bytes.len() != 32 {
        return Err(ErrorObject::owned(
            ERROR_INVALID_PARAM,
            "Hash must be 32 bytes",
            None::<()>,
        ));
    }
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&bytes);
    Ok(arr)
}

fn category_name(c: &AppCategory) -> &'static str {
    match c {
        AppCategory::DeFi => "DeFi",
        AppCategory::Gaming => "Gaming",
        AppCategory::Social => "Social",
        AppCategory::Productivity => "Productivity",
        AppCategory::Infrastructure => "Infrastructure",
        AppCategory::DigitalAssets => "DigitalAssets",
        AppCategory::DeveloperTools => "DeveloperTools",
        AppCategory::Education => "Education",
    }
}

// ============================================================
// RPC trait definition
// ============================================================

#[rpc(client, server)]
pub trait AwarizonRpc {
    // Developer endpoints
    #[method(name = "awarizon_getDeveloperProfile")]
    async fn get_developer_profile(
        &self,
        account: String,
    ) -> RpcResult<Option<serde_json::Value>>;

    #[method(name = "awarizon_getDeveloperCampaigns")]
    async fn get_developer_campaigns(&self, account: String) -> RpcResult<Vec<String>>;

    #[method(name = "awarizon_getDeveloperManifests")]
    async fn get_developer_manifests(&self, account: String) -> RpcResult<Vec<String>>;

    // Campaign endpoints
    #[method(name = "awarizon_getCampaign")]
    async fn get_campaign(&self, campaign_id: String) -> RpcResult<Option<serde_json::Value>>;

    #[method(name = "awarizon_getActiveCampaignCount")]
    async fn get_active_campaign_count(&self) -> RpcResult<u64>;

    #[method(name = "awarizon_getCampaignDeliveryStatus")]
    async fn get_campaign_delivery_status(
        &self,
        campaign_id: String,
    ) -> RpcResult<Option<CampaignDeliveryStatus>>;

    // Inbox endpoints
    #[method(name = "awarizon_getInboxCount")]
    async fn get_inbox_count(&self, wallet: String) -> RpcResult<u32>;

    #[method(name = "awarizon_getInboxRecord")]
    async fn get_inbox_record(
        &self,
        wallet: String,
        record_id: String,
    ) -> RpcResult<Option<serde_json::Value>>;

    // Targeting endpoints
    #[method(name = "awarizon_getWalletTargetingProfile")]
    async fn get_wallet_targeting_profile(
        &self,
        wallet: String,
    ) -> RpcResult<WalletTargetingProfile>;

    #[method(name = "awarizon_checkCampaignMatch")]
    async fn check_campaign_match(
        &self,
        campaign_id: String,
        wallet: String,
    ) -> RpcResult<bool>;

    // Validator endpoints
    #[method(name = "awarizon_getActiveValidators")]
    async fn get_active_validators(&self) -> RpcResult<Vec<String>>;

    #[method(name = "awarizon_getValidatorCount")]
    async fn get_validator_count(&self) -> RpcResult<u32>;

    #[method(name = "awarizon_getValidatorPerformance")]
    async fn get_validator_performance(
        &self,
        account: String,
    ) -> RpcResult<Option<ValidatorPerformanceResponse>>;

    // Network stats endpoints
    #[method(name = "awarizon_getNetworkStats")]
    async fn get_network_stats(&self) -> RpcResult<NetworkStats>;

    #[method(name = "awarizon_getTokenStats")]
    async fn get_token_stats(&self) -> RpcResult<TokenStats>;

    #[method(name = "awarizon_getRecentTransactions")]
    async fn get_recent_transactions(&self) -> RpcResult<Vec<TransactionSummary>>;

    #[method(name = "awarizon_getBlockTransactions")]
    async fn get_block_transactions(&self, block_number: u32) -> RpcResult<Vec<TransactionSummary>>;

    // Identity endpoints
    #[method(name = "awarizon_getIdentity")]
    async fn get_identity(
        &self,
        account: String,
        at: Option<sp_core::H256>,
    ) -> RpcResult<Option<IdentityResponse>>;

    #[method(name = "awarizon_lookupName")]
    async fn lookup_name(
        &self,
        name: String,
        at: Option<sp_core::H256>,
    ) -> RpcResult<Option<NameLookupResponse>>;

    #[method(name = "awarizon_getLinkedAddresses")]
    async fn get_linked_addresses(
        &self,
        account: String,
        at: Option<sp_core::H256>,
    ) -> RpcResult<Vec<LinkedAddressResponse>>;

    #[method(name = "awarizon_isNameAvailable")]
    async fn is_name_available(
        &self,
        name: String,
        at: Option<sp_core::H256>,
    ) -> RpcResult<bool>;

    #[method(name = "awarizon_getTotalIdentities")]
    async fn get_total_identities(
        &self,
        at: Option<sp_core::H256>,
    ) -> RpcResult<u32>;

}

// ============================================================
// Implementation struct
// ============================================================

pub struct AwarizonRpcImpl<C, B> {
    client: Arc<C>,
    _marker: std::marker::PhantomData<B>,
}

impl<C, B> AwarizonRpcImpl<C, B> {
    pub fn new(client: Arc<C>) -> Self {
        Self { client, _marker: Default::default() }
    }
}

// ============================================================
// Internal storage helpers
// ============================================================

impl<C, B> AwarizonRpcImpl<C, B>
where
    B: BlockT,
    C: HeaderBackend<B> + StorageProvider<B, TFullBackend<B>> + Send + Sync + 'static,
{
    fn read_raw(&self, key: StorageKey) -> RpcResult<Option<Vec<u8>>> {
        let hash = self.client.info().best_hash;
        self.client
            .storage(hash, &key)
            .map(|opt| opt.map(|d| d.0))
            .map_err(|e| runtime_error(&e.to_string()))
    }

    fn read_u32_value(&self, pallet: &str, name: &str) -> RpcResult<u32> {
        match self.read_raw(value_key(pallet, name))? {
            Some(b) => u32::decode(&mut &b[..]).map_err(|e| runtime_error(&e.to_string())),
            None => Ok(0),
        }
    }

    fn read_u64_value(&self, pallet: &str, name: &str) -> RpcResult<u64> {
        match self.read_raw(value_key(pallet, name))? {
            Some(b) => u64::decode(&mut &b[..]).map_err(|e| runtime_error(&e.to_string())),
            None => Ok(0),
        }
    }

    fn read_u128_value(&self, pallet: &str, name: &str) -> RpcResult<u128> {
        match self.read_raw(value_key(pallet, name))? {
            Some(b) => u128::decode(&mut &b[..]).map_err(|e| runtime_error(&e.to_string())),
            None => Ok(0),
        }
    }

    fn fetch_linked_addresses(
        &self,
        acct: &AccountId32,
    ) -> RpcResult<Vec<LinkedAddressResponse>> {
        // ChainType SCALE encoding: EVM=0, Solana=1, Bitcoin=2, Cosmos=3, Near=4
        let chain_variants: &[(&str, u8)] = &[
            ("EVM", 0),
            ("Solana", 1),
            ("Bitcoin", 2),
            ("Cosmos", 3),
            ("Near", 4),
        ];

        let mut results = Vec::new();
        for (chain_name, chain_id) in chain_variants {
            let key = double_map_key_b2(
                "AwarizonLinks",
                "LinkedAddresses",
                &acct.encode(),
                &[*chain_id],
            );
            if let Some(raw) = self.read_raw(key)? {
                let mut c = raw.as_slice();
                // skip ChainType byte
                if !c.is_empty() { c = &c[1..]; }
                let _address_bytes = Self::scale_decode_bvec(&mut c);
                let display_bytes = Self::scale_decode_bvec(&mut c);
                // skip LinkStatus byte
                if !c.is_empty() { c = &c[1..]; }
                let linked_at = if c.len() >= 4 {
                    u32::from_le_bytes(c[..4].try_into().unwrap_or([0u8; 4]))
                } else {
                    0
                };
                results.push(LinkedAddressResponse {
                    chain: chain_name.to_string(),
                    address: String::from_utf8_lossy(&display_bytes).into_owned(),
                    status: "Verified".to_string(),
                    linked_at,
                });
            }
        }
        Ok(results)
    }

    fn scale_decode_option_bvec(cursor: &mut &[u8]) -> Option<Vec<u8>> {
        if cursor.is_empty() { return None; }
        let tag = cursor[0];
        *cursor = &cursor[1..];
        if tag == 0 { None } else { Some(Self::scale_decode_bvec(cursor)) }
    }

    fn scale_decode_bvec(cursor: &mut &[u8]) -> Vec<u8> {
        if cursor.is_empty() { return Vec::new(); }
        let (len, consumed) = Self::scale_compact(cursor);
        *cursor = &cursor[consumed..];
        let take = len.min(cursor.len());
        let bytes = cursor[..take].to_vec();
        *cursor = &cursor[take..];
        bytes
    }

    fn scale_compact(data: &[u8]) -> (usize, usize) {
        if data.is_empty() { return (0, 0); }
        match data[0] & 0b11 {
            0 => ((data[0] >> 2) as usize, 1),
            1 => {
                if data.len() < 2 { return (0, 1); }
                (((data[0] as usize) | ((data[1] as usize) << 8)) >> 2, 2)
            }
            2 => {
                if data.len() < 4 { return (0, 1); }
                ((((data[0] as usize)
                    | ((data[1] as usize) << 8)
                    | ((data[2] as usize) << 16)
                    | ((data[3] as usize) << 24))
                    >> 2),
                 4)
            }
            _ => (0, 1),
        }
    }

}

// ============================================================
// Trait implementation
// ============================================================

#[async_trait]
impl<C, B> AwarizonRpcServer for AwarizonRpcImpl<C, B>
where
    B: BlockT + Send + Sync + 'static,
    C: HeaderBackend<B> + StorageProvider<B, TFullBackend<B>> + Send + Sync + 'static,
{
    async fn get_developer_profile(
        &self,
        account: String,
    ) -> RpcResult<Option<serde_json::Value>> {
        let acct = parse_account(&account)?;
        let key = map_key_b2("AwarizonState", "DeveloperProfiles", &acct.encode());
        match self.read_raw(key)? {
            None => Ok(None),
            Some(b) => {
                let p = DeveloperProfile::<AccountId32, u32>::decode(&mut &b[..])
                    .map_err(|e| runtime_error(&e.to_string()))?;
                Ok(Some(serde_json::json!({
                    "account": p.account.to_ss58check(),
                    "staked_riz": p.staked_riz.to_string(),
                    "status": match p.status {
                        DeveloperStatus::Unverified => "Unverified",
                        DeveloperStatus::Verified => "Verified",
                        DeveloperStatus::Suspended => "Suspended",
                    },
                    "first_distribution_block": p.first_distribution_block,
                    "violation_count": p.violation_count,
                    "total_campaigns": p.total_campaigns,
                    "total_deliveries": p.total_deliveries,
                })))
            }
        }
    }

    async fn get_developer_campaigns(&self, account: String) -> RpcResult<Vec<String>> {
        let acct = parse_account(&account)?;
        let key = map_key_b2("AwarizonState", "DeveloperCampaigns", &acct.encode());
        match self.read_raw(key)? {
            None => Ok(vec![]),
            Some(b) => {
                let ids = Vec::<[u8; 32]>::decode(&mut &b[..])
                    .map_err(|e| runtime_error(&e.to_string()))?;
                Ok(ids.iter().map(|id| format!("0x{}", hex::encode(id))).collect())
            }
        }
    }

    async fn get_developer_manifests(&self, account: String) -> RpcResult<Vec<String>> {
        let acct = parse_account(&account)?;
        let key = map_key_b2("AwarizonState", "DeveloperManifests", &acct.encode());
        match self.read_raw(key)? {
            None => Ok(vec![]),
            Some(b) => {
                let hashes = Vec::<[u8; 32]>::decode(&mut &b[..])
                    .map_err(|e| runtime_error(&e.to_string()))?;
                Ok(hashes.iter().map(|h| format!("0x{}", hex::encode(h))).collect())
            }
        }
    }

    async fn get_campaign(&self, campaign_id: String) -> RpcResult<Option<serde_json::Value>> {
        let id = parse_hash32(&campaign_id)?;
        let key = map_key_b2("AwarizonState", "Campaigns", &id[..]);
        match self.read_raw(key)? {
            None => Ok(None),
            Some(b) => {
                let c = Campaign::<AccountId32, u32>::decode(&mut &b[..])
                    .map_err(|e| runtime_error(&e.to_string()))?;
                Ok(Some(serde_json::json!({
                    "campaign_id": format!("0x{}", hex::encode(c.campaign_id)),
                    "developer": c.developer.to_ss58check(),
                    "manifest_hash": format!("0x{}", hex::encode(c.manifest_hash)),
                    "status": match c.status {
                        CampaignStatus::Pending => "Pending",
                        CampaignStatus::Active => "Active",
                        CampaignStatus::Expired => "Expired",
                        CampaignStatus::Terminated => "Terminated",
                    },
                    "created_at": c.created_at,
                    "expires_at": c.expires_at,
                    "max_deliveries": c.max_deliveries,
                    "current_deliveries": c.current_deliveries,
                    "storage_fee_paid": c.storage_fee_paid.to_string(),
                })))
            }
        }
    }

    async fn get_active_campaign_count(&self) -> RpcResult<u64> {
        self.read_u64_value("AwarizonState", "ActiveCampaignCount")
    }

    async fn get_campaign_delivery_status(
        &self,
        campaign_id: String,
    ) -> RpcResult<Option<CampaignDeliveryStatus>> {
        let id = parse_hash32(&campaign_id)?;
        let key = map_key_b2("AwarizonState", "Campaigns", &id[..]);
        match self.read_raw(key)? {
            None => Ok(None),
            Some(b) => {
                let c = Campaign::<AccountId32, u32>::decode(&mut &b[..])
                    .map_err(|e| runtime_error(&e.to_string()))?;
                let remaining = c.max_deliveries.saturating_sub(c.current_deliveries);
                let pct = if c.max_deliveries == 0 {
                    0u32
                } else {
                    ((c.current_deliveries as u128 * 100) / c.max_deliveries as u128) as u32
                };
                Ok(Some(CampaignDeliveryStatus {
                    current_deliveries: c.current_deliveries,
                    max_deliveries: c.max_deliveries,
                    remaining,
                    percentage_used: pct,
                }))
            }
        }
    }

    async fn get_inbox_count(&self, wallet: String) -> RpcResult<u32> {
        let acct = parse_account(&wallet)?;
        let key = map_key_b2("AwarizonState", "WalletInboxCount", &acct.encode());
        match self.read_raw(key)? {
            None => Ok(0),
            Some(b) => u32::decode(&mut &b[..]).map_err(|e| runtime_error(&e.to_string())),
        }
    }

    async fn get_inbox_record(
        &self,
        wallet: String,
        record_id: String,
    ) -> RpcResult<Option<serde_json::Value>> {
        let acct = parse_account(&wallet)?;
        let rid = parse_hash32(&record_id)?;
        let key = double_map_key_b2(
            "AwarizonState",
            "InboxRecords",
            &acct.encode(),
            &rid[..],
        );
        match self.read_raw(key)? {
            None => Ok(None),
            Some(b) => {
                let r = InboxRecord::<AccountId32, u32>::decode(&mut &b[..])
                    .map_err(|e| runtime_error(&e.to_string()))?;
                Ok(Some(serde_json::json!({
                    "record_id": format!("0x{}", hex::encode(r.record_id)),
                    "campaign_id": format!("0x{}", hex::encode(r.campaign_id)),
                    "developer": r.developer.to_ss58check(),
                    "manifest_hash": format!("0x{}", hex::encode(r.manifest_hash)),
                    "category": category_name(&r.category),
                    "status": match r.status {
                        InboxRecordStatus::Pending => "Pending",
                        InboxRecordStatus::Delivered => "Delivered",
                        InboxRecordStatus::Dismissed => "Dismissed",
                        InboxRecordStatus::Engaged => "Engaged",
                    },
                    "delivered_at": r.delivered_at,
                    "engaged_at": r.engaged_at,
                    "reward_claimed": r.reward_claimed,
                })))
            }
        }
    }

    async fn get_wallet_targeting_profile(
        &self,
        wallet: String,
    ) -> RpcResult<WalletTargetingProfile> {
        let acct = parse_account(&wallet)?;
        let enc = acct.encode();

        let wallet_age_days =
            match self.read_raw(map_key_b2("AwarizonState", "WalletAgeIndex", &enc))? {
                Some(b) => u32::decode(&mut &b[..]).unwrap_or(0),
                None => 0,
            };
        let activity_count =
            match self.read_raw(map_key_b2("AwarizonState", "WalletActivityIndex", &enc))? {
                Some(b) => u32::decode(&mut &b[..]).unwrap_or(0),
                None => 0,
            };
        let category_history =
            match self.read_raw(map_key_b2("AwarizonState", "WalletCategoryHistory", &enc))? {
                Some(b) => Vec::<u8>::decode(&mut &b[..]).unwrap_or_default(),
                None => vec![],
            };
        let region_code =
            match self.read_raw(map_key_b2("AwarizonState", "WalletRegionCode", &enc))? {
                Some(b) => u8::decode(&mut &b[..]).unwrap_or(0),
                None => 0,
            };

        Ok(WalletTargetingProfile { wallet_age_days, activity_count, category_history, region_code })
    }

    async fn check_campaign_match(
        &self,
        campaign_id: String,
        wallet: String,
    ) -> RpcResult<bool> {
        let id = parse_hash32(&campaign_id)?;
        let acct = parse_account(&wallet)?;
        let key =
            double_map_key_b2("AwarizonTargeting", "TargetingMatchCache", &id[..], &acct.encode());
        match self.read_raw(key)? {
            None => Ok(false),
            Some(b) => bool::decode(&mut &b[..]).map_err(|e| runtime_error(&e.to_string())),
        }
    }

    async fn get_active_validators(&self) -> RpcResult<Vec<String>> {
        let key = value_key("AwarizonConsensus", "ActiveValidators");
        match self.read_raw(key)? {
            None => Ok(vec![]),
            Some(b) => {
                let validators = Vec::<AccountId32>::decode(&mut &b[..])
                    .map_err(|e| runtime_error(&e.to_string()))?;
                Ok(validators.iter().map(|a| a.to_ss58check()).collect())
            }
        }
    }

    async fn get_validator_count(&self) -> RpcResult<u32> {
        self.read_u32_value("AwarizonConsensus", "TotalValidatorCount")
    }

    async fn get_validator_performance(
        &self,
        account: String,
    ) -> RpcResult<Option<ValidatorPerformanceResponse>> {
        let acct = parse_account(&account)?;
        let key = map_key_b2("AwarizonConsensus", "Validators", &acct.encode());
        match self.read_raw(key)? {
            None => Ok(None),
            Some(b) => {
                let info = ValidatorInfo::<AccountId32>::decode(&mut &b[..])
                    .map_err(|e| runtime_error(&e.to_string()))?;
                Ok(Some(ValidatorPerformanceResponse {
                    performance_score: info.performance_score(),
                    effective_rank: info.effective_rank().to_string(),
                    uptime_bps: info.uptime_bps,
                    finality_bps: info.finality_bps,
                    blocks_bps: info.blocks_bps,
                    slash_count: info.slash_count,
                }))
            }
        }
    }

    async fn get_network_stats(&self) -> RpcResult<NetworkStats> {
        let developer_staked = self.read_u128_value("AwarizonState", "TotalStaked")?;
        let inbox_reserve = self.read_u128_value("AwarizonState", "InboxStateReserveBalance")?;
        let total_issuance = self.read_u128_value("Balances", "TotalIssuance")?;
        let current_block: u32 = self.client.info().best_number.saturated_into();

        // Sum still-locked tokens across all 4 vesting allocation accounts.
        let alloc_seeds: &[&[u8]] = &[
            b"validator_rewards",
            b"developer_fund",
            b"foundation_reserve",
            b"community_sale",
        ];
        let mut vesting_locked: u128 = 0;
        for seed in alloc_seeds {
            let acct = AccountId32::from(blake2_256(seed));
            let key = map_key_b2("Vesting", "Vesting", &acct.encode());
            if let Some(b) = self.read_raw(key)? {
                if let Ok(schedules) = Vec::<VestingInfoRaw>::decode(&mut &b[..]) {
                    for s in &schedules {
                        vesting_locked = vesting_locked.saturating_add(locked_at(s, current_block));
                    }
                }
            }
        }

        let non_circulating = vesting_locked.saturating_add(inbox_reserve);
        let circulating = total_issuance.saturating_sub(non_circulating);

        Ok(NetworkStats {
            total_wallets: self.read_u64_value("AwarizonState", "TotalWallets")?,
            total_deliveries: self.read_u64_value("AwarizonState", "TotalDeliveries")?,
            active_campaigns: self.read_u64_value("AwarizonState", "ActiveCampaignCount")?,
            total_staked: developer_staked.to_string(),
            current_epoch: self.read_u64_value("AwarizonState", "CurrentEpoch")?,
            inbox_reserve_balance: inbox_reserve.to_string(),
            total_extrinsics: self.read_u64_value("AwarizonState", "TotalExtrinsics")?,
            circulating_supply: circulating.to_string(),
            non_circulating_supply: non_circulating.to_string(),
        })
    }

    async fn get_token_stats(&self) -> RpcResult<TokenStats> {
        Ok(TokenStats {
            total_issuance: self
                .read_u128_value("Balances", "TotalIssuance")?
                .to_string(),
            engagement_pool_balance: self
                .read_u128_value("AwarizonState", "InboxStateReserveBalance")?
                .to_string(),
        })
    }

    async fn get_recent_transactions(&self) -> RpcResult<Vec<TransactionSummary>> {
        match self.read_raw(value_key("AwarizonState", "RecentTransactions"))? {
            None => Ok(vec![]),
            Some(b) => {
                let records = Vec::<TransactionRecordRaw>::decode(&mut &b[..])
                    .map_err(|e| runtime_error(&e.to_string()))?;
                Ok(records
                    .into_iter()
                    .map(|r| TransactionSummary {
                        block_number: r.block_number,
                        extrinsic_index: r.extrinsic_index,
                        success: r.success,
                    })
                    .collect())
            }
        }
    }

    async fn get_block_transactions(&self, block_number: u32) -> RpcResult<Vec<TransactionSummary>> {
        match self.read_raw(value_key("AwarizonState", "RecentTransactions"))? {
            None => Ok(vec![]),
            Some(b) => {
                let records = Vec::<TransactionRecordRaw>::decode(&mut &b[..])
                    .map_err(|e| runtime_error(&e.to_string()))?;
                Ok(records
                    .into_iter()
                    .filter(|r| r.block_number == block_number)
                    .map(|r| TransactionSummary {
                        block_number: r.block_number,
                        extrinsic_index: r.extrinsic_index,
                        success: r.success,
                    })
                    .collect())
            }
        }
    }

    async fn get_identity(
        &self,
        account: String,
        _at: Option<sp_core::H256>,
    ) -> RpcResult<Option<IdentityResponse>> {
        let acct = parse_account(&account)?;
        let enc = acct.encode();

        let id_key = map_key_b2("AwarizonIdentity", "IdentityRecords", &enc);
        let id_raw = match self.read_raw(id_key)? {
            None => return Ok(None),
            Some(b) => b,
        };

        let mut c = id_raw.as_slice();
        let riz_name = Self::scale_decode_option_bvec(&mut c);
        let display_name = Self::scale_decode_option_bvec(&mut c);
        let bio = Self::scale_decode_option_bvec(&mut c);
        let avatar_uri = Self::scale_decode_option_bvec(&mut c);
        let website = Self::scale_decode_option_bvec(&mut c);
        let registered_at = if c.len() >= 4 {
            let v = u32::from_le_bytes(c[..4].try_into().unwrap_or([0u8; 4]));
            c = &c[4..];
            v
        } else {
            0
        };
        let verified = c.first().copied().unwrap_or(0) != 0;
        if !c.is_empty() { c = &c[1..]; }
        let reputation_score = if c.len() >= 4 {
            u32::from_le_bytes(c[..4].try_into().unwrap_or([0u8; 4]))
        } else {
            0
        };

        let linked = self.fetch_linked_addresses(&acct)?;

        Ok(Some(IdentityResponse {
            account,
            riz_name: riz_name.map(|b| String::from_utf8_lossy(&b).into_owned()),
            display_name: display_name.map(|b| String::from_utf8_lossy(&b).into_owned()),
            bio: bio.map(|b| String::from_utf8_lossy(&b).into_owned()),
            avatar_uri: avatar_uri.map(|b| String::from_utf8_lossy(&b).into_owned()),
            website: website.map(|b| String::from_utf8_lossy(&b).into_owned()),
            registered_at,
            verified,
            reputation_score,
            linked_addresses: linked,
        }))
    }

    async fn lookup_name(
        &self,
        name: String,
        at: Option<sp_core::H256>,
    ) -> RpcResult<Option<NameLookupResponse>> {
        let clean = name.trim_end_matches(".riz").to_string();
        let name_bytes = clean.as_bytes();

        // SCALE-encode as BoundedVec<u8,32>: compact(len) + bytes
        let (compact_byte, compact_extra) = if name_bytes.len() < 64 {
            (((name_bytes.len() as u8) << 2), None)
        } else {
            let v = (name_bytes.len() as u16) << 2 | 1;
            (v as u8, Some((v >> 8) as u8))
        };
        let mut encoded = vec![compact_byte];
        if let Some(extra) = compact_extra { encoded.push(extra); }
        encoded.extend_from_slice(name_bytes);

        let key = map_key_b2("AwarizonIdentity", "RizNameRegistry", &encoded);
        let owner_raw = match self.read_raw(key)? {
            None => return Ok(None),
            Some(b) => b,
        };

        let owner = AccountId32::decode(&mut &owner_raw[..])
            .map_err(|e| runtime_error(&e.to_string()))?;
        let owner_ss58 = owner.to_ss58check();

        let identity = self.get_identity(owner_ss58.clone(), at).await?;

        Ok(Some(NameLookupResponse {
            riz_name: clean,
            account: owner_ss58,
            identity,
        }))
    }

    async fn get_linked_addresses(
        &self,
        account: String,
        _at: Option<sp_core::H256>,
    ) -> RpcResult<Vec<LinkedAddressResponse>> {
        let acct = parse_account(&account)?;
        self.fetch_linked_addresses(&acct)
    }

    async fn is_name_available(
        &self,
        name: String,
        _at: Option<sp_core::H256>,
    ) -> RpcResult<bool> {
        let clean = name.trim_end_matches(".riz");
        let name_bytes = clean.as_bytes();

        let (compact_byte, compact_extra) = if name_bytes.len() < 64 {
            (((name_bytes.len() as u8) << 2), None)
        } else {
            let v = (name_bytes.len() as u16) << 2 | 1;
            (v as u8, Some((v >> 8) as u8))
        };
        let mut encoded = vec![compact_byte];
        if let Some(extra) = compact_extra { encoded.push(extra); }
        encoded.extend_from_slice(name_bytes);

        let key = map_key_b2("AwarizonIdentity", "RizNameRegistry", &encoded);
        Ok(self.read_raw(key)?.is_none())
    }

    async fn get_total_identities(
        &self,
        _at: Option<sp_core::H256>,
    ) -> RpcResult<u32> {
        self.read_u32_value("AwarizonIdentity", "TotalIdentities")
    }
}

// ============================================================
// Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn network_stats_serializes_correct_keys() {
        let stats = NetworkStats {
            total_wallets: 42,
            total_deliveries: 1000,
            active_campaigns: 5,
            total_staked: "500000000000000".to_string(),
            current_epoch: 3,
            inbox_reserve_balance: "1000000000000".to_string(),
            total_extrinsics: 0,
            circulating_supply: "0".to_string(),
            non_circulating_supply: "0".to_string(),
        };
        let json = serde_json::to_value(&stats).unwrap();
        assert_eq!(json["total_wallets"], 42);
        assert_eq!(json["total_deliveries"], 1000);
        assert_eq!(json["active_campaigns"], 5);
        assert_eq!(json["total_staked"], "500000000000000");
        assert_eq!(json["current_epoch"], 3);
        assert_eq!(json["inbox_reserve_balance"], "1000000000000");
        assert_eq!(json["total_extrinsics"], 0);
        assert_eq!(json["circulating_supply"], "0");
        assert_eq!(json["non_circulating_supply"], "0");
    }

    #[test]
    fn campaign_delivery_status_percentage_calculation() {
        let status = CampaignDeliveryStatus {
            current_deliveries: 75,
            max_deliveries: 100,
            remaining: 25,
            percentage_used: 75,
        };
        assert_eq!(status.percentage_used, 75);
        assert_eq!(status.remaining, 25);

        let zero = CampaignDeliveryStatus {
            current_deliveries: 0,
            max_deliveries: 0,
            remaining: 0,
            percentage_used: 0,
        };
        assert_eq!(zero.percentage_used, 0);
    }

    #[test]
    fn wallet_targeting_profile_serializes_correctly() {
        let profile = WalletTargetingProfile {
            wallet_age_days: 365,
            activity_count: 100,
            category_history: vec![0x01, 0x02],
            region_code: 3,
        };
        let json = serde_json::to_value(&profile).unwrap();
        assert_eq!(json["wallet_age_days"], 365);
        assert_eq!(json["activity_count"], 100);
        assert_eq!(json["region_code"], 3);
        let hist = json["category_history"].as_array().unwrap();
        assert_eq!(hist.len(), 2);
    }

    #[test]
    fn validator_performance_response_serializes_correctly() {
        let resp = ValidatorPerformanceResponse {
            performance_score: 9500,
            effective_rank: "1000000000000000000".to_string(),
            uptime_bps: 10000,
            finality_bps: 9800,
            blocks_bps: 9700,
            slash_count: 0,
        };
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["performance_score"], 9500);
        assert_eq!(json["uptime_bps"], 10000);
        assert_eq!(json["slash_count"], 0);
        assert_eq!(json["effective_rank"], "1000000000000000000");
    }

    #[test]
    fn parse_account_rejects_invalid_ss58() {
        let result = parse_account("not-a-valid-ss58-address");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.code(), ERROR_INVALID_PARAM);
    }

    #[test]
    fn parse_account_rejects_empty_string() {
        let result = parse_account("");
        assert!(result.is_err());
    }

    #[test]
    fn parse_hash32_rejects_invalid_hex() {
        let result = parse_hash32("not-hex");
        assert!(result.is_err());
        let result2 = parse_hash32("0xZZZZ");
        assert!(result2.is_err());
    }

    #[test]
    fn parse_hash32_rejects_wrong_length() {
        // 31 bytes = 62 hex chars — too short
        let result = parse_hash32("0xdeadbeef");
        assert!(result.is_err());
    }

    #[test]
    fn parse_hash32_accepts_valid_32_byte_hex() {
        let hex = "0x0000000000000000000000000000000000000000000000000000000000000001";
        let result = parse_hash32(hex);
        assert!(result.is_ok());
        let arr = result.unwrap();
        assert_eq!(arr[31], 0x01);
    }

    #[test]
    fn storage_value_key_is_32_bytes() {
        let k = value_key("AwarizonState", "ActiveCampaignCount");
        assert_eq!(k.0.len(), 32);
    }

    #[test]
    fn storage_map_key_length_correct() {
        // prefix(32) + blake2_128(16) + encoded_account(32) = 80 bytes
        let acct = AccountId32::from([0u8; 32]);
        let k = map_key_b2("AwarizonState", "DeveloperProfiles", &acct.encode());
        assert_eq!(k.0.len(), 80);
    }

    #[test]
    fn token_stats_serializes_correctly() {
        let stats = TokenStats {
            total_issuance: "1000000000000000000".to_string(),
            engagement_pool_balance: "500000000000".to_string(),
        };
        let json = serde_json::to_value(&stats).unwrap();
        assert_eq!(json["total_issuance"], "1000000000000000000");
        assert_eq!(json["engagement_pool_balance"], "500000000000");
    }
}
