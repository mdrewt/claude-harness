//! {{NAME}} — {{DESCRIPTION}}
//! Money in integer minor units (cents). Never floats. See standards/domain/finance.md.

/// Cents as a newtype to prevent primitive obsession.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Cents(pub i64);

impl Cents {
    /// Sum amounts; the total equals the arithmetic sum (accounting invariant).
    #[must_use]
    pub fn total(items: &[Cents]) -> Cents {
        Cents(items.iter().map(|c| c.0).sum())
    }

    #[must_use]
    pub fn format(self, currency: &str) -> String {
        let sign = if self.0 < 0 { "-" } else { "" };
        let v = self.0.abs();
        format!("{sign}{currency} {}.{:02}", v / 100, v % 100)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    #[test]
    fn totals_exactly() {
        assert_eq!(Cents::total(&[Cents(99), Cents(1), Cents(100)]), Cents(200));
    }

    #[test]
    fn formats_two_decimals() {
        assert_eq!(Cents(2005).format("USD"), "USD 20.05");
        assert_eq!(Cents(-5).format("USD"), "-USD 0.05");
    }

    proptest! {
        #[test]
        fn total_never_loses_money(xs in proptest::collection::vec(-1000i64..1000, 0..20)) {
            let cents: Vec<Cents> = xs.iter().map(|&n| Cents(n)).collect();
            prop_assert_eq!(Cents::total(&cents).0, xs.iter().sum::<i64>());
        }
    }
}
