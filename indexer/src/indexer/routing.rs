use crate::cache::keys;
use crate::db::queries;
use crate::db::sqlx_compat::PgPool;
use crate::decode;
use crate::indexer::metadata_resolver;
use crate::notifications::NotificationService;
use anyhow::Result;
use scale_value::Composite;

/// Cache writes are non-fatal to indexing — a Redis hiccup shouldn't stop
/// the sync loop, so failures are logged and swallowed rather than `?`'d.
async fn invalidate(notifier: &NotificationService, pattern: &str) {
    if let Err(e) = notifier.cache().del_pattern(pattern).await {
        tracing::warn!("Failed to invalidate cache pattern {}: {}", pattern, e);
    }
}

#[allow(clippy::too_many_arguments)]
pub async fn route_balances(
    pool: &PgPool,
    block_number: i64,
    block_hash: &str,
    event_index: i32,
    extrinsic_hash: Option<&str>,
    method: &str,
    fields: &Composite<u32>,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    if method != "Transfer" {
        return Ok(());
    }
    let (Some(from), Some(to), Some(amount)) = (
        decode::field_account_hex(fields, "from"),
        decode::field_account_hex(fields, "to"),
        decode::field_u128(fields, "amount"),
    ) else {
        return Ok(());
    };

    queries::insert_transfer(pool, block_number, block_hash, event_index, extrinsic_hash, &from, &to, amount, timestamp_ms).await?;
    Ok(())
}

