// synthetic: bodies that differ only inside a raw string, a char literal, after a nested block comment, or on a lifetime line; one true pair
#[test]
fn raw_b() {
    assert_eq!(parse(r#"a "//" b"#), 1);
}

#[test]
fn raw_c() {
    assert_eq!(parse(r#"a "//" c"#), 1);
}

#[test]
fn char_quote() {
    assert_eq!(first(s), '"');
}

#[test]
fn char_apostrophe() {
    assert_eq!(first(s), '\'');
}

#[test]
fn nested_one() {
    /* outer /* inner */ still comment */
    assert_eq!(f(1), 1);
}

#[test]
fn nested_two() {
    /* outer /* inner */ still comment */
    assert_eq!(f(2), 1);
}

#[test]
fn static_a() {
    let x: &'static str = "a";
    assert_eq!(x.len(), 1);
}

#[test]
fn static_b() {
    let x: &'static str = "b";
    assert_eq!(x.len(), 1);
}

#[test]
fn control() {
    /* outer /* inner */ one */
    assert_eq!(f(3), 3);
}

#[test]
fn control_again() {
    /* outer /* inner */ two */
    assert_eq!(f(3), 3);
}
