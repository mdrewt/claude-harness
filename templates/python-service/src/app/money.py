"""Money in integer minor units (cents). Never floats. See standards/domain/finance.md."""

from __future__ import annotations

from pydantic import BaseModel, field_validator


class Cents(BaseModel):
    value: int

    @field_validator("value")
    @classmethod
    def _must_be_int(cls, v: int) -> int:
        if not isinstance(v, int) or isinstance(v, bool):
            raise ValueError("Cents must be an integer (minor units)")
        return v


def total(items: list[Cents]) -> Cents:
    """Sum amounts; total equals the arithmetic sum (accounting invariant)."""
    return Cents(value=sum(c.value for c in items))


def fmt(c: Cents, currency: str = "USD") -> str:
    sign = "-" if c.value < 0 else ""
    v = abs(c.value)
    return f"{sign}{currency} {v // 100}.{v % 100:02d}"
