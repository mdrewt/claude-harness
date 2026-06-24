// Pure presentation logic — unit-testable without the DOM.
export function formatCents(cents: number, currency = 'USD'): string {
  if (!Number.isInteger(cents)) throw new RangeError('cents must be an integer');
  const sign = cents < 0 ? '-' : '';
  const v = Math.abs(cents);
  return `${sign}${currency} ${Math.floor(v / 100)}.${String(v % 100).padStart(2, '0')}`;
}
