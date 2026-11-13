// synthetic: twin pairs whose bodies read the test's own name, one pair per marker, and a pair naming them only in a comment
#[test]
fn named() {
    let n = function_name!();
    assert!(n.ends_with("named"));
}

#[test]
fn named_copy() {
    let n = function_name!();
    assert!(n.ends_with("named"));
}

#[test]
fn snapshotted() {
    insta::assert_debug_snapshot!(draw(1));
}

#[test]
fn snapshotted_copy() {
    insta::assert_debug_snapshot!(draw(1));
}

#[test]
fn mention() {
    // insta:: and function_name! appear only in this comment
    assert_eq!(draw(2), 2);
}

#[test]
fn mention_copy() {
    // insta:: and function_name! appear only in this comment
    assert_eq!(draw(2), 2);
}
