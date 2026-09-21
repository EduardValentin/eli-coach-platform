import { format, isValid, parseISO } from 'date-fns';
import {
  ASSESSMENT_CALL_DURATION_MINUTES,
  type PrototypeBooking,
} from '../services/assessmentCallService';
import type { JourneyStage } from '../domain/journey';

export type AssessmentCallStatus =
  | 'upcoming'
  | 'today'
  | 'past'
  | 'all'
  | 'custom';

export type AssessmentCallTiming = 'upcoming' | 'past';

export type JourneyStep = 'any' | 'payment-link-sent' | 'paid' | 'invited';

export const JOURNEY_STEPS: readonly JourneyStep[] = [
  'any',
  'payment-link-sent',
  'paid',
  'invited',
];

export type DateRange = { from: string | null; to: string | null };

export type ChosenDateRange = { from: string; to: string };

export const NO_DATE_RANGE: DateRange = { from: null, to: null };

export type ClassifiedCall = {
  booking: PrototypeBooking;
  timing: AssessmentCallTiming;
  isToday: boolean;
  day: string;
};

export type ListedCall = ClassifiedCall & { stage: JourneyStage | null };

export type ListingMoment = {
  now: Date;
  timeZone: string;
};

export type ListingSelection = {
  status: AssessmentCallStatus;
  query: string;
  journey: JourneyStep;
  range: DateRange;
};

const MINUTE_MS = 60 * 1000;

const ISO_DATE = 'yyyy-MM-dd';

const ISO_DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

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

  return bookings.map((booking) => {
    const day = calendarDayOf(booking.startsAt, moment.timeZone);

    return {
      booking,
      timing:
        endOf(booking).getTime() <= moment.now.getTime() ? 'past' : 'upcoming',
      isToday: day === today,
      day,
    };
  });
}

export function withJourneyStages(
  calls: ClassifiedCall[],
  stageOf: (callId: string) => JourneyStage | null,
): ListedCall[] {
  return calls.map((call) => ({ ...call, stage: stageOf(call.booking.id) }));
}

export function isChosenRange(range: DateRange): range is ChosenDateRange {
  return range.from !== null && range.to !== null;
}

function withinRange(call: ClassifiedCall, range: DateRange): boolean {
  if (!isChosenRange(range)) return true;
  return call.day >= range.from && call.day <= range.to;
}

function hasStatus(call: ClassifiedCall, selection: ListingSelection): boolean {
  if (selection.status === 'all') return true;
  if (selection.status === 'custom') return withinRange(call, selection.range);
  if (selection.status === 'today') return call.isToday;
  return call.timing === selection.status;
}

function isAtJourneyStep(call: ListedCall, step: JourneyStep): boolean {
  if (step === 'any') return true;
  return call.stage === step;
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
  calls: ListedCall[],
  selection: ListingSelection,
): ListedCall[] {
  return calls.filter(
    (call) =>
      hasStatus(call, selection) &&
      isAtJourneyStep(call, selection.journey) &&
      matchesQuery(call, selection.query),
  );
}

export function countsByJourneyStep(
  calls: ListedCall[],
  selection: ListingSelection,
): Record<JourneyStep, number> {
  const counts = {} as Record<JourneyStep, number>;

  for (const step of JOURNEY_STEPS) {
    counts[step] = filterCalls(calls, { ...selection, journey: step }).length;
  }

  return counts;
}

function startOf(call: ClassifiedCall): number {
  return call.booking.startsAt.getTime();
}

export function orderCalls<Call extends ClassifiedCall>(calls: Call[]): Call[] {
  const withTiming = (timing: AssessmentCallTiming) =>
    calls.filter((call) => call.timing === timing);

  return [
    ...withTiming('upcoming').sort((one, other) => startOf(one) - startOf(other)),
    ...withTiming('past').sort((one, other) => startOf(other) - startOf(one)),
  ];
}

export function orderCallsFor(
  calls: ListedCall[],
  status: AssessmentCallStatus,
): ListedCall[] {
  if (status === 'custom') {
    return [...calls].sort((one, other) => startOf(one) - startOf(other));
  }

  return orderCalls(calls);
}

export function upcomingCalls(
  calls: ClassifiedCall[],
  limit: number,
): ClassifiedCall[] {
  return orderCalls(calls)
    .filter((call) => call.timing === 'upcoming')
    .slice(0, limit);
}

export function countCallsLeftToday(calls: ClassifiedCall[]): number {
  return calls.filter((call) => call.isToday && call.timing === 'upcoming')
    .length;
}

