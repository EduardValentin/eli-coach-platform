import {
  ASSESSMENT_CALL_DURATION_MINUTES,
  visitorFullName,
  type PrototypeBooking,
} from '../services/assessmentCallService';
import type { JourneyStage } from '../domain/journey';

export type AssessmentCallStatus = 'all' | 'today' | 'upcoming' | 'past';

export type AssessmentCallTiming = 'upcoming' | 'past';

export type JourneyStep = 'any' | 'payment-link-sent' | 'paid' | 'invited';

export const JOURNEY_STEPS: readonly JourneyStep[] = [
  'any',
  'payment-link-sent',
  'paid',
  'invited',
];

export type SortKey = 'scheduled' | 'booked' | 'name' | 'email';

export type SortDirection = 'asc' | 'desc';

export type CallSort = { key: SortKey; direction: SortDirection };

export const SORT_KEYS: readonly SortKey[] = [
  'scheduled',
  'booked',
  'name',
  'email',
];

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

function hasStatus(call: ClassifiedCall, selection: ListingSelection): boolean {
  if (selection.status === 'all') return true;
  if (selection.status === 'today') return call.isToday;
  if (selection.status === 'upcoming') {
    return call.timing === 'upcoming' && !call.isToday;
  }
  return call.timing === 'past';
}

function isAtJourneyStep(call: ListedCall, step: JourneyStep): boolean {
  if (step === 'any') return true;
  return call.stage === step;
}

function matchesQuery(call: ClassifiedCall, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;

  return [visitorFullName(call.booking), call.booking.visitorEmail].some(
    (value) => value.toLowerCase().includes(needle),
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
    ...withTiming('upcoming').sort(
      (one, other) => startOf(one) - startOf(other),
    ),
    ...withTiming('past').sort((one, other) => startOf(other) - startOf(one)),
  ];
}

function bookedAtOf(call: ClassifiedCall): number {
  return call.booking.bookedAt.getTime();
}

function compareText(one: string, other: string): number {
  return one.localeCompare(other, undefined, { sensitivity: 'base' });
}

function orderCallsInDefaultDirection(
  calls: ListedCall[],
  key: SortKey,
): ListedCall[] {
  switch (key) {
    case 'scheduled':
      return orderCalls(calls);
    case 'booked':
      return [...calls].sort(
        (one, other) => bookedAtOf(other) - bookedAtOf(one),
      );
    case 'name':
      return [...calls].sort((one, other) =>
        compareText(
          visitorFullName(one.booking),
          visitorFullName(other.booking),
        ),
      );
    case 'email':
      return [...calls].sort((one, other) =>
        compareText(one.booking.visitorEmail, other.booking.visitorEmail),
      );
  }
}

export function orderCallsBy(
  calls: ListedCall[],
  sort: CallSort,
): ListedCall[] {
  const ordered = orderCallsInDefaultDirection(calls, sort.key);
  if (sort.direction === defaultDirectionFor(sort.key)) return ordered;
  return ordered.reverse();
}

export function defaultDirectionFor(key: SortKey): SortDirection {
  return key === 'scheduled' || key === 'booked' ? 'desc' : 'asc';
}

export function parseSortKey(raw: string | null): SortKey {
  return SORT_KEYS.find((key) => key === raw) ?? 'scheduled';
}

export function parseSortDirection(
  raw: string | null,
  key: SortKey,
): SortDirection {
  if (raw === 'asc' || raw === 'desc') return raw;
  return defaultDirectionFor(key);
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
  if (raw === 'upcoming' || raw === 'today' || raw === 'past') {
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

const STATUS_EMPTY_MESSAGES: Record<AssessmentCallStatus, string> = {
  upcoming: 'No upcoming calls.',
  today: 'No calls today.',
  past: 'No past calls.',
  all: 'No calls yet.',
};

const STATUS_PHRASES: Record<AssessmentCallStatus, string> = {
  upcoming: 'upcoming calls',
  today: 'calls today',
  past: 'past calls',
  all: 'calls',
};

const JOURNEY_STEP_LABELS: Record<JourneyStep, string> = {
  any: '',
  'payment-link-sent': 'Payment link sent',
  paid: 'Paid',
  invited: 'Invited',
};

export const NO_SEARCH_MATCH_MESSAGE = 'No calls match your search.';

export function hasActiveFilters(selection: ListingSelection): boolean {
  return (
    selection.status !== 'all' ||
    selection.journey !== 'any' ||
    selection.query.trim().length > 0
  );
}

export function emptyListingMessage(selection: ListingSelection): string {
  if (selection.query.trim().length > 0) return NO_SEARCH_MATCH_MESSAGE;

  if (selection.journey === 'any')
    return STATUS_EMPTY_MESSAGES[selection.status];

  return `No ${STATUS_PHRASES[selection.status]} match the ${JOURNEY_STEP_LABELS[selection.journey]} status.`;
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
  for (
    let around = page - PAGES_AROUND_CURRENT;
    around <= page + PAGES_AROUND_CURRENT;
    around += 1
  ) {
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
