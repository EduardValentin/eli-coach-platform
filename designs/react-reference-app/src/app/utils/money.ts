const WHOLE_EURO = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const EURO_AND_CENTS = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});

export function formatEuroCents(cents: number): string {
  const format = cents % 100 === 0 ? WHOLE_EURO : EURO_AND_CENTS;

  return format.format(cents / 100);
}
