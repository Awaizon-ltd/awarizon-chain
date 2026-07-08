use crate::db::queries;
use crate::db::sqlx_compat::PgPool;
use crate::decode;
use anyhow::Result;
use scale_value::Composite;

#[allow(clippy::too_many_arguments)]
pub async fn route_balances(
    pool: &PgPool,
    block_number: i64,
    block_hash: &str,
    event_index: i32,
    method: &str,
    fields: &Composite<u32>,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    if method != "Transfer" {
        return Ok(());
    }
    let (Some(from), Some(to), Some(amount)) = (
        decode::field_ss58(fields, "from"),
        decode::field_ss58(fields, "to"),
        decode::field_u128(fields, "amount"),
    ) else {
        return Ok(());
    };

    queries::insert_transfer(pool, block_number, block_hash, event_index, &from, &to, amount, timestamp_ms).await?;
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
            let Some(account) = decode::field_ss58(fields, "account") else { return Ok(()) };
            let riz_name = decode::field_string(fields, "riz_name");
            queries::insert_identity_event(
                pool, block_number, extrinsic_hash, "registered", &account,
                riz_name.as_deref(), None, None, None, timestamp_ms,
            )
            .await?;
        }
        "IdentityUpdated" => {
            let Some(account) = decode::field_ss58(fields, "account") else { return Ok(()) };
            queries::insert_identity_event(
                pool, block_number, extrinsic_hash, "updated", &account,
                None, None, None, None, timestamp_ms,
            )
            .await?;
        }
        "ReputationUpdated" => {
            let Some(account) = decode::field_ss58(fields, "account") else { return Ok(()) };
            let new_score = decode::field_u32(fields, "new_score").map(|n| n as i32);
            queries::insert_identity_event(
                pool, block_number, extrinsic_hash, "reputation_updated", &account,
                None, new_score, None, None, timestamp_ms,
            )
            .await?;
        }
        "NameTransferred" => {
            let (Some(from), Some(to)) =
                (decode::field_ss58(fields, "from"), decode::field_ss58(fields, "to"))
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

pub async fn route_state(
    pool: &PgPool,
    block_number: i64,
    extrinsic_hash: Option<&str>,
    method: &str,
    fields: &Composite<u32>,
    timestamp_ms: Option<i64>,
) -> Result<()> {
    match method {
        "CampaignCreated" => {
            let (Some(developer), Some(campaign_id)) = (
                decode::field_ss58(fields, "developer"),
                decode::field_hex32(fields, "campaign_id"),
            ) else {
                return Ok(());
            };
            queries::insert_campaign_event(
                pool, block_number, extrinsic_hash, "created", &campaign_id, Some(&developer), timestamp_ms,
            )
            .await?;
        }
        "CampaignTerminated" | "CampaignExpired" => {
            let Some(campaign_id) = decode::field_hex32(fields, "campaign_id") else { return Ok(()) };
            let event_type = if method == "CampaignTerminated" { "terminated" } else { "expired" };
            queries::insert_campaign_event(
                pool, block_number, extrinsic_hash, event_type, &campaign_id, None, timestamp_ms,
            )
            .await?;
        }
        "AppDelivered" => {
            let (Some(wallet), Some(record_id)) = (
                decode::field_ss58(fields, "wallet"),
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
        }
        "InboxRecordDismissed" | "EngagementSubmitted" => {
            let (Some(wallet), Some(record_id)) = (
                decode::field_ss58(fields, "wallet"),
                decode::field_hex32(fields, "record_id"),
            ) else {
                return Ok(());
            };
            let event_type = if method == "InboxRecordDismissed" { "dismissed" } else { "engaged" };
            queries::insert_inbox_event(
                pool, block_number, extrinsic_hash, event_type, &wallet, &record_id, None, None, timestamp_ms,
            )
            .await?;
        }
        "RewardClaimed" => {
            let (Some(wallet), Some(record_id)) = (
                decode::field_ss58(fields, "wallet"),
                decode::field_hex32(fields, "record_id"),
            ) else {
                return Ok(());
            };
            let amount = decode::field_u128(fields, "amount");
            queries::insert_inbox_event(
                pool, block_number, extrinsic_hash, "claimed", &wallet, &record_id, None, amount, timestamp_ms,
            )
            .await?;
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
            let Some(validator) = decode::field_ss58(fields, "validator") else { return Ok(()) };
            let amount = decode::field_u128(fields, "self_stake");
            insert_staking(pool, block_number, extrinsic_hash, "validator_registered", None, Some(&validator), amount, None, None, timestamp_ms).await
        }
        "ValidatorDeactivated" => {
            let Some(validator) = decode::field_ss58(fields, "validator") else { return Ok(()) };
            insert_staking(pool, block_number, extrinsic_hash, "validator_deactivated", None, Some(&validator), None, None, None, timestamp_ms).await
        }
        "DelegationAdded" | "DelegationRemoved" => {
            let (Some(delegator), Some(validator)) = (
                decode::field_ss58(fields, "delegator"),
                decode::field_ss58(fields, "validator"),
            ) else {
                return Ok(());
            };
            let amount = decode::field_u128(fields, "amount");
            let event_type = if method == "DelegationAdded" { "delegated" } else { "undelegated" };
            insert_staking(pool, block_number, extrinsic_hash, event_type, Some(&delegator), Some(&validator), amount, None, None, timestamp_ms).await
        }
        "ValidatorSlashed" => {
            let Some(validator) = decode::field_ss58(fields, "validator") else { return Ok(()) };
            let amount = decode::field_u128(fields, "amount");
            insert_staking(pool, block_number, extrinsic_hash, "slashed", None, Some(&validator), amount, None, None, timestamp_ms).await
        }
        "MisbehaviorSlashed" => {
            let Some(validator) = decode::field_ss58(fields, "validator") else { return Ok(()) };
            let amount = decode::field_u128(fields, "amount");
            insert_staking(pool, block_number, extrinsic_hash, "misbehavior_slashed", None, Some(&validator), amount, None, None, timestamp_ms).await
        }
        "CommissionUpdated" => {
            let Some(validator) = decode::field_ss58(fields, "validator") else { return Ok(()) };
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
            let Some(validator) = decode::field_ss58(fields, "validator") else { return Ok(()) };
            let amount = decode::field_u128(fields, "amount");
            insert_staking(pool, block_number, extrinsic_hash, "validator_reward_claimed", None, Some(&validator), amount, None, None, timestamp_ms).await
        }
        "DelegatorRewardClaimed" => {
            let Some(delegator) = decode::field_ss58(fields, "delegator") else { return Ok(()) };
            let amount = decode::field_u128(fields, "amount");
            insert_staking(pool, block_number, extrinsic_hash, "delegator_reward_claimed", Some(&delegator), None, amount, None, None, timestamp_ms).await
        }
        "DelegatorCompensated" => {
            let Some(delegator) = decode::field_ss58(fields, "delegator") else { return Ok(()) };
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
