// synthetic: twin tests inside proptest! (unparsed) and a lexed twin pair in the same file
use proptest::prelude::*;

proptest! {
    #[test]
    fn roll_in_range(n in any::<u8>()) {
        prop_assert_eq!(roll(n), n);
    }

    #[test]
    fn roll_in_range_again(n in any::<u8>()) {
        prop_assert_eq!(roll(n), n);
    }
}

#[test]
fn fixed_roll() {
    assert_eq!(roll(3), 3);
}

#[test]
fn fixed_roll_again() {
    assert_eq!(roll(3), 3);
}
