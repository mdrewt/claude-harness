import pytest
from hypothesis import given, strategies as st
from app.money import Cents, total, fmt


def test_rejects_non_integer():
    with pytest.raises(Exception):
        Cents(value=1.5)  # type: ignore[arg-type]


def test_totals_exactly():
    assert total([Cents(value=99), Cents(value=1), Cents(value=100)]).value == 200


def test_formats_two_decimals():
    assert fmt(Cents(value=2005)) == "USD 20.05"
    assert fmt(Cents(value=-5)) == "-USD 0.05"


@given(st.lists(st.integers(min_value=-1000, max_value=1000), max_size=20))
def test_total_never_loses_money(xs):
    assert total([Cents(value=n) for n in xs]).value == sum(xs)
