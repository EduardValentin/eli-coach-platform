import { format } from 'date-fns';
import { TZDate } from '@date-fns/tz';

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatShortDay(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone,
  }).format(instant);
}

export function formatCheckinDate(isoDate: string): string {
  return formatShortDay(new Date(isoDate + 'T00:00:00'), browserTimeZone());
}

export function formatCheckinTime(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function checkinInstant(isoDate: string, time24: string): Date {
  return new Date(`${isoDate}T${time24}:00`);
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

function formatZoneOffset(timeZone: string, reference: Date): string | undefined {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    timeZoneName: 'shortOffset',
  })
    .formatToParts(reference)
    .find((part) => part.type === 'timeZoneName')?.value;
}

export function describeTimeZone(timeZone: string, reference: Date): string {
  const offset = formatZoneOffset(timeZone, reference);
  return offset ? `${timeZone} (${offset})` : timeZone;
}

export function nameTimeZone(timeZone: string, reference: Date): string {
  const offset = formatZoneOffset(timeZone, reference);
  return offset ? `${timeZone}, ${offset}` : timeZone;
}

export function formatZonedDate(
  instant: Date,
  timeZone: string,
  pattern: string,
): string {
  return format(new TZDate(instant, timeZone), pattern);
}

export function formatSlotTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  }).format(instant);
}

// Joined from parts because Node and Chromium disagree on the comma after the
// weekday in en-GB; every runtime must word the day the same way.
export function formatDayFirstDate(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';

  return `${part('weekday')}, ${part('day')} ${part('month')} ${part('year')}`;
}

export function formatCallSchedule(instant: Date, timeZone: string): string {
  return `${formatDayFirstDate(instant, timeZone)} at ${formatSlotTime(instant, timeZone)}`;
}

export function formatCallMoment(instant: Date, timeZone: string): string {
  return `${formatCallSchedule(instant, timeZone)} — ${describeTimeZone(timeZone, instant)}`;
}
