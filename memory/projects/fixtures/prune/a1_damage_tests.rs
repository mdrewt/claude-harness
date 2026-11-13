// synthetic: twins at file level and in a nested mod (comments, spacing and a doc comment differ), a copy in a sibling mod
use super::*;

#[test]
fn top_a() {
    let x = add(1, 2);
    assert_eq!(x, 3);
}

#[test]
fn top_b() {
    // a comment the twin rule ignores
    let x   =   add( 1,2 );
    assert_eq!(x, 3);
}

mod outer {
    use super::*;

    mod inner_a {
        use super::*;

        #[test]
        fn first() {
            let v = vec![1, 2, 3];
            assert_eq!(v.len(), 3);
        }

        #[test]
        fn other() {
            let v = vec![1, 2];
            assert_eq!(v.len(), 2);
        }

        /// The same check, written again.
        #[test]
        fn second() {
            let v = vec![1, 2, 3]; // trailing comment
            assert_eq!(v.len(),
                       3);
        }
    }

    mod inner_b {
        use super::*;

        #[test]
        fn first() {
            let v = vec![1, 2, 3];
            assert_eq!(v.len(), 3);
        }
    }
}
