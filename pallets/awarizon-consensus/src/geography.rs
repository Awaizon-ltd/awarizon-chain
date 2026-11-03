use pallet_awarizon_types::constants::*;

pub mod regions {
    pub const NORTH_AMERICA: u8 = 0x01;
    pub const SOUTH_AMERICA: u8 = 0x02;
    pub const EUROPE: u8 = 0x03;
    pub const AFRICA: u8 = 0x04;
    pub const MIDDLE_EAST: u8 = 0x05;
    pub const SOUTH_ASIA: u8 = 0x06;
    pub const EAST_ASIA: u8 = 0x07;
    pub const SOUTHEAST_ASIA: u8 = 0x08;
    pub const OCEANIA: u8 = 0x09;
    pub const CENTRAL_ASIA: u8 = 0x0A;
}

pub struct GeographyEnforcer;

impl GeographyEnforcer {
    /// Returns true if adding one more validator from this region keeps the count
    /// at or below the 20% regional cap.
    /// `total_validators` is the current active count (before adding the candidate).
    pub fn check_region_cap(total_validators: u32, region_count: u32) -> bool {
        if total_validators == 0 {
            return true;
        }
        let new_region_count = region_count + 1;
        let new_total = total_validators + 1;

        // Floor: always allow at least MIN_VALIDATORS_PER_REGION
        // from any region regardless of percentage cap.
        // Percentage cap only meaningful when active set
        // is large enough for 20% to exceed the floor.
        if new_region_count <= MIN_VALIDATORS_PER_REGION {
            return true;
        }

        // Percentage check: region count must not exceed
        // MAX_VALIDATORS_PER_REGION_BPS (2000 = 20%) of total
        new_region_count * 10_000 <= new_total * MAX_VALIDATORS_PER_REGION_BPS
    }

    /// Returns true if adding one more validator from this country keeps the count
    /// at or below the 10% country cap.
    pub fn check_country_cap(total_validators: u32, country_count: u32) -> bool {
        if total_validators == 0 {
            return true;
        }
        let new_country_count = country_count + 1;
        let new_total = total_validators + 1;

        // Floor: always allow at least MIN_VALIDATORS_PER_COUNTRY
        // from any country regardless of percentage cap.
        if new_country_count <= MIN_VALIDATORS_PER_COUNTRY {
            return true;
        }

        // Percentage check: country count must not exceed
        // MAX_VALIDATORS_PER_COUNTRY_BPS (1000 = 10%) of total
        new_country_count * 10_000 <= new_total * MAX_VALIDATORS_PER_COUNTRY_BPS
    }

    /// Maximum validators allowed from one region given a total validator count.
    pub fn max_per_region(total_validators: u32) -> u32 {
        let pct_cap = total_validators
            * MAX_VALIDATORS_PER_REGION_BPS
            / 10_000;
        pct_cap.max(MIN_VALIDATORS_PER_REGION)
    }

    /// Maximum validators allowed from one country given a total validator count.
    pub fn max_per_country(total_validators: u32) -> u32 {
        let pct_cap = total_validators
            * MAX_VALIDATORS_PER_COUNTRY_BPS
            / 10_000;
        pct_cap.max(MIN_VALIDATORS_PER_COUNTRY)
    }
}
