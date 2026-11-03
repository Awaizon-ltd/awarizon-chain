use crate::cache::RedisCache;
use anyhow::Result;
use serde_json::json;

pub struct NotificationService {
    cache: RedisCache,
}

impl NotificationService {
    pub fn new(cache: RedisCache) -> Self {
        Self { cache }
    }

    /// Exposes the underlying cache so callers on the ingestion path (see
    /// `routing::route_state`) can invalidate REST cache entries after a
    /// write, without threading a second `RedisCache` param everywhere
    /// `NotificationService` already flows.
    pub fn cache(&self) -> &RedisCache {
        &self.cache
    }

    /// Notify a wallet when an app is delivered to its inbox.
    pub async fn notify_inbox_delivery(
        &self,
        wallet: &str,
        campaign_id: &str,
        record_id: &str,
    ) -> Result<()> {
        let msg = json!({
            "type": "inbox_delivery",
            "wallet": wallet,
            "campaignId": campaign_id,
            "recordId": record_id,
        });

        self.cache.publish(&format!("wallet:{wallet}"), &msg.to_string()).await?;
        self.cache.publish("inbox:all", &msg.to_string()).await?;
        Ok(())
    }

    /// Notify a wallet when a reward is claimed. `amount_planck` is passed as
    /// a decimal string (reward_planck is NUMERIC(39,0) in Postgres — it can
    /// exceed i64::MAX, so it's never round-tripped through a fixed-width int).
    pub async fn notify_reward_claimed(&self, wallet: &str, amount_planck: &str, record_id: &str) -> Result<()> {
        let msg = json!({
            "type": "reward_claimed",
            "wallet": wallet,
            "amountPlanck": amount_planck,
            "recordId": record_id,
        });

        self.cache.publish(&format!("wallet:{wallet}"), &msg.to_string()).await?;
        Ok(())
    }

    /// Notify a developer when a campaign reaches a delivery milestone.
    pub async fn notify_campaign_milestone(&self, developer: &str, campaign_id: &str, deliveries: i64) -> Result<()> {
        const MILESTONES: [i64; 5] = [100, 500, 1000, 5000, 10000];
        if !MILESTONES.contains(&deliveries) {
            return Ok(());
        }

        let msg = json!({
            "type": "campaign_milestone",
            "developer": developer,
            "campaignId": campaign_id,
            "deliveries": deliveries,
        });

        self.cache.publish(&format!("developer:{developer}"), &msg.to_string()).await?;
        Ok(())
    }
}
