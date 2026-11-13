// synthetic: one body under different attribute lists, and one pair with the same list
#[test]
fn plain() {
    assert_eq!(roll(4), 4);
}

#[test]
#[ignore]
fn ignored_a() {
    assert_eq!(roll(4), 4);
}

#[test]
#[should_panic(expected = "x")]
fn panics_x() {
    assert_eq!(roll(4), 4);
}

#[test]
#[should_panic(expected = "y")]
fn panics_y() {
    assert_eq!(roll(4), 4);
}

#[test]
#[ignore]
fn ignored_b() {
    assert_eq!(roll(4), 4);
}
