import type { CoachAssessmentCall } from "~/features/assessment-calls/contracts/assessment-calls";
import { dayKeyOf } from "~/features/assessment-calls/ui/shared/day-key";

export const STATUS_PARAM = "status";
export const QUERY_PARAM = "q";
export const PAGE_PARAM = "page";
export const SORT_PARAM = "sort";
export const DIRECTION_PARAM = "dir";
export const FROM_PARAM = "from";
export const TO_PARAM = "to";
export const PAGE_SIZE = 10;

const LISTING_PARAMS = [
  STATUS_PARAM,
  QUERY_PARAM,
  PAGE_PARAM,
  SORT_PARAM,
  DIRECTION_PARAM,
  FROM_PARAM,
  TO_PARAM,
];

export const FIRST_PAGE = 1;
const PAGES_AROUND_CURRENT = 1;
const PAGES_SHOWN_WITHOUT_GAPS = 7;

export type CoachCallStatus = "upcoming" | "today" | "past" | "all" | "custom";

export const DEFAULT_CALL_STATUS: CoachCallStatus = "all";

type CoachCallTiming = "upcoming" | "past";

export type SortKey = "scheduled" | "booked" | "name" | "email";

export type SortDirection = "asc" | "desc";

export type CallSort = { direction: SortDirection; key: SortKey };

export const SORT_KEYS: readonly SortKey[] = [
  "scheduled",
  "booked",
  "name",
  "email",
];

export const DEFAULT_SORT_KEY: SortKey = "scheduled";

export type DateRange = { from: string | null; to: string | null };

type ChosenDateRange = { from: string; to: string };

export type ClassifiedCall = CoachAssessmentCall & {
  day: string;
  isToday: boolean;
  timing: CoachCallTiming;
};

export type ListingMoment = {
  now: Date;
  timeZone: string;
};

export type ListingSelection = {
  query: string;
  range: DateRange;
  status: CoachCallStatus;
};

export type CallPageView = {
  calls: ClassifiedCall[];
  firstShown: number;
  lastShown: number;
  page: number;
  pageCount: number;
  total: number;
};

export type PaginationStep = number | "gap";

export function classifyCalls(
  calls: readonly CoachAssessmentCall[],
  moment: ListingMoment,
): ClassifiedCall[] {
  const today = dayKeyOf(moment.now, moment.timeZone);

  return calls.map((call) => {
    const day = dayKeyOf(new Date(call.startsAt), moment.timeZone);

    return {
      ...call,
      day,
      isToday: day === today,
      timing:
        new Date(call.endsAt).getTime() <= moment.now.getTime()
          ? "past"
          : "upcoming",
    };
  });
}

export function filterCalls(
  calls: readonly ClassifiedCall[],
  selection: ListingSelection,
): ClassifiedCall[] {
  return calls.filter(
    (call) => hasStatus(call, selection) && matchesQuery(call, selection.query),
  );
}

export function orderCalls(calls: readonly ClassifiedCall[]): ClassifiedCall[] {
  const withTiming = (timing: CoachCallTiming) =>
    calls.filter((call) => call.timing === timing);

  return [
    ...withTiming("upcoming").sort(
      (one, other) => startOf(one) - startOf(other),
    ),
    ...withTiming("past").sort((one, other) => startOf(other) - startOf(one)),
  ];
}

export function orderCallsBy(
  calls: readonly ClassifiedCall[],
  sort: CallSort,
  status: CoachCallStatus,
): ClassifiedCall[] {
  const ordered = orderCallsInDefaultDirection(calls, sort.key, status);

  return sort.direction === defaultDirectionFor(sort.key)
    ? ordered
    : ordered.reverse();
}

export function defaultDirectionFor(key: SortKey): SortDirection {
  return key === "scheduled" || key === "booked" ? "desc" : "asc";
}

export function upcomingCalls(
  calls: readonly ClassifiedCall[],
  limit: number,
): ClassifiedCall[] {
  return orderCalls(calls)
    .filter((call) => call.timing === "upcoming")
    .slice(0, limit);
}

export function countCallsLeftToday(calls: readonly ClassifiedCall[]): number {
  return calls.filter((call) => call.isToday && call.timing === "upcoming")
    .length;
}

