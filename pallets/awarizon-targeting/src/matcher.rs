pub struct TargetingMatcher;

impl TargetingMatcher {
    pub fn matches_precisely(
        criteria: &pallet_awarizon_types::TargetingCriteria,
        wallet_age_days: u32,
        activity_count: u32,
        category_history: &[u8],
        region_code: u8,
        riz_balance: u128,
    ) -> bool {
        if let Some(min) = criteria.wallet_age_min {
            if wallet_age_days < min {
                return false;
            }
        }
        if let Some(max) = criteria.wallet_age_max {
            if wallet_age_days > max {
                return false;
            }
        }
        if let Some(min) = criteria.riz_balance_min {
            if riz_balance < min {
                return false;
            }
        }
        if let Some(max) = criteria.riz_balance_max {
            if riz_balance > max {
                return false;
            }
        }
        if let Some(min) = criteria.activity_min {
            if activity_count < min {
                return false;
            }
        }
        if let Some(max) = criteria.activity_max {
            if activity_count > max {
                return false;
            }
        }
        if !criteria.region_codes.is_empty() {
            let region_matches = criteria.region_codes.iter().any(|r| *r == region_code);
            if !region_matches {
                return false;
            }
        }
        if !criteria.category_history.is_empty() {
            let has_category = criteria
                .category_history
                .iter()
                .any(|c| category_history.contains(&c.to_id()));
            if !has_category {
                return false;
            }
        }
        true
    }
}
