const effectiveDateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeZone: "UTC",
});

export function formatEffectiveDate(isoDate: string): string {
  return effectiveDateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}
