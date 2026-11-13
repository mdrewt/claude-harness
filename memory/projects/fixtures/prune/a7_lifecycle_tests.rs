// synthetic: a plain twin pair; the battery places it at a path holding a protected token
#[test]
fn opens_once() {
    let t = open(1);
    assert_eq!(t.state, 1);
}

#[test]
fn opens_once_again() {
    let t = open(1);
    assert_eq!(t.state, 1);
}
