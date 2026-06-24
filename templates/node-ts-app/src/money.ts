// Money in integer minor units (cents). Never floats. See standards/domain/finance.md.
export type Cents = number & { readonly __brand: 'Cents' };

export function cents(n: number): Cents {
  if (!Number.isInteger(n)) throw new RangeError('Cents must be an integer (minor units)');
  return n as Cents;
}

/** Sum a list of amounts; total must equal the arithmetic sum (accounting invariant). */
export function total(amounts: readonly Cents[]): Cents {
  return cents(amounts.reduce((a, b) => a + b, 0));
}

export function format(c: Cents, currency = 'USD'): string {
  const sign = c < 0 ? '-' : '';
  const v = Math.abs(c);
  return `${sign}${currency} ${Math.floor(v / 100)}.${String(v % 100).padStart(2, '0')}`;
}