export function toCallStatus(raw: string | null): CoachCallStatus {
  if (
    raw === "upcoming" ||
    raw === "today" ||
    raw === "past" ||
    raw === "custom"
  ) {
    return raw;
  }

  return DEFAULT_CALL_STATUS;
}

export function toSortKey(raw: string | null): SortKey {
  return SORT_KEYS.find((key) => key === raw) ?? DEFAULT_SORT_KEY;
}

export function parseSortDirectionParam(
  raw: string | null,
  key: SortKey,
): SortDirection {
  if (raw === "asc" || raw === "desc") {
    return raw;
  }

  return defaultDirectionFor(key);
}

export function parseDateRangeParams(
  rawFrom: string | null,
  rawTo: string | null,
): DateRange {
  const from = parseIsoDay(rawFrom);
  const to = parseIsoDay(rawTo);

  if (from !== null && to !== null && from > to) {
    return { from: to, to: from };
  }

  return { from, to };
}

export function parsePageParam(raw: string | null): number {
  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < FIRST_PAGE) {
    return FIRST_PAGE;
  }

  return parsed;
}

export function pageOfCalls(
  calls: readonly ClassifiedCall[],
  paging: { page: number; size: number },
): CallPageView {
  const total = calls.length;
  const pageCount = Math.max(FIRST_PAGE, Math.ceil(total / paging.size));
  const page = Math.min(paging.page, pageCount);
  const start = (page - 1) * paging.size;
  const shown = calls.slice(start, start + paging.size);

  return {
    calls: shown,
    firstShown: total === 0 ? 0 : start + 1,
    lastShown: start + shown.length,
    page,
    pageCount,
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

  const shown = new Set([FIRST_PAGE, pageCount]);

  for (
    let around = page - PAGES_AROUND_CURRENT;
    around <= page + PAGES_AROUND_CURRENT;
    around += 1
  ) {
    if (around < FIRST_PAGE || around > pageCount) {
      continue;
    }

    shown.add(around);
  }

  return withGaps([...shown].sort((one, other) => one - other));
}

export function haveOnlyListingParamsChanged(
  currentUrl: URL,
  nextUrl: URL,
): boolean {
  if (currentUrl.href === nextUrl.href) {
    return false;
  }

  return (
    currentUrl.pathname === nextUrl.pathname &&
    withoutListingParams(currentUrl) === withoutListingParams(nextUrl)
  );
}

export type EmptyListingCopy = { description: string; title: string };

const NO_CALLS_YET_COPY: EmptyListingCopy = {
  description: "Booked assessment calls appear here.",
  title: "No calls yet",
};

const NO_CALLS_FOUND_TITLE = "No calls found";

const NO_SEARCH_MATCH_MESSAGE = "No calls match your search.";

const STATUS_EMPTY_MESSAGES: Record<Exclude<CoachCallStatus, "all">, string> = {
  custom: "No calls yet.",
  past: "No past calls.",
  today: "No calls today.",
  upcoming: "No upcoming calls.",
};

export function emptyListingCopy(
  selection: ListingSelection,
): EmptyListingCopy {
  if (hasSearchQuery(selection)) {
    return {
      description: NO_SEARCH_MATCH_MESSAGE,
      title: NO_CALLS_FOUND_TITLE,
    };
  }

  if (selection.status === "all") {
    return NO_CALLS_YET_COPY;
  }

  if (selection.status === "custom" && isChosenRange(selection.range)) {
    return {
      description: `No calls between ${describeDateRange(selection.range)}.`,
      title: NO_CALLS_FOUND_TITLE,
    };
  }

  return {
    description: STATUS_EMPTY_MESSAGES[selection.status],
    title: NO_CALLS_FOUND_TITLE,
  };
}

export function hasSearchQuery(selection: ListingSelection): boolean {
  return selection.query.trim().length > 0;
}

export function hasClearableFilters(selection: ListingSelection): boolean {
  return hasSearchQuery(selection) || hasPickedRange(selection);
}

function hasPickedRange(selection: ListingSelection): boolean {
  return (
    selection.status === "custom" &&
    (selection.range.from !== null || selection.range.to !== null)
  );
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDay(raw: string | null): string | null {
  const match = raw === null ? null : ISO_DAY.exec(raw);

  if (match === null) {
    return null;
  }

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const roundTrips =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return roundTrips ? raw : null;
}

function isChosenRange(range: DateRange): range is ChosenDateRange {
  return range.from !== null && range.to !== null;
}

function describeDateRange(range: ChosenDateRange): string {
  const from = noonUtcOf(range.from);
  const to = noonUtcOf(range.to);

  if (from.getUTCFullYear() !== to.getUTCFullYear()) {
    return `${formatDay(from, "dayMonthYear")} and ${formatDay(to, "dayMonthYear")}`;
  }

  if (from.getUTCMonth() !== to.getUTCMonth()) {
    return `${formatDay(from, "dayMonth")} and ${formatDay(to, "dayMonth")}`;
  }

  return `${formatDay(from, "day")} and ${formatDay(to, "dayMonth")}`;
}

type DayWording = "day" | "dayMonth" | "dayMonthYear";

const DAY_WORDINGS: Record<DayWording, Intl.DateTimeFormatOptions> = {
  day: { day: "numeric" },
  dayMonth: { day: "numeric", month: "long" },
  dayMonthYear: { day: "numeric", month: "long", year: "numeric" },
};

function formatDay(date: Date, wording: DayWording): string {
  return new Intl.DateTimeFormat("en-GB", {
    ...DAY_WORDINGS[wording],
    timeZone: "UTC",
  }).format(date);
}

function noonUtcOf(isoDay: string): Date {
  return new Date(`${isoDay}T12:00:00.000Z`);
}

function startOf(call: ClassifiedCall): number {
  return new Date(call.startsAt).getTime();
}

function bookedAtOf(call: ClassifiedCall): number {
  return new Date(call.bookedAt).getTime();
}

function compareText(one: string, other: string): number {
  return one.localeCompare(other, undefined, { sensitivity: "base" });
}

function orderCallsByScheduledDate(
  calls: readonly ClassifiedCall[],
  status: CoachCallStatus,
): ClassifiedCall[] {
  if (status === "custom") {
    return [...calls].sort((one, other) => startOf(one) - startOf(other));
  }

  return orderCalls(calls);
}

function orderCallsInDefaultDirection(
  calls: readonly ClassifiedCall[],
  key: SortKey,
  status: CoachCallStatus,
): ClassifiedCall[] {
  switch (key) {
    case "scheduled":
      return orderCallsByScheduledDate(calls, status);
    case "booked":
      return [...calls].sort(
        (one, other) => bookedAtOf(other) - bookedAtOf(one),
      );
    case "name":
      return [...calls].sort((one, other) =>
        compareText(one.fullName, other.fullName),
      );
    case "email":
      return [...calls].sort((one, other) =>
        compareText(one.visitorEmail, other.visitorEmail),
      );
  }
}

function hasStatus(call: ClassifiedCall, selection: ListingSelection): boolean {
  if (selection.status === "all") {
    return true;
  }

  if (selection.status === "custom") {
    return withinRange(call, selection.range);
  }

  if (selection.status === "today") {
    return call.isToday;
  }

  return call.timing === selection.status;
}

function withinRange(call: ClassifiedCall, range: DateRange): boolean {
  if (!isChosenRange(range)) {
    return true;
  }

  return call.day >= range.from && call.day <= range.to;
}

function matchesQuery(call: ClassifiedCall, query: string): boolean {
  const needle = query.trim().toLowerCase();

  if (needle.length === 0) {
    return true;
  }

  return [call.fullName, call.visitorEmail].some((value) =>
    value.toLowerCase().includes(needle),
  );
}

function withGaps(pages: number[]): PaginationStep[] {
  const steps: PaginationStep[] = [];
  let previous = 0;

  for (const page of pages) {
    if (previous && page - previous > 1) {
      steps.push("gap");
    }

    steps.push(page);
    previous = page;
  }

  return steps;
}

function withoutListingParams(url: URL): string {
  const searchParams = new URLSearchParams(url.search);

  for (const param of LISTING_PARAMS) {
    searchParams.delete(param);
  }

  return searchParams.toString();
}
