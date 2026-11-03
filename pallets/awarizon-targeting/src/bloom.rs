use sp_io::hashing::blake2_256;

pub const BLOOM_BITS: usize = 65_536;
pub const BLOOM_BYTES: usize = BLOOM_BITS / 8; // 8192
pub const BLOOM_HASH_FUNCTIONS: usize = 7;

pub struct BloomFilter {
    bits: [u8; BLOOM_BYTES],
}

impl BloomFilter {
    pub fn new() -> Self {
        Self { bits: [0u8; BLOOM_BYTES] }
    }

    fn hash_with_seed(item: &[u8], seed: u8) -> usize {
        let mut input = [0u8; 33];
        input[0] = seed;
        let len = item.len().min(32);
        input[1..1 + len].copy_from_slice(&item[..len]);
        let hash = blake2_256(&input);
        u16::from_le_bytes([hash[0], hash[1]]) as usize
    }

    fn set_bit(&mut self, pos: usize) {
        let byte_pos = pos / 8;
        let bit_pos = pos % 8;
        if byte_pos < BLOOM_BYTES {
            self.bits[byte_pos] |= 1 << bit_pos;
        }
    }

    fn check_bit(&self, pos: usize) -> bool {
        let byte_pos = pos / 8;
        let bit_pos = pos % 8;
        if byte_pos < BLOOM_BYTES {
            (self.bits[byte_pos] >> bit_pos) & 1 == 1
        } else {
            false
        }
    }

    pub fn add(&mut self, item: &[u8]) {
        for seed in 0..BLOOM_HASH_FUNCTIONS as u8 {
            let pos = Self::hash_with_seed(item, seed);
            self.set_bit(pos);
        }
    }

    pub fn might_contain(&self, item: &[u8]) -> bool {
        for seed in 0..BLOOM_HASH_FUNCTIONS as u8 {
            let pos = Self::hash_with_seed(item, seed);
            if !self.check_bit(pos) {
                return false;
            }
        }
        true
    }

    pub fn from_targeting_criteria(
        criteria: &pallet_awarizon_types::TargetingCriteria,
    ) -> Self {
        let mut filter = Self::new();
        if let Some(min) = criteria.wallet_age_min {
            filter.add(&min.to_le_bytes());
        }
        if let Some(max) = criteria.wallet_age_max {
            filter.add(&max.to_le_bytes());
        }
        if let Some(min) = criteria.riz_balance_min {
            filter.add(&min.to_le_bytes());
        }
        if let Some(max) = criteria.riz_balance_max {
            filter.add(&max.to_le_bytes());
        }
        if let Some(min) = criteria.activity_min {
            filter.add(&min.to_le_bytes());
        }
        if let Some(max) = criteria.activity_max {
            filter.add(&max.to_le_bytes());
        }
        for region in criteria.region_codes.iter() {
            filter.add(&[*region]);
        }
        for category in criteria.category_history.iter() {
            filter.add(&[category.to_id()]);
        }
        filter
    }

    pub fn as_bytes(&self) -> &[u8; BLOOM_BYTES] {
        &self.bits
    }
}