export function parseStatus(raw: string | null): AssessmentCallStatus {
  if (
    raw === 'upcoming' ||
    raw === 'today' ||
    raw === 'past' ||
    raw === 'custom'
  ) {
    return raw;
  }
  return 'all';
}

export function parseJourneyStep(raw: string | null): JourneyStep {
  if (raw === 'payment-link-sent' || raw === 'paid' || raw === 'invited') {
    return raw;
  }
  return 'any';
}

function parseIsoDay(raw: string | null): string | null {
  if (raw === null || !ISO_DATE_SHAPE.test(raw)) return null;
  const parsed = parseISO(raw);
  if (!isValid(parsed) || format(parsed, ISO_DATE) !== raw) return null;
  return raw;
}

export function parseDateRange(
  rawFrom: string | null,
  rawTo: string | null,
): DateRange {
  const from = parseIsoDay(rawFrom);
  const to = parseIsoDay(rawTo);

  if (from !== null && to !== null && from > to) return { from: to, to: from };

  return { from, to };
}

const STATUS_EMPTY_MESSAGES: Record<AssessmentCallStatus, string> = {
  upcoming: 'No upcoming calls.',
  today: 'No calls today.',
  past: 'No past calls.',
  all: 'No calls yet.',
  custom: 'No calls yet.',
};

const STATUS_PHRASES: Record<AssessmentCallStatus, string> = {
  upcoming: 'upcoming calls',
  today: 'calls today',
  past: 'past calls',
  all: 'calls',
  custom: 'calls',
};

const JOURNEY_STEP_PHRASES: Record<JourneyStep, string> = {
  any: '',
  'payment-link-sent': ' with a payment link sent',
  paid: ' with a payment recorded',
  invited: ' with an invitation sent',
};

export const NO_SEARCH_MATCH_MESSAGE = 'No calls match your search.';

export function describeDateRange(range: ChosenDateRange): string {
  const from = parseISO(range.from);
  const to = parseISO(range.to);

  if (from.getFullYear() !== to.getFullYear()) {
    return `${format(from, 'd MMMM yyyy')} and ${format(to, 'd MMMM yyyy')}`;
  }

  if (from.getMonth() !== to.getMonth()) {
    return `${format(from, 'd MMMM')} and ${format(to, 'd MMMM')}`;
  }

  return `${format(from, 'd')} and ${format(to, 'd MMMM')}`;
}

export function emptyListingMessage(selection: ListingSelection): string {
  if (selection.query.trim().length > 0) return NO_SEARCH_MATCH_MESSAGE;

  const journeyPhrase = JOURNEY_STEP_PHRASES[selection.journey];
  const rangePhrase =
    selection.status === 'custom' && isChosenRange(selection.range)
      ? ` between ${describeDateRange(selection.range)}`
      : '';

  if (journeyPhrase.length === 0 && rangePhrase.length === 0) {
    return STATUS_EMPTY_MESSAGES[selection.status];
  }

  return `No ${STATUS_PHRASES[selection.status]}${journeyPhrase}${rangePhrase}.`;
}

export type CallPageView = {
  calls: ClassifiedCall[];
  page: number;
  pageCount: number;
  firstShown: number;
  lastShown: number;
  total: number;
};

export type PaginationStep = number | 'gap';

const PAGES_AROUND_CURRENT = 1;

const PAGES_SHOWN_WITHOUT_GAPS = 7;

export function parsePage(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return parsed;
}

export function pageOfCalls(
  calls: ClassifiedCall[],
  paging: { page: number; perPage: number },
): CallPageView {
  const total = calls.length;
  const pageCount = Math.max(1, Math.ceil(total / paging.perPage));
  const page = Math.min(paging.page, pageCount);
  const start = (page - 1) * paging.perPage;
  const shown = calls.slice(start, start + paging.perPage);

  return {
    calls: shown,
    page,
    pageCount,
    firstShown: total === 0 ? 0 : start + 1,
    lastShown: start + shown.length,
    total,
  };
}

export function paginationSteps(
  page: number,
  pageCount: number,
): PaginationStep[] {
  if (pageCount <= PAGES_SHOWN_WITHOUT_GAPS) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const shown = new Set([1, pageCount]);
  for (let around = page - PAGES_AROUND_CURRENT; around <= page + PAGES_AROUND_CURRENT; around += 1) {
    if (around >= 1 && around <= pageCount) shown.add(around);
  }

  const steps: PaginationStep[] = [];
  let previous = 0;
  for (const number of [...shown].sort((one, other) => one - other)) {
    if (previous && number - previous > 1) steps.push('gap');
    steps.push(number);
    previous = number;
  }

  return steps;
}
