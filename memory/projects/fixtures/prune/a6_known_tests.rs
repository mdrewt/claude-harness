// synthetic: a twin pair reading line!(), and a plain pair
#[test]
fn known_a() {
    assert!(KNOWN.contains(&line!()));
}

#[test]
fn known_b() {
    assert!(KNOWN.contains(&line!()));
}

#[test]
fn table_a() {
    assert!(KNOWN.is_empty());
}

#[test]
fn table_b() {
    assert!(KNOWN.is_empty());
}
