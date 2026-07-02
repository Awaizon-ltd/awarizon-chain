use super::pallet::*;
use crate::mock::*;
use frame_support::{assert_noop, assert_ok};
use pallet_awarizon_types::REPUTATION_BASE_IDENTITY;

// ---- register_identity --------------------------------------------------

#[test]
fn register_identity_works() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonIdentity::register_identity(
            RuntimeOrigin::signed(1),
            Some(b"harry".to_vec()),
            Some(b"Harry J".to_vec()),
            None,
            None,
            None,
        ));

        let record = IdentityRecords::<Test>::get(1).expect("record must exist");
        assert_eq!(record.riz_name.as_deref(), Some(b"harry".as_ref()));
        assert_eq!(record.reputation_score, REPUTATION_BASE_IDENTITY);
        assert!(!record.verified);

        let owner = RizNameRegistry::<Test>::get(
            frame_support::BoundedVec::<u8, frame_support::traits::ConstU32<32>>::try_from(
                b"harry".to_vec(),
            )
            .unwrap(),
        );
        assert_eq!(owner, Some(1u64));

        assert_eq!(TotalIdentities::<Test>::get(), 1);
    });
}

#[test]
fn register_identity_without_name_works() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonIdentity::register_identity(
            RuntimeOrigin::signed(2),
            None,
            None,
            None,
            None,
            None,
        ));
        let record = IdentityRecords::<Test>::get(2).expect("record must exist");
        assert!(record.riz_name.is_none());
    });
}

#[test]
fn duplicate_name_fails() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonIdentity::register_identity(
            RuntimeOrigin::signed(1),
            Some(b"alice".to_vec()),
            None, None, None, None,
        ));
        assert_noop!(
            AwarizonIdentity::register_identity(
                RuntimeOrigin::signed(2),
                Some(b"alice".to_vec()),
                None, None, None, None,
            ),
            Error::<Test>::NameAlreadyTaken
        );
    });
}

#[test]
fn identity_already_registered_fails() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonIdentity::register_identity(
            RuntimeOrigin::signed(1),
            None, None, None, None, None,
        ));
        assert_noop!(
            AwarizonIdentity::register_identity(
                RuntimeOrigin::signed(1),
                None, None, None, None, None,
            ),
            Error::<Test>::IdentityAlreadyRegistered
        );
    });
}

// ---- name validation ----------------------------------------------------

#[test]
fn invalid_name_rejected() {
    new_test_ext().execute_with(|| {
        // Too short (< 3 chars)
        assert_noop!(
            AwarizonIdentity::register_identity(
                RuntimeOrigin::signed(1),
                Some(b"ab".to_vec()),
                None, None, None, None,
            ),
            Error::<Test>::NameTooShort
        );

        // Invalid character
        assert_noop!(
            AwarizonIdentity::register_identity(
                RuntimeOrigin::signed(1),
                Some(b"alice!".to_vec()),
                None, None, None, None,
            ),
            Error::<Test>::NameInvalidCharacters
        );

        // Leading hyphen
        assert_noop!(
            AwarizonIdentity::register_identity(
                RuntimeOrigin::signed(1),
                Some(b"-alice".to_vec()),
                None, None, None, None,
            ),
            Error::<Test>::NameInvalidFormat
        );

        // Trailing hyphen
        assert_noop!(
            AwarizonIdentity::register_identity(
                RuntimeOrigin::signed(1),
                Some(b"alice-".to_vec()),
                None, None, None, None,
            ),
            Error::<Test>::NameInvalidFormat
        );

        // Uppercase
        assert_noop!(
            AwarizonIdentity::register_identity(
                RuntimeOrigin::signed(1),
                Some(b"Alice".to_vec()),
                None, None, None, None,
            ),
            Error::<Test>::NameInvalidCharacters
        );
    });
}

#[test]
fn valid_name_formats() {
    new_test_ext().execute_with(|| {
        // "alice" - valid
        assert_ok!(AwarizonIdentity::register_identity(
            RuntimeOrigin::signed(1),
            Some(b"alice".to_vec()),
            None, None, None, None,
        ));
        // "alice123" - valid
        assert_ok!(AwarizonIdentity::register_identity(
            RuntimeOrigin::signed(2),
            Some(b"alice123".to_vec()),
            None, None, None, None,
        ));
        // "alice-bob" - valid
        assert_ok!(AwarizonIdentity::register_identity(
            RuntimeOrigin::signed(3),
            Some(b"alice-bob".to_vec()),
            None, None, None, None,
        ));
        // "a1b" - minimum 3 chars
        assert_ok!(AwarizonIdentity::register_identity(
            RuntimeOrigin::signed(4),
            Some(b"a1b".to_vec()),
            None, None, None, None,
        ));
    });
}

