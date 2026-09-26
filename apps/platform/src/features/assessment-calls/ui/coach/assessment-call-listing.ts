import type { CoachAssessmentCall } from "~/features/assessment-calls/contracts/assessment-calls";
import { COACH_CALLS_PAGE_PARAM } from "~/features/assessment-calls/contracts/paths";
import { dayKeyOf } from "~/features/assessment-calls/ui/shared/day-key";

export const WHEN_PARAM = "when";
export const QUERY_PARAM = "q";
export const SORT_PARAM = "sort";
export const DIRECTION_PARAM = "dir";
export const PAGE_SIZE = 10;

export const FILTER_PARAMS = [WHEN_PARAM, QUERY_PARAM, COACH_CALLS_PAGE_PARAM];

const LISTING_PARAMS = [...FILTER_PARAMS, SORT_PARAM, DIRECTION_PARAM];

export const FIRST_PAGE = 1;
const PAGES_AROUND_CURRENT = 1;
const PAGES_SHOWN_WITHOUT_GAPS = 7;

export type CoachCallWhen = "upcoming" | "today" | "past" | "all";

export const DEFAULT_CALL_WHEN: CoachCallWhen = "all";

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

export type ClassifiedCall = CoachAssessmentCall & {
  isToday: boolean;
  timing: CoachCallTiming;
};

export type ListingMoment = {
  now: Date;
  timeZone: string;
};

export type ListingSelection = {
  query: string;
  when: CoachCallWhen;
};

type ToolbarFilterState = { isActive: boolean; label: string };

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
      isToday: day === today,
      timing:
        new Date(call.endsAt).getTime() <= moment.now.getTime()
          ? "past"
          : "upcoming",
    };
  });
}

export function isEndedCall(call: ClassifiedCall): boolean {
  return call.timing === "past";
}

export function filterCalls(
  calls: readonly ClassifiedCall[],
  selection: ListingSelection,
): ClassifiedCall[] {
  return calls.filter(
    (call) =>
      isInWindow(call, selection) && matchesQuery(call, selection.query),
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
): ClassifiedCall[] {
  const ordered = orderCallsInDefaultDirection(calls, sort.key);

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

export function toCallWhen(raw: string | null): CoachCallWhen {
  if (raw === "upcoming" || raw === "today" || raw === "past") {
    return raw;
  }

  return DEFAULT_CALL_WHEN;
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
  extraParams: readonly string[],
): boolean {
  if (currentUrl.href === nextUrl.href) {
    return false;
  }

  const listingParams = [...LISTING_PARAMS, ...extraParams];

  return (
    currentUrl.pathname === nextUrl.pathname &&
    withoutParams(currentUrl, listingParams) ===
      withoutParams(nextUrl, listingParams)
  );
}

export type EmptyListingCopy = { description: string; title: string };

const NO_CALLS_YET_COPY: EmptyListingCopy = {
  description: "Booked assessment calls appear here.",
  title: "No calls yet",
};

const NO_CALLS_FOUND_TITLE = "No calls found";

const NO_SEARCH_MATCH_MESSAGE = "No calls match your search.";

const WHEN_EMPTY_MESSAGES: Record<Exclude<CoachCallWhen, "all">, string> = {
  past: "No past calls.",
  today: "No calls today.",
  upcoming: "No upcoming calls.",
};

const WHEN_PHRASES: Record<CoachCallWhen, string> = {
  all: "calls",
  past: "past calls",
  today: "calls today",
  upcoming: "upcoming calls",
};

export function emptyListingCopy(
  selection: ListingSelection,
  toolbarFilter?: ToolbarFilterState,
): EmptyListingCopy {
  if (hasSearchQuery(selection)) {
    return {
      description: NO_SEARCH_MATCH_MESSAGE,
      title: NO_CALLS_FOUND_TITLE,
    };
  }

  if (toolbarFilter?.isActive) {
    return {
      description: `No ${WHEN_PHRASES[selection.when]} match the ${toolbarFilter.label} status.`,
      title: NO_CALLS_FOUND_TITLE,
    };
  }

  if (selection.when === "all") {
    return NO_CALLS_YET_COPY;
  }

  return {
    description: WHEN_EMPTY_MESSAGES[selection.when],
    title: NO_CALLS_FOUND_TITLE,
  };
}

export function hasActiveFilters(
  selection: ListingSelection,
  toolbarFilter?: Pick<ToolbarFilterState, "isActive">,
): boolean {
  return (
    selection.when !== DEFAULT_CALL_WHEN ||
    hasSearchQuery(selection) ||
    toolbarFilter?.isActive === true
  );
}

function hasSearchQuery(selection: ListingSelection): boolean {
  return selection.query.trim().length > 0;
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

function orderCallsInDefaultDirection(
  calls: readonly ClassifiedCall[],
  key: SortKey,
): ClassifiedCall[] {
  switch (key) {
    case "scheduled":
      return orderCalls(calls);
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

function isInWindow(
  call: ClassifiedCall,
  selection: ListingSelection,
): boolean {
  if (selection.when === "all") {
    return true;
  }

  if (selection.when === "today") {
    return call.isToday;
  }

  return call.timing === selection.when;
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

function withoutParams(url: URL, params: readonly string[]): string {
  const searchParams = new URLSearchParams(url.search);

  for (const param of params) {
    searchParams.delete(param);
  }

  return searchParams.toString();
}
