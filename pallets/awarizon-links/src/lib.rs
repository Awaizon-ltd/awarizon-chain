#![cfg_attr(not(feature = "std"), no_std)]

extern crate alloc;

pub use pallet::*;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

#[frame_support::pallet]
pub mod pallet {
    use alloc::vec::Vec;
    use frame_support::{
        pallet_prelude::*,
    };
    use frame_system::pallet_prelude::*;
    use pallet_awarizon_types::{
        ChainType, LinkedAddress, LinkStatus, MAX_LINKED_ADDRESSES,
    };

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type RuntimeEvent: From<Event<Self>>
            + IsType<<Self as frame_system::Config>::RuntimeEvent>;
        type WeightInfo: WeightInfo;
    }

    pub trait WeightInfo {
        fn link_evm_address() -> Weight;
        fn link_solana_address() -> Weight;
        fn unlink_address() -> Weight;
        fn verify_link() -> Weight;
    }

    impl WeightInfo for () {
        fn link_evm_address() -> Weight { Weight::from_parts(150_000_000, 0) }
        fn link_solana_address() -> Weight { Weight::from_parts(150_000_000, 0) }
        fn unlink_address() -> Weight { Weight::from_parts(50_000_000, 0) }
        fn verify_link() -> Weight { Weight::from_parts(10_000_000, 0) }
    }

    // ================================================================
    // Storage
    // ================================================================

    /// Maps (AccountId, ChainType) to LinkedAddress.
    #[pallet::storage]
    pub type LinkedAddresses<T: Config> = StorageDoubleMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        Blake2_128Concat,
        ChainType,
        LinkedAddress<BlockNumberFor<T>>,
    >;

    /// Total verified cross-chain links.
    #[pallet::storage]
    pub type TotalVerifiedLinks<T: Config> = StorageValue<_, u32, ValueQuery>;

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    // ================================================================
    // Events
    // ================================================================

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        AddressLinkSubmitted {
            account: T::AccountId,
            chain: ChainType,
            address_display: Vec<u8>,
        },
        AddressLinkVerified {
            account: T::AccountId,
            chain: ChainType,
        },
        AddressUnlinked {
            account: T::AccountId,
            chain: ChainType,
        },
    }

    // ================================================================
    // Errors
    // ================================================================

    #[pallet::error]
    pub enum Error<T> {
        AddressAlreadyLinked,
        AddressClaimedByOther,
        InvalidSignature,
        UnsupportedChain,
        LinkNotFound,
        MaxLinksReached,
        InvalidAddressLength,
    }

    // ================================================================
    // Calls
    // ================================================================

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        /// Link an EVM address by submitting an Ethereum personal-sign signature.
        /// Message signed: "Link to Awarizon: {encoded_account_bytes}"
        #[pallet::call_index(0)]
        #[pallet::weight(T::WeightInfo::link_evm_address())]
        pub fn link_evm_address(
            origin: OriginFor<T>,
            evm_address: [u8; 20],
            signature: [u8; 65],
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            let existing_count = LinkedAddresses::<T>::iter_prefix(&who).count();
            ensure!(
                existing_count < MAX_LINKED_ADDRESSES as usize,
                Error::<T>::MaxLinksReached
            );
            ensure!(
                !LinkedAddresses::<T>::contains_key(&who, ChainType::EVM),
                Error::<T>::AddressAlreadyLinked
            );

            // Build message: "Link to Awarizon: {raw encoded account bytes}"
            use codec::Encode;
            let ss58_address = who.encode();
            let mut message = b"Link to Awarizon: ".to_vec();
            message.extend_from_slice(&ss58_address);

            // Ethereum personal_sign prefix
            let prefix = Self::eth_prefix(message.len());
            let mut prefixed = prefix;
            prefixed.extend_from_slice(&message);

            let hash = sp_io::hashing::keccak_256(&prefixed);

            let recovered = sp_io::crypto::secp256k1_ecdsa_recover(&signature, &hash)
                .map_err(|_| Error::<T>::InvalidSignature)?;

            // keccak256(uncompressed_pubkey_64_bytes)[12..32] = EVM address
            let pubkey_hash = sp_io::hashing::keccak_256(&recovered);
            let recovered_address: [u8; 20] = pubkey_hash[12..32]
                .try_into()
                .map_err(|_| Error::<T>::InvalidSignature)?;

            ensure!(recovered_address == evm_address, Error::<T>::InvalidSignature);

            let address_display = Self::evm_to_display(&evm_address);

            let block = frame_system::Pallet::<T>::block_number();
            let linked = LinkedAddress {
                chain: ChainType::EVM,
                address: evm_address.to_vec().try_into().unwrap_or_default(),
                address_display: address_display.clone().try_into().unwrap_or_default(),
                status: LinkStatus::Verified,
                linked_at: block,
            };

            LinkedAddresses::<T>::insert(&who, ChainType::EVM, linked);
            TotalVerifiedLinks::<T>::mutate(|t| *t = t.saturating_add(1));

            Self::deposit_event(Event::AddressLinkVerified {
                account: who.clone(),
                chain: ChainType::EVM,
            });
            Self::deposit_event(Event::AddressLinkSubmitted {
                account: who,
                chain: ChainType::EVM,
                address_display,
            });
            Ok(())
        }

        /// Link a Solana address by submitting an ed25519 signature.
        /// Message signed: "Link to Awarizon: {raw encoded account bytes}"
        #[pallet::call_index(1)]
        #[pallet::weight(T::WeightInfo::link_solana_address())]
        pub fn link_solana_address(
            origin: OriginFor<T>,
            solana_pubkey: [u8; 32],
            signature: [u8; 64],
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            let existing_count = LinkedAddresses::<T>::iter_prefix(&who).count();
            ensure!(
                existing_count < MAX_LINKED_ADDRESSES as usize,
                Error::<T>::MaxLinksReached
            );
            ensure!(
                !LinkedAddresses::<T>::contains_key(&who, ChainType::Solana),
                Error::<T>::AddressAlreadyLinked
            );

            use codec::Encode;
            let ss58_address = who.encode();
            let mut message = b"Link to Awarizon: ".to_vec();
            message.extend_from_slice(&ss58_address);

            let verified = sp_io::crypto::ed25519_verify(
                &sp_core::ed25519::Signature::from_raw(signature),
                &message,
                &sp_core::ed25519::Public::from_raw(solana_pubkey),
            );
            ensure!(verified, Error::<T>::InvalidSignature);

            // Simplified Solana display: "Sol:" + first 8 bytes as hex
            let address_display = Self::solana_to_display(&solana_pubkey);

            let block = frame_system::Pallet::<T>::block_number();
            let linked = LinkedAddress {
                chain: ChainType::Solana,
                address: solana_pubkey.to_vec().try_into().unwrap_or_default(),
                address_display: address_display.clone().try_into().unwrap_or_default(),
                status: LinkStatus::Verified,
                linked_at: block,
            };

            LinkedAddresses::<T>::insert(&who, ChainType::Solana, linked);
            TotalVerifiedLinks::<T>::mutate(|t| *t = t.saturating_add(1));

            Self::deposit_event(Event::AddressLinkVerified {
                account: who,
                chain: ChainType::Solana,
            });
            Ok(())
        }

        /// Remove a previously linked address.
        #[pallet::call_index(2)]
        #[pallet::weight(T::WeightInfo::unlink_address())]
        pub fn unlink_address(origin: OriginFor<T>, chain: ChainType) -> DispatchResult {
            let who = ensure_signed(origin)?;

            ensure!(
                LinkedAddresses::<T>::contains_key(&who, &chain),
                Error::<T>::LinkNotFound
            );

            LinkedAddresses::<T>::remove(&who, &chain);
            TotalVerifiedLinks::<T>::mutate(|t| *t = t.saturating_sub(1));

            Self::deposit_event(Event::AddressUnlinked { account: who, chain });
            Ok(())
        }

        /// On-chain confirmation that a link exists (read is via RPC).
        #[pallet::call_index(3)]
        #[pallet::weight(T::WeightInfo::verify_link())]
        pub fn verify_link(
            origin: OriginFor<T>,
            account: T::AccountId,
            chain: ChainType,
        ) -> DispatchResult {
            ensure_signed(origin)?;
            ensure!(
                LinkedAddresses::<T>::contains_key(&account, &chain),
                Error::<T>::LinkNotFound
            );
            Ok(())
        }
    }

    // ================================================================
    // Helpers
    // ================================================================

    impl<T: Config> Pallet<T> {
        /// Build Ethereum personal_sign prefix bytes for a message of given length.
        pub fn eth_prefix(msg_len: usize) -> Vec<u8> {
            let mut out = b"\x19Ethereum Signed Message:\n".to_vec();
            // Encode the length as decimal ASCII
            let len_str = Self::usize_to_ascii(msg_len);
            out.extend_from_slice(&len_str);
            out
        }

        /// Convert a usize to its ASCII decimal representation.
        fn usize_to_ascii(mut n: usize) -> Vec<u8> {
            if n == 0 {
                return b"0".to_vec();
            }
            let mut digits = Vec::new();
            while n > 0 {
                digits.push(b'0' + (n % 10) as u8);
                n /= 10;
            }
            digits.reverse();
            digits
        }

        /// Format a 20-byte EVM address as "0x" + lowercase hex.
        pub fn evm_to_display(addr: &[u8; 20]) -> Vec<u8> {
            let mut out = b"0x".to_vec();
            for byte in addr {
                let hi = byte >> 4;
                let lo = byte & 0xf;
                out.push(if hi < 10 { b'0' + hi } else { b'a' + hi - 10 });
                out.push(if lo < 10 { b'0' + lo } else { b'a' + lo - 10 });
            }
            out
        }

        /// Format first 8 bytes of a Solana pubkey as "Sol:" + hex.
        pub fn solana_to_display(pubkey: &[u8; 32]) -> Vec<u8> {
            let mut out = b"Sol:".to_vec();
            for byte in &pubkey[..8] {
                let hi = byte >> 4;
                let lo = byte & 0xf;
                out.push(if hi < 10 { b'0' + hi } else { b'a' + hi - 10 });
                out.push(if lo < 10 { b'0' + lo } else { b'a' + lo - 10 });
            }
            out
        }
    }
}
