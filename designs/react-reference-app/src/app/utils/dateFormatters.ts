export function formatCheckinDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatCheckinTime(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function isUpcoming(isoDate: string): boolean {
  return new Date(isoDate) >= new Date(new Date().toDateString());
}

export function toISODate(date: Date): string {
  // Use local date components — toISOString() converts to UTC, which shifts the
  // calendar day for users east of UTC (e.g. a Sat-night selection became Fri).
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function to24h(label: string): string {
  const [time, period] = label.split(' ');
  let [h] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:00`;
}