// ---- update_identity ----------------------------------------------------

#[test]
fn update_identity_works() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonIdentity::register_identity(
            RuntimeOrigin::signed(1),
            None, None, None, None, None,
        ));
        assert_ok!(AwarizonIdentity::update_identity(
            RuntimeOrigin::signed(1),
            Some(b"Harry Jefferson".to_vec()),
            Some(b"Building Awarizon".to_vec()),
            None,
            None,
        ));
        let record = IdentityRecords::<Test>::get(1).unwrap();
        assert_eq!(record.display_name.as_deref(), Some(b"Harry Jefferson".as_ref()));
        assert_eq!(record.bio.as_deref(), Some(b"Building Awarizon".as_ref()));
    });
}

#[test]
fn update_identity_without_registration_fails() {
    new_test_ext().execute_with(|| {
        assert_noop!(
            AwarizonIdentity::update_identity(
                RuntimeOrigin::signed(99),
                Some(b"Name".to_vec()),
                None, None, None,
            ),
            Error::<Test>::IdentityNotFound
        );
    });
}

// ---- reputation ---------------------------------------------------------

#[test]
fn reputation_starts_at_base() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonIdentity::register_identity(
            RuntimeOrigin::signed(1),
            None, None, None, None, None,
        ));
        let record = IdentityRecords::<Test>::get(1).unwrap();
        assert_eq!(record.reputation_score, REPUTATION_BASE_IDENTITY);
    });
}

#[test]
fn recalculate_reputation_works() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonIdentity::register_identity(
            RuntimeOrigin::signed(1),
            None, None, None, None, None,
        ));
        assert_ok!(AwarizonIdentity::recalculate_reputation(
            RuntimeOrigin::signed(2),
            1u64,
        ));
        let record = IdentityRecords::<Test>::get(1).unwrap();
        assert_eq!(record.reputation_score, REPUTATION_BASE_IDENTITY);
    });
}

// ---- transfer_name ------------------------------------------------------

#[test]
fn transfer_name_works() {
    new_test_ext().execute_with(|| {
        // Account 1 registers "alice"
        assert_ok!(AwarizonIdentity::register_identity(
            RuntimeOrigin::signed(1),
            Some(b"alice".to_vec()),
            None, None, None, None,
        ));
        // Account 2 registers without a name
        assert_ok!(AwarizonIdentity::register_identity(
            RuntimeOrigin::signed(2),
            None, None, None, None, None,
        ));
        // Transfer "alice" from 1 to 2
        assert_ok!(AwarizonIdentity::transfer_name(RuntimeOrigin::signed(1), 2u64));

        let rec1 = IdentityRecords::<Test>::get(1).unwrap();
        let rec2 = IdentityRecords::<Test>::get(2).unwrap();
        assert!(rec1.riz_name.is_none());
        assert_eq!(rec2.riz_name.as_deref(), Some(b"alice".as_ref()));

        let bounded = frame_support::BoundedVec::<u8, frame_support::traits::ConstU32<32>>::try_from(
            b"alice".to_vec(),
        ).unwrap();
        assert_eq!(RizNameRegistry::<Test>::get(bounded), Some(2u64));
    });
}

#[test]
fn transfer_name_to_account_with_name_fails() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonIdentity::register_identity(
            RuntimeOrigin::signed(1),
            Some(b"alice".to_vec()),
            None, None, None, None,
        ));
        assert_ok!(AwarizonIdentity::register_identity(
            RuntimeOrigin::signed(2),
            Some(b"bob".to_vec()),
            None, None, None, None,
        ));
        assert_noop!(
            AwarizonIdentity::transfer_name(RuntimeOrigin::signed(1), 2u64),
            Error::<Test>::TransferTargetHasName
        );
    });
}

// ---- set_verified -------------------------------------------------------

#[test]
fn set_verified_sudo_works() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonIdentity::register_identity(
            RuntimeOrigin::signed(1),
            None, None, None, None, None,
        ));
        assert_ok!(AwarizonIdentity::set_verified(RuntimeOrigin::root(), 1u64, true));
        let record = IdentityRecords::<Test>::get(1).unwrap();
        assert!(record.verified);
    });
}

#[test]
fn set_verified_non_sudo_fails() {
    new_test_ext().execute_with(|| {
        assert_ok!(AwarizonIdentity::register_identity(
            RuntimeOrigin::signed(1),
            None, None, None, None, None,
        ));
        assert_noop!(
            AwarizonIdentity::set_verified(RuntimeOrigin::signed(2), 1u64, true),
            sp_runtime::DispatchError::BadOrigin
        );
    });
}
