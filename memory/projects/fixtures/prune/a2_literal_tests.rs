// synthetic: bodies that differ in one string, numeric or character literal, in both orders, and one true pair
#[test]
fn spaced_a() {
    assert_eq!(pad("a b"), 5);
}

#[test]
fn spaced_b() {
    assert_eq!(pad("a  b"), 5);
}

#[test]
fn spaced_c() {
    assert_eq!(pad("c  d"), 6);
}

#[test]
fn spaced_d() {
    assert_eq!(pad("c d"), 6);
}

#[test]
fn scaled_a() {
    assert_eq!(scale(2), 4);
}

#[test]
fn scaled_b() {
    assert_eq!(scale(3), 4);
}

#[test]
fn scaled_c() {
    assert_eq!(scale(1.50), 3.0);
}

#[test]
fn scaled_d() {
    assert_eq!(scale(1.5), 3.0);
}

#[test]
fn char_a() {
    assert_eq!(first("ab"), 'a');
}

#[test]
fn char_b() {
    assert_eq!(first("ab"), 'b');
}

#[test]
fn same_a() {
    assert_eq!(pad("w"), 1);
}

#[test]
fn same_b() {
    assert_eq!(pad("w"), 1);
}