pub async fn route_identity(
    pool: &PgPool,
    block_number: i64,
    extrinsic_hash: Option<&str>,
    method: &str,
    fields: &Composite<u32>,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    match method {
        "IdentityRegistered" => {
            let Some(account) = decode::field_account_hex(fields, "account") else { return Ok(()) };
            let riz_name = decode::field_string(fields, "riz_name");
            queries::insert_identity_event(
                pool, block_number, extrinsic_hash, "registered", &account,
                riz_name.as_deref(), None, None, None, timestamp_ms,
            )
            .await?;
        }
        "IdentityUpdated" => {
            let Some(account) = decode::field_account_hex(fields, "account") else { return Ok(()) };
            queries::insert_identity_event(
                pool, block_number, extrinsic_hash, "updated", &account,
                None, None, None, None, timestamp_ms,
            )
            .await?;
        }
        "ReputationUpdated" => {
            let Some(account) = decode::field_account_hex(fields, "account") else { return Ok(()) };
            let new_score = decode::field_u32(fields, "new_score").map(|n| n as i32);
            queries::insert_identity_event(
                pool, block_number, extrinsic_hash, "reputation_updated", &account,
                None, new_score, None, None, timestamp_ms,
            )
            .await?;
        }
        "NameTransferred" => {
            let (Some(from), Some(to)) =
                (decode::field_account_hex(fields, "from"), decode::field_account_hex(fields, "to"))
            else {
                return Ok(());
            };
            let name = decode::field_string(fields, "name");
            queries::insert_identity_event(
                pool, block_number, extrinsic_hash, "name_transferred", &from,
                name.as_deref(), None, Some(&from), Some(&to), timestamp_ms,
            )
            .await?;
        }
        _ => {}
    }
    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub async fn route_state(
    pool: &PgPool,
    notifier: &NotificationService,
    block_number: i64,
    extrinsic_hash: Option<&str>,
    method: &str,
    fields: &Composite<u32>,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    match method {
        "CampaignCreated" => {
            let (Some(developer), Some(campaign_id)) = (
                decode::field_account_hex(fields, "developer"),
                decode::field_hex32(fields, "campaign_id"),
            ) else {
                return Ok(());
            };
            queries::insert_campaign_event(
                pool, block_number, extrinsic_hash, "created", &campaign_id, Some(&developer), timestamp_ms,
            )
            .await?;
            invalidate(notifier, keys::campaign_events_pattern()).await;
        }
        "CampaignTerminated" | "CampaignExpired" => {
            let Some(campaign_id) = decode::field_hex32(fields, "campaign_id") else { return Ok(()) };
            let event_type = if method == "CampaignTerminated" { "terminated" } else { "expired" };
            queries::insert_campaign_event(
                pool, block_number, extrinsic_hash, event_type, &campaign_id, None, timestamp_ms,
            )
            .await?;
            invalidate(notifier, keys::campaign_events_pattern()).await;
        }
        "AppDelivered" => {
            let (Some(wallet), Some(record_id)) = (
                decode::field_account_hex(fields, "wallet"),
                decode::field_hex32(fields, "record_id"),
            ) else {
                return Ok(());
            };
            let campaign_id = decode::field_hex32(fields, "campaign_id");
            queries::insert_inbox_event(
                pool, block_number, extrinsic_hash, "delivered", &wallet, &record_id,
                campaign_id.as_deref(), None, timestamp_ms,
            )
            .await?;
            if let Some(campaign_id) = campaign_id.as_deref() {
                queries::insert_campaign_delivery(pool, campaign_id, &wallet, block_number, Some(&record_id)).await?;
            }
            invalidate(notifier, &keys::inbox_events_pattern(Some(&wallet))).await;
            invalidate(notifier, &keys::inbox_events_pattern(None)).await;
            if let Some(campaign_id) = campaign_id.as_deref() {
                if let Err(e) = notifier.notify_inbox_delivery(&wallet, campaign_id, &record_id).await {
                    tracing::warn!("Failed to publish inbox_delivery notification: {}", e);
                }
            }
        }
        "InboxRecordDismissed" | "EngagementSubmitted" => {
            let (Some(wallet), Some(record_id)) = (
                decode::field_account_hex(fields, "wallet"),
                decode::field_hex32(fields, "record_id"),
            ) else {
                return Ok(());
            };
            let event_type = if method == "InboxRecordDismissed" { "dismissed" } else { "engaged" };
            queries::insert_inbox_event(
                pool, block_number, extrinsic_hash, event_type, &wallet, &record_id, None, None, timestamp_ms,
            )
            .await?;
            invalidate(notifier, &keys::inbox_events_pattern(Some(&wallet))).await;
            invalidate(notifier, &keys::inbox_events_pattern(None)).await;
        }
        "RewardClaimed" => {
            let (Some(wallet), Some(record_id)) = (
                decode::field_account_hex(fields, "wallet"),
                decode::field_hex32(fields, "record_id"),
            ) else {
                return Ok(());
            };
            let amount = decode::field_u128(fields, "amount");
            queries::insert_inbox_event(
                pool, block_number, extrinsic_hash, "claimed", &wallet, &record_id, None, amount, timestamp_ms,
            )
            .await?;
            invalidate(notifier, &keys::inbox_events_pattern(Some(&wallet))).await;
            invalidate(notifier, &keys::inbox_events_pattern(None)).await;
            if let Some(amount) = amount {
                if let Err(e) = notifier.notify_reward_claimed(&wallet, &amount.to_string(), &record_id).await {
                    tracing::warn!("Failed to publish reward_claimed notification: {}", e);
                }
            }
        }
        _ => {}
    }
    Ok(())
}

pub async fn route_consensus(
    pool: &PgPool,
    block_number: i64,
    extrinsic_hash: Option<&str>,
    method: &str,
    fields: &Composite<u32>,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    match method {
        "ValidatorRegistered" => {
            let Some(validator) = decode::field_account_hex(fields, "validator") else { return Ok(()) };
            let amount = decode::field_u128(fields, "self_stake");
            insert_staking(pool, block_number, extrinsic_hash, "validator_registered", None, Some(&validator), amount, None, None, timestamp_ms).await
        }
        "ValidatorDeactivated" => {
            let Some(validator) = decode::field_account_hex(fields, "validator") else { return Ok(()) };
            insert_staking(pool, block_number, extrinsic_hash, "validator_deactivated", None, Some(&validator), None, None, None, timestamp_ms).await
        }
        "DelegationAdded" | "DelegationRemoved" => {
            let (Some(delegator), Some(validator)) = (
                decode::field_account_hex(fields, "delegator"),
                decode::field_account_hex(fields, "validator"),
            ) else {
                return Ok(());
            };
            let amount = decode::field_u128(fields, "amount");
            let event_type = if method == "DelegationAdded" { "delegated" } else { "undelegated" };
            insert_staking(pool, block_number, extrinsic_hash, event_type, Some(&delegator), Some(&validator), amount, None, None, timestamp_ms).await
        }
        "ValidatorSlashed" => {
            let Some(validator) = decode::field_account_hex(fields, "validator") else { return Ok(()) };
            let amount = decode::field_u128(fields, "amount");
            insert_staking(pool, block_number, extrinsic_hash, "slashed", None, Some(&validator), amount, None, None, timestamp_ms).await
        }
        "MisbehaviorSlashed" => {
            let Some(validator) = decode::field_account_hex(fields, "validator") else { return Ok(()) };
            let amount = decode::field_u128(fields, "amount");
            insert_staking(pool, block_number, extrinsic_hash, "misbehavior_slashed", None, Some(&validator), amount, None, None, timestamp_ms).await
        }
        "CommissionUpdated" => {
            let Some(validator) = decode::field_account_hex(fields, "validator") else { return Ok(()) };
            let commission = decode::field_u32(fields, "commission").map(|n| n as i32);
            insert_staking(pool, block_number, extrinsic_hash, "commission_updated", None, Some(&validator), None, None, commission, timestamp_ms).await
        }
        "EpochElectionCompleted" => {
            let epoch = decode::field_u64(fields, "epoch").map(|n| n as i64);
            insert_staking(pool, block_number, extrinsic_hash, "epoch_election_completed", None, None, None, epoch, None, timestamp_ms).await
        }
        "RewardsDistributed" => {
            let epoch = decode::field_u64(fields, "epoch").map(|n| n as i64);
            let amount = decode::field_u128(fields, "total_distributed");
            insert_staking(pool, block_number, extrinsic_hash, "rewards_distributed", None, None, amount, epoch, None, timestamp_ms).await
        }
        "ValidatorRewardClaimed" => {
            let Some(validator) = decode::field_account_hex(fields, "validator") else { return Ok(()) };
            let amount = decode::field_u128(fields, "amount");
            insert_staking(pool, block_number, extrinsic_hash, "validator_reward_claimed", None, Some(&validator), amount, None, None, timestamp_ms).await
        }
        "DelegatorRewardClaimed" => {
            let Some(delegator) = decode::field_account_hex(fields, "delegator") else { return Ok(()) };
            let amount = decode::field_u128(fields, "amount");
            insert_staking(pool, block_number, extrinsic_hash, "delegator_reward_claimed", Some(&delegator), None, amount, None, None, timestamp_ms).await
        }
        "DelegatorCompensated" => {
            let Some(delegator) = decode::field_account_hex(fields, "delegator") else { return Ok(()) };
            let amount = decode::field_u128(fields, "amount");
            insert_staking(pool, block_number, extrinsic_hash, "delegator_compensated", Some(&delegator), None, amount, None, None, timestamp_ms).await
        }
        "YieldReserveEmission" => {
            let epoch = decode::field_u64(fields, "epoch").map(|n| n as i64);
            let amount = decode::field_u128(fields, "amount");
            insert_staking(pool, block_number, extrinsic_hash, "yield_reserve_emission", None, None, amount, epoch, None, timestamp_ms).await
        }
        "FeeDeposited" => {
            let amount = decode::field_u128(fields, "amount");
            insert_staking(pool, block_number, extrinsic_hash, "fee_deposited", None, None, amount, None, None, timestamp_ms).await
        }
        _ => Ok(()),
    }
}

#[allow(clippy::too_many_arguments)]
pub async fn route_dex(
    pool: &PgPool,
    block_number: i64,
    block_hash: &str,
    event_index: i32,
    extrinsic_hash: Option<&str>,
    method: &str,
    fields: &Composite<u32>,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    match method {
        "PoolCreated" => {
            let (Some((asset_a, asset_b)), Some(lp_asset_id), Some(creator), Some(reserve_a), Some(reserve_b)) = (
                decode::field_pool_id(fields, "pool_id"),
                decode::field_u32(fields, "lp_asset_id"),
                decode::field_account_hex(fields, "creator"),
                decode::field_u128(fields, "reserve_a"),
                decode::field_u128(fields, "reserve_b"),
            ) else {
                return Ok(());
            };
            queries::upsert_dex_pool_created(
                pool, &asset_a, &asset_b, lp_asset_id as i32, reserve_a, reserve_b, &creator, block_number,
            )
            .await?;
        }
        "LiquidityAdded" | "LiquidityRemoved" => {
            let (
                Some((asset_a, asset_b)),
                Some(provider),
                Some(amount_a),
                Some(amount_b),
                Some(reserve_a),
                Some(reserve_b),
                Some(lp_total_supply),
            ) = (
                decode::field_pool_id(fields, "pool_id"),
                decode::field_account_hex(fields, "provider"),
                decode::field_u128(fields, "amount_a"),
                decode::field_u128(fields, "amount_b"),
                decode::field_u128(fields, "reserve_a"),
                decode::field_u128(fields, "reserve_b"),
                decode::field_u128(fields, "lp_total_supply"),
            )
            else {
                return Ok(());
            };
            let (event_type, lp_field) =
                if method == "LiquidityAdded" { ("added", "lp_minted") } else { ("removed", "lp_burned") };
            let lp_amount = decode::field_u128(fields, lp_field).unwrap_or(0);

            queries::update_dex_pool_liquidity(pool, &asset_a, &asset_b, reserve_a, reserve_b, lp_total_supply, block_number)
                .await?;
            queries::insert_dex_liquidity_event(
                pool, block_number, block_hash, extrinsic_hash, event_index, event_type,
                &asset_a, &asset_b, &provider, amount_a, amount_b, lp_amount,
                reserve_a, reserve_b, lp_total_supply, timestamp_ms,
            )
            .await?;
        }
        "Swapped" => {
            let (
                Some((asset_a, asset_b)),
                Some(trader),
                Some(asset_in),
                Some(asset_out),
                Some(amount_in),
                Some(amount_out),
                Some(fee),
                Some(protocol_fee),
                Some(reserve_a),
                Some(reserve_b),
                Some(price_a_per_b),
                Some(price_b_per_a),
            ) = (
                decode::field_pool_id(fields, "pool_id"),
                decode::field_account_hex(fields, "trader"),
                decode::field_asset(fields, "asset_in"),
                decode::field_asset(fields, "asset_out"),
                decode::field_u128(fields, "amount_in"),
                decode::field_u128(fields, "amount_out"),
                decode::field_u128(fields, "fee"),
                decode::field_u128(fields, "protocol_fee"),
                decode::field_u128(fields, "reserve_a"),
                decode::field_u128(fields, "reserve_b"),
                decode::field_u128(fields, "price_a_per_b"),
                decode::field_u128(fields, "price_b_per_a"),
            )
            else {
                return Ok(());
            };
            let protocol_fee_burned = decode::field_bool(fields, "protocol_fee_burned").unwrap_or(true);

            queries::update_dex_pool_after_swap(pool, &asset_a, &asset_b, reserve_a, reserve_b, amount_in, fee, protocol_fee, block_number)
                .await?;
            queries::insert_dex_swap(
                pool, block_number, block_hash, extrinsic_hash, event_index,
                &trader, &asset_in, &asset_out, amount_in, amount_out,
                Some(fee), Some(protocol_fee), Some(protocol_fee_burned),
                Some(reserve_a), Some(reserve_b), Some(price_a_per_b), Some(price_b_per_a),
                false, None, timestamp_ms,
            )
            .await?;
        }
        "MultiHopSwapped" => {
            // No per-pool fee/reserve breakdown is available here — see the doc
            // comment on `queries::update_dex_pool_after_swap` for why — so this
            // only records the swap itself, not a dex_pools update.
            let (Some(trader), Some(path), Some(amount_in), Some(amount_out)) = (
                decode::field_account_hex(fields, "trader"),
                decode::field_asset_vec(fields, "path"),
                decode::field_u128(fields, "amount_in"),
                decode::field_u128(fields, "amount_out"),
            ) else {
                return Ok(());
            };
            let (Some(asset_in), Some(asset_out)) = (path.first().cloned(), path.last().cloned()) else {
                return Ok(());
            };
            let hop_path = serde_json::to_string(&path).ok();

            queries::insert_dex_swap(
                pool, block_number, block_hash, extrinsic_hash, event_index,
                &trader, &asset_in, &asset_out, amount_in, amount_out,
                None, None, None, None, None, None, None,
                true, hop_path.as_deref(), timestamp_ms,
            )
            .await?;
        }
        "PriceUpdated" => {
            let (Some((asset_a, asset_b)), Some(price_a_per_b), Some(price_b_per_a)) = (
                decode::field_pool_id(fields, "pool_id"),
                decode::field_u128(fields, "price_a_per_b"),
                decode::field_u128(fields, "price_b_per_a"),
            ) else {
                return Ok(());
            };
            queries::insert_dex_price_point(pool, block_number, &asset_a, &asset_b, price_a_per_b, price_b_per_a, timestamp_ms)
                .await?;
        }
        "ProtocolFeeProcessed" => {
            let Some(amount) = decode::field_u128(fields, "amount") else { return Ok(()) };
            let burned = decode::field_bool(fields, "burned").unwrap_or(true);
            queries::insert_dex_protocol_fee(pool, block_number, extrinsic_hash, amount, burned, timestamp_ms).await?;
        }
        _ => {}
    }
    Ok(())
}

/// Routes pallet_nfts events into the nft_collections/nft_items/nft_events
/// tables for the rizart.xyz marketplace. Swap-related events (SwapCreated/
/// SwapClaimed/SwapCancelled) aren't handled — atomic item-for-item swaps are
/// a separate feature with no schema here yet.
#[allow(clippy::too_many_arguments)]
pub async fn route_nfts(
    pool: &PgPool,
    block_number: i64,
    block_hash: &str,
    event_index: i32,
    extrinsic_hash: Option<&str>,
    method: &str,
    fields: &Composite<u32>,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    match method {
        "Created" => {
            let (Some(collection), Some(owner)) =
                (decode::field_u32(fields, "collection"), decode::field_account_hex(fields, "owner"))
            else {
                return Ok(());
            };
            let creator = decode::field_account_hex(fields, "creator");
            let collection_id = collection as i64;
            queries::upsert_nft_collection(pool, collection_id, &owner, creator.as_deref(), block_number).await?;
            queries::insert_nft_event(
                pool, block_number, block_hash, extrinsic_hash, event_index, "create",
                collection_id, None, creator.as_deref(), Some(&owner), None, timestamp_ms,
            )
            .await?;
        }
        "ForceCreated" => {
            let (Some(collection), Some(owner)) =
                (decode::field_u32(fields, "collection"), decode::field_account_hex(fields, "owner"))
            else {
                return Ok(());
            };
            let collection_id = collection as i64;
            queries::upsert_nft_collection(pool, collection_id, &owner, None, block_number).await?;
            queries::insert_nft_event(
                pool, block_number, block_hash, extrinsic_hash, event_index, "create",
                collection_id, None, None, Some(&owner), None, timestamp_ms,
            )
            .await?;
        }
        "Destroyed" => {
            let Some(collection) = decode::field_u32(fields, "collection") else { return Ok(()) };
            let collection_id = collection as i64;
            queries::mark_nft_collection_destroyed(pool, collection_id, block_number).await?;
            queries::insert_nft_event(
                pool, block_number, block_hash, extrinsic_hash, event_index, "destroy",
                collection_id, None, None, None, None, timestamp_ms,
            )
            .await?;
        }
        "Issued" => {
            let (Some(collection), Some(item), Some(owner)) = (
                decode::field_u32(fields, "collection"),
                decode::field_u32(fields, "item"),
                decode::field_account_hex(fields, "owner"),
            ) else {
                return Ok(());
            };
            let (collection_id, item_id) = (collection as i64, item as i64);
            queries::insert_nft_item(pool, collection_id, item_id, &owner, block_number).await?;
            queries::insert_nft_event(
                pool, block_number, block_hash, extrinsic_hash, event_index, "mint",
                collection_id, Some(item_id), None, Some(&owner), None, timestamp_ms,
            )
            .await?;
        }
        "Transferred" => {
            let (Some(collection), Some(item), Some(from), Some(to)) = (
                decode::field_u32(fields, "collection"),
                decode::field_u32(fields, "item"),
                decode::field_account_hex(fields, "from"),
                decode::field_account_hex(fields, "to"),
            ) else {
                return Ok(());
            };
            let (collection_id, item_id) = (collection as i64, item as i64);
            queries::transfer_nft_item(pool, collection_id, item_id, &to, block_number).await?;
            queries::insert_nft_event(
                pool, block_number, block_hash, extrinsic_hash, event_index, "transfer",
                collection_id, Some(item_id), Some(&from), Some(&to), None, timestamp_ms,
            )
            .await?;
        }
        "Burned" => {
            let (Some(collection), Some(item), Some(owner)) = (
                decode::field_u32(fields, "collection"),
                decode::field_u32(fields, "item"),
                decode::field_account_hex(fields, "owner"),
            ) else {
                return Ok(());
            };
            let (collection_id, item_id) = (collection as i64, item as i64);
            queries::burn_nft_item(pool, collection_id, item_id, block_number).await?;
            queries::insert_nft_event(
                pool, block_number, block_hash, extrinsic_hash, event_index, "burn",
                collection_id, Some(item_id), Some(&owner), None, None, timestamp_ms,
            )
            .await?;
        }
        "ItemMetadataSet" => {
            let (Some(collection), Some(item)) =
                (decode::field_u32(fields, "collection"), decode::field_u32(fields, "item"))
            else {
                return Ok(());
            };
            let data = decode::field_string(fields, "data");
            queries::set_nft_item_metadata(pool, collection as i64, item as i64, data.as_deref(), block_number).await?;
            if let Some(uri) = data {
                metadata_resolver::spawn_resolve_item(pool.clone(), collection as i64, item as i64, uri);
            }
        }
        "ItemMetadataCleared" => {
            let (Some(collection), Some(item)) =
                (decode::field_u32(fields, "collection"), decode::field_u32(fields, "item"))
            else {
                return Ok(());
            };
            queries::set_nft_item_metadata(pool, collection as i64, item as i64, None, block_number).await?;
        }
        "CollectionMetadataSet" => {
            let Some(collection) = decode::field_u32(fields, "collection") else { return Ok(()) };
            let data = decode::field_string(fields, "data");
            queries::update_nft_collection_metadata(pool, collection as i64, data.as_deref(), block_number).await?;
            if let Some(uri) = data {
                metadata_resolver::spawn_resolve_collection(pool.clone(), collection as i64, uri);
            }
        }
        "CollectionMetadataCleared" => {
            let Some(collection) = decode::field_u32(fields, "collection") else { return Ok(()) };
            queries::update_nft_collection_metadata(pool, collection as i64, None, block_number).await?;
        }
        "ItemPriceSet" => {
            let (Some(collection), Some(item), Some(price)) = (
                decode::field_u32(fields, "collection"),
                decode::field_u32(fields, "item"),
                decode::field_u128(fields, "price"),
            ) else {
                return Ok(());
            };
            let buyer = decode::field_account_hex(fields, "whitelisted_buyer");
            let (collection_id, item_id) = (collection as i64, item as i64);
            queries::set_nft_item_price(pool, collection_id, item_id, price, buyer.as_deref(), block_number).await?;
            queries::insert_nft_event(
                pool, block_number, block_hash, extrinsic_hash, event_index, "list",
                collection_id, Some(item_id), None, None, Some(price), timestamp_ms,
            )
            .await?;
        }
        "ItemPriceRemoved" => {
            let (Some(collection), Some(item)) =
                (decode::field_u32(fields, "collection"), decode::field_u32(fields, "item"))
            else {
                return Ok(());
            };
            let (collection_id, item_id) = (collection as i64, item as i64);
            queries::remove_nft_item_price(pool, collection_id, item_id, block_number).await?;
            queries::insert_nft_event(
                pool, block_number, block_hash, extrinsic_hash, event_index, "delist",
                collection_id, Some(item_id), None, None, None, timestamp_ms,
            )
            .await?;
        }
        "ItemBought" => {
            let (Some(collection), Some(item), Some(price), Some(buyer)) = (
                decode::field_u32(fields, "collection"),
                decode::field_u32(fields, "item"),
                decode::field_u128(fields, "price"),
                decode::field_account_hex(fields, "buyer"),
            ) else {
                return Ok(());
            };
            let seller = decode::field_account_hex(fields, "seller");
            let (collection_id, item_id) = (collection as i64, item as i64);
            queries::process_nft_sale(pool, collection_id, item_id, price, &buyer, block_number).await?;
            queries::insert_nft_event(
                pool, block_number, block_hash, extrinsic_hash, event_index, "sale",
                collection_id, Some(item_id), seller.as_deref(), Some(&buyer), Some(price), timestamp_ms,
            )
            .await?;
        }
        "CollectionMaxSupplySet" => {
            let (Some(collection), Some(max_supply)) =
                (decode::field_u32(fields, "collection"), decode::field_u32(fields, "max_supply"))
            else {
                return Ok(());
            };
            queries::update_nft_collection_max_supply(pool, collection as i64, max_supply as i64, block_number).await?;
        }
        "OwnerChanged" => {
            let (Some(collection), Some(new_owner)) =
                (decode::field_u32(fields, "collection"), decode::field_account_hex(fields, "new_owner"))
            else {
                return Ok(());
            };
            let collection_id = collection as i64;
            queries::update_nft_collection_owner(pool, collection_id, &new_owner, block_number).await?;
            queries::insert_nft_event(
                pool, block_number, block_hash, extrinsic_hash, event_index, "owner_changed",
                collection_id, None, None, Some(&new_owner), None, timestamp_ms,
            )
            .await?;
        }
        _ => {}
    }
    Ok(())
}

/// Routes pallet_assets events into the assets/asset_holders/asset_transfers
/// tables. Issued/Burned double-book into asset_transfers as a mint (from
/// NULL) / burn (to NULL) row alongside the normal Transferred rows, so the
/// transfer feed for one asset is complete without a separate mint/burn log.
#[allow(clippy::too_many_arguments)]
pub async fn route_assets(
    pool: &PgPool,
    block_number: i64,
    block_hash: &str,
    event_index: i32,
    extrinsic_hash: Option<&str>,
    method: &str,
    fields: &Composite<u32>,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    match method {
        "Created" => {
            let (Some(asset_id), Some(creator), Some(owner)) = (
                decode::field_u32(fields, "asset_id"),
                decode::field_account_hex(fields, "creator"),
                decode::field_account_hex(fields, "owner"),
            ) else {
                return Ok(());
            };
            queries::insert_asset(pool, asset_id as i64, Some(&creator), &owner, block_number).await?;
        }
        "ForceCreated" => {
            let (Some(asset_id), Some(owner)) =
                (decode::field_u32(fields, "asset_id"), decode::field_account_hex(fields, "owner"))
            else {
                return Ok(());
            };
            queries::insert_asset(pool, asset_id as i64, None, &owner, block_number).await?;
        }
        "MetadataSet" => {
            let Some(asset_id) = decode::field_u32(fields, "asset_id") else { return Ok(()) };
            let name = decode::field_string(fields, "name").unwrap_or_default();
            let symbol = decode::field_string(fields, "symbol").unwrap_or_default();
            let decimals = decode::field_u8(fields, "decimals").unwrap_or(0);
            queries::update_asset_metadata(pool, asset_id as i64, &name, &symbol, decimals as i16, block_number).await?;
        }
        "MetadataCleared" => {
            let Some(asset_id) = decode::field_u32(fields, "asset_id") else { return Ok(()) };
            queries::clear_asset_metadata(pool, asset_id as i64, block_number).await?;
        }
        "Issued" => {
            let (Some(asset_id), Some(owner), Some(amount)) = (
                decode::field_u32(fields, "asset_id"),
                decode::field_account_hex(fields, "owner"),
                decode::field_u128(fields, "amount"),
            ) else {
                return Ok(());
            };
            let asset_id = asset_id as i64;
            queries::upsert_asset_holder(pool, asset_id, &owner, amount as i128, block_number).await?;
            queries::update_asset_supply(pool, asset_id, amount as i128, block_number).await?;
            queries::insert_asset_transfer(
                pool, block_number, block_hash, extrinsic_hash, event_index,
                asset_id, None, Some(&owner), amount, timestamp_ms,
            )
            .await?;
        }
        "Transferred" => {
            let (Some(asset_id), Some(from), Some(to), Some(amount)) = (
                decode::field_u32(fields, "asset_id"),
                decode::field_account_hex(fields, "from"),
                decode::field_account_hex(fields, "to"),
                decode::field_u128(fields, "amount"),
            ) else {
                return Ok(());
            };
            let asset_id = asset_id as i64;
            queries::upsert_asset_holder(pool, asset_id, &from, -(amount as i128), block_number).await?;
            queries::upsert_asset_holder(pool, asset_id, &to, amount as i128, block_number).await?;
            queries::insert_asset_transfer(
                pool, block_number, block_hash, extrinsic_hash, event_index,
                asset_id, Some(&from), Some(&to), amount, timestamp_ms,
            )
            .await?;
        }
        "Burned" => {
            let (Some(asset_id), Some(owner), Some(balance)) = (
                decode::field_u32(fields, "asset_id"),
                decode::field_account_hex(fields, "owner"),
                decode::field_u128(fields, "balance"),
            ) else {
                return Ok(());
            };
            let asset_id = asset_id as i64;
            queries::upsert_asset_holder(pool, asset_id, &owner, -(balance as i128), block_number).await?;
            queries::update_asset_supply(pool, asset_id, -(balance as i128), block_number).await?;
            queries::insert_asset_transfer(
                pool, block_number, block_hash, extrinsic_hash, event_index,
                asset_id, Some(&owner), None, balance, timestamp_ms,
            )
            .await?;
        }
        "Deposited" => {
            let (Some(asset_id), Some(who), Some(amount)) = (
                decode::field_u32(fields, "asset_id"),
                decode::field_account_hex(fields, "who"),
                decode::field_u128(fields, "amount"),
            ) else {
                return Ok(());
            };
            queries::upsert_asset_holder(pool, asset_id as i64, &who, amount as i128, block_number).await?;
        }
        "Withdrawn" => {
            let (Some(asset_id), Some(who), Some(amount)) = (
                decode::field_u32(fields, "asset_id"),
                decode::field_account_hex(fields, "who"),
                decode::field_u128(fields, "amount"),
            ) else {
                return Ok(());
            };
            queries::upsert_asset_holder(pool, asset_id as i64, &who, -(amount as i128), block_number).await?;
        }
        "OwnerChanged" => {
            let (Some(asset_id), Some(owner)) =
                (decode::field_u32(fields, "asset_id"), decode::field_account_hex(fields, "owner"))
            else {
                return Ok(());
            };
            queries::update_asset_owner(pool, asset_id as i64, &owner, block_number).await?;
        }
        "AssetFrozen" => {
            let Some(asset_id) = decode::field_u32(fields, "asset_id") else { return Ok(()) };
            queries::freeze_asset(pool, asset_id as i64, block_number).await?;
        }
        "AssetThawed" => {
            let Some(asset_id) = decode::field_u32(fields, "asset_id") else { return Ok(()) };
            queries::thaw_asset(pool, asset_id as i64, block_number).await?;
        }
        "Destroyed" => {
            let Some(asset_id) = decode::field_u32(fields, "asset_id") else { return Ok(()) };
            queries::destroy_asset(pool, asset_id as i64, block_number).await?;
        }
        _ => {}
    }
    Ok(())
}

#[allow(clippy::too_many_arguments)]
async fn insert_staking(
    pool: &PgPool,
    block_number: i64,
    extrinsic_hash: Option<&str>,
    event_type: &str,
    delegator: Option<&str>,
    validator: Option<&str>,
    amount: Option<u128>,
    epoch: Option<i64>,
    commission: Option<i32>,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    queries::insert_staking_event(
        pool, block_number, extrinsic_hash, event_type, delegator, validator, amount, epoch, commission, timestamp_ms,
    )
    .await?;
    Ok(())
}
