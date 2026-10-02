const EURO = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
});

export function formatEuroCents(cents: number): string {
  return EURO.format(cents / 100);
}
