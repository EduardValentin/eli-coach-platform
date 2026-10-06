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

export const CENTS_PER_EURO = 100;

export function toCents(euros: number): number {
  return Math.round(euros * CENTS_PER_EURO);
}

export function formatEuroCents(cents: number): string {
  const format = cents % CENTS_PER_EURO === 0 ? WHOLE_EURO : EURO_AND_CENTS;

  return format.format(cents / CENTS_PER_EURO);
}
