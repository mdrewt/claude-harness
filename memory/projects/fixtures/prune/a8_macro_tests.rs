// synthetic: a #[test] fn inside a macro_rules! definition (unparsed) beside a real twin pair
macro_rules! case {
    ($n:ident) => {
        #[test]
        fn $n() {
            assert!(true);
        }
    };
}

case!(case_one);

#[test]
fn real_a() {
    assert_eq!(roll(5), 5);
}

#[test]
fn real_b() {
    assert_eq!(roll(5), 5);
}
