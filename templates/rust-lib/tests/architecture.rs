//! Eval: architecture invariant — the library must not depend on std::net/fs/io
//! (a pure computation library). Greps the source as a cheap, fast gate.
use std::fs;
#[test]
fn no_io_dependencies() {
    let src = fs::read_to_string("src/lib.rs").unwrap();
    for forbidden in ["std::net", "std::fs", "std::io", "reqwest", "tokio::net"] {
        assert!(
            !src.contains(forbidden),
            "domain leaked IO dependency: {forbidden}"
        );
    }
}
