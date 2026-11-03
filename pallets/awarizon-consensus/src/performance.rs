use pallet_awarizon_types::constants::*;

pub struct PerformanceCalculator;

impl PerformanceCalculator {
    /// Calculate performance score in basis points (0–10000).
    /// Each input is clamped to 10000 bps before weighting.
    pub fn score(
        uptime_bps: u32,
        finality_bps: u32,
        blocks_bps: u32,
        slash_history_bps: u32,
    ) -> u32 {
        let score = (uptime_bps.min(10_000) * PERF_WEIGHT_UPTIME_BPS / 10_000)
            + (finality_bps.min(10_000) * PERF_WEIGHT_FINALITY_BPS / 10_000)
            + (blocks_bps.min(10_000) * PERF_WEIGHT_BLOCKS_BPS / 10_000)
            + (slash_history_bps.min(10_000) * PERF_WEIGHT_SLASH_BPS / 10_000);
        score.min(10_000)
    }

    /// Calculate performance multiplier in basis points.
    /// Range: PERF_MULTIPLIER_MIN_BPS (5000) to PERF_MULTIPLIER_MAX_BPS (12500).
    pub fn multiplier(performance_score_bps: u32) -> u32 {
        let score = performance_score_bps.min(10_000);
        let range = PERF_MULTIPLIER_MAX_BPS - PERF_MULTIPLIER_MIN_BPS;
        PERF_MULTIPLIER_MIN_BPS + (score * range / 10_000)
    }

    /// Effective rank = delegated_stake × multiplier / 10000.
    pub fn effective_rank(delegated_stake: u128, performance_score_bps: u32) -> u128 {
        let multiplier = Self::multiplier(performance_score_bps) as u128;
        delegated_stake.saturating_mul(multiplier) / 10_000
    }
}
