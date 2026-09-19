import {
  ASSESSMENT_CALL_DURATION_MINUTES,
  type PrototypeBooking,
} from '../services/assessmentCallService';

export type AssessmentCallStatus = 'upcoming' | 'today' | 'past' | 'all';

export type AssessmentCallTiming = 'upcoming' | 'past';

export type ClassifiedCall = {
  booking: PrototypeBooking;
  timing: AssessmentCallTiming;
  isToday: boolean;
};

export type ListingMoment = {
  now: Date;
  timeZone: string;
};

export type ListingSelection = {
  status: AssessmentCallStatus;
  query: string;
};

const MINUTE_MS = 60 * 1000;

function calendarDayOf(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${read('year')}-${read('month')}-${read('day')}`;
}

function endOf(booking: PrototypeBooking): Date {
  return new Date(
    booking.startsAt.getTime() + ASSESSMENT_CALL_DURATION_MINUTES * MINUTE_MS,
  );
}

export function classifyCalls(
  bookings: PrototypeBooking[],
  moment: ListingMoment,
): ClassifiedCall[] {
  const today = calendarDayOf(moment.now, moment.timeZone);

  return bookings.map((booking) => ({
    booking,
    timing:
      endOf(booking).getTime() <= moment.now.getTime() ? 'past' : 'upcoming',
    isToday: calendarDayOf(booking.startsAt, moment.timeZone) === today,
  }));
}

function hasStatus(call: ClassifiedCall, status: AssessmentCallStatus): boolean {
  if (status === 'all') return true;
  if (status === 'today') return call.isToday;
  return call.timing === status;
}

function matchesQuery(call: ClassifiedCall, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;

  const { visitorName, visitorEmail } = call.booking;
  return (
    visitorName.toLowerCase().includes(needle) ||
    visitorEmail.toLowerCase().includes(needle)
  );
}

export function filterCalls(
  calls: ClassifiedCall[],
  selection: ListingSelection,
): ClassifiedCall[] {
  return calls.filter(
    (call) =>
      hasStatus(call, selection.status) && matchesQuery(call, selection.query),
  );
}

export function orderCalls(calls: ClassifiedCall[]): ClassifiedCall[] {
  const startOf = (call: ClassifiedCall) => call.booking.startsAt.getTime();
  const withTiming = (timing: AssessmentCallTiming) =>
    calls.filter((call) => call.timing === timing);

  return [
    ...withTiming('upcoming').sort((one, other) => startOf(one) - startOf(other)),
    ...withTiming('past').sort((one, other) => startOf(other) - startOf(one)),
  ];
}

export function upcomingCalls(
  calls: ClassifiedCall[],
  limit: number,
): ClassifiedCall[] {
  return orderCalls(calls)
    .filter((call) => call.timing === 'upcoming')
    .slice(0, limit);
}

export function countTodayCalls(calls: ClassifiedCall[]): number {
  return calls.filter((call) => call.isToday).length;
}

export function parseStatus(raw: string | null): AssessmentCallStatus {
  if (raw === 'today' || raw === 'past' || raw === 'all') return raw;
  return 'upcoming';
}
