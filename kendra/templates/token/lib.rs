#![cfg_attr(not(feature = "std"), no_std, no_main)]

/// A minimal ERC-20-style fungible token implemented in ink! 5.x.
/// Supports: mint (owner only), transfer, approve, transfer_from.
#[ink::contract]
mod token {
    use ink::storage::Mapping;

    #[ink(event)]
    pub struct Transfer {
        #[ink(topic)]
        from: Option<AccountId>,
        #[ink(topic)]
        to: Option<AccountId>,
        value: Balance,
    }

    #[ink(event)]
    pub struct Approval {
        #[ink(topic)]
        owner: AccountId,
        #[ink(topic)]
        spender: AccountId,
        value: Balance,
    }

    #[derive(Debug, PartialEq, Eq)]
    #[ink::scale_derive(Encode, Decode, TypeInfo)]
    pub enum Error {
        InsufficientBalance,
        InsufficientAllowance,
        NotOwner,
        ZeroAddress,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    #[ink(storage)]
    pub struct Token {
        total_supply: Balance,
        balances: Mapping<AccountId, Balance>,
        allowances: Mapping<(AccountId, AccountId), Balance>,
        owner: AccountId,
        name: ink::prelude::string::String,
        symbol: ink::prelude::string::String,
        decimals: u8,
    }

    impl Token {
        /// Create a new token with an initial supply minted to the caller.
        #[ink(constructor)]
        pub fn new(
            name: ink::prelude::string::String,
            symbol: ink::prelude::string::String,
            decimals: u8,
            initial_supply: Balance,
        ) -> Self {
            let caller = Self::env().caller();
            let mut balances = Mapping::default();
            balances.insert(caller, &initial_supply);

            Self::env().emit_event(Transfer {
                from: None,
                to: Some(caller),
                value: initial_supply,
            });

            Self {
                total_supply: initial_supply,
                balances,
                allowances: Mapping::default(),
                owner: caller,
                name,
                symbol,
                decimals,
            }
        }

        // ── Metadata ──────────────────────────────────────────────────

        #[ink(message)]
        pub fn name(&self) -> ink::prelude::string::String {
            self.name.clone()
        }

        #[ink(message)]
        pub fn symbol(&self) -> ink::prelude::string::String {
            self.symbol.clone()
        }

        #[ink(message)]
        pub fn decimals(&self) -> u8 {
            self.decimals
        }

        #[ink(message)]
        pub fn total_supply(&self) -> Balance {
            self.total_supply
        }

        // ── Balances & Allowances ─────────────────────────────────────

        #[ink(message)]
        pub fn balance_of(&self, owner: AccountId) -> Balance {
            self.balances.get(owner).unwrap_or_default()
        }

        #[ink(message)]
        pub fn allowance(&self, owner: AccountId, spender: AccountId) -> Balance {
            self.allowances.get((owner, spender)).unwrap_or_default()
        }

        // ── Transfers ─────────────────────────────────────────────────

        #[ink(message)]
        pub fn transfer(&mut self, to: AccountId, value: Balance) -> Result<()> {
            let from = self.env().caller();
            self.transfer_from_to(&from, &to, value)
        }

        #[ink(message)]
        pub fn transfer_from(
            &mut self,
            from: AccountId,
            to: AccountId,
            value: Balance,
        ) -> Result<()> {
            let caller = self.env().caller();
            let allowance = self.allowance(from, caller);
            if allowance < value {
                return Err(Error::InsufficientAllowance);
            }
            self.allowances.insert((from, caller), &(allowance - value));
            self.transfer_from_to(&from, &to, value)
        }

        #[ink(message)]
        pub fn approve(&mut self, spender: AccountId, value: Balance) -> Result<()> {
            let owner = self.env().caller();
            self.allowances.insert((owner, spender), &value);
            self.env().emit_event(Approval { owner, spender, value });
            Ok(())
        }

        // ── Mint (owner only) ─────────────────────────────────────────

        #[ink(message)]
        pub fn mint(&mut self, to: AccountId, value: Balance) -> Result<()> {
            if self.env().caller() != self.owner {
                return Err(Error::NotOwner);
            }
            let balance = self.balance_of(to);
            self.balances.insert(to, &(balance + value));
            self.total_supply += value;
            self.env().emit_event(Transfer {
                from: None,
                to: Some(to),
                value,
            });
            Ok(())
        }

        // ── Internal ──────────────────────────────────────────────────

        fn transfer_from_to(
            &mut self,
            from: &AccountId,
            to: &AccountId,
            value: Balance,
        ) -> Result<()> {
            let from_balance = self.balance_of(*from);
            if from_balance < value {
                return Err(Error::InsufficientBalance);
            }
            self.balances.insert(from, &(from_balance - value));
            let to_balance = self.balance_of(*to);
            self.balances.insert(to, &(to_balance + value));
            self.env().emit_event(Transfer {
                from: Some(*from),
                to: Some(*to),
                value,
            });
            Ok(())
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn new_works() {
            let token = Token::new(
                ink::prelude::string::String::from("MyToken"),
                ink::prelude::string::String::from("MTK"),
                18,
                1_000_000,
            );
            assert_eq!(token.total_supply(), 1_000_000);
            assert_eq!(token.name(), "MyToken");
            assert_eq!(token.symbol(), "MTK");
            assert_eq!(token.decimals(), 18);
        }

        #[ink::test]
        fn transfer_works() {
            let mut token = Token::new(
                ink::prelude::string::String::from("T"),
                ink::prelude::string::String::from("T"),
                0,
                100,
            );
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            assert!(token.transfer(accounts.bob, 10).is_ok());
            assert_eq!(token.balance_of(accounts.alice), 90);
            assert_eq!(token.balance_of(accounts.bob), 10);
        }

        #[ink::test]
        fn insufficient_balance_fails() {
            let mut token = Token::new(
                ink::prelude::string::String::from("T"),
                ink::prelude::string::String::from("T"),
                0,
                10,
            );
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            assert_eq!(
                token.transfer(accounts.bob, 11),
                Err(Error::InsufficientBalance)
            );
        }

        #[ink::test]
        fn approve_and_transfer_from_works() {
            let mut token = Token::new(
                ink::prelude::string::String::from("T"),
                ink::prelude::string::String::from("T"),
                0,
                100,
            );
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            assert!(token.approve(accounts.bob, 50).is_ok());
            assert_eq!(token.allowance(accounts.alice, accounts.bob), 50);

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            assert!(token.transfer_from(accounts.alice, accounts.charlie, 30).is_ok());
            assert_eq!(token.balance_of(accounts.alice), 70);
            assert_eq!(token.balance_of(accounts.charlie), 30);
            assert_eq!(token.allowance(accounts.alice, accounts.bob), 20);
        }
    }
}
