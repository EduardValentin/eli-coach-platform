import type { CoachAssessmentCall } from "~/features/assessment-calls/contracts/assessment-calls";
import { dayKeyOf } from "~/features/assessment-calls/ui/shared/day-key";

export const STATUS_PARAM = "status";
export const QUERY_PARAM = "q";
export const PAGE_PARAM = "page";
export const PAGE_SIZE = 10;

const LISTING_PARAMS = [STATUS_PARAM, QUERY_PARAM, PAGE_PARAM];

const FIRST_PAGE = 1;
const PAGES_AROUND_CURRENT = 1;
const PAGES_SHOWN_WITHOUT_GAPS = 7;

export type CoachCallStatus = "upcoming" | "today" | "past" | "all";

type CoachCallTiming = "upcoming" | "past";

export type ClassifiedCall = {
  call: CoachAssessmentCall;
  isToday: boolean;
  timing: CoachCallTiming;
};

export type ListingMoment = {
  now: Date;
  timeZone: string;
};

export type ListingSelection = {
  query: string;
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

// The browser's mirror of `AssessmentCall.hasEnded`: a call belongs to the
// past from the instant it ends, never from the instant it starts.
export function classifyCalls(
  calls: readonly CoachAssessmentCall[],
  moment: ListingMoment,
): ClassifiedCall[] {
  const today = dayKeyOf(moment.now, moment.timeZone);

  return calls.map((call) => ({
    call,
    isToday: dayKeyOf(new Date(call.startsAt), moment.timeZone) === today,
    timing:
      new Date(call.endsAt).getTime() <= moment.now.getTime()
        ? "past"
        : "upcoming",
  }));
}

export function filterCalls(
  calls: readonly ClassifiedCall[],
  selection: ListingSelection,
): ClassifiedCall[] {
  return calls.filter(
    (call) =>
      hasStatus(call, selection.status) && matchesQuery(call, selection.query),
  );
}

export function orderCalls(calls: readonly ClassifiedCall[]): ClassifiedCall[] {
  const startOf = (call: ClassifiedCall) =>
    new Date(call.call.startsAt).getTime();
  const withTiming = (timing: CoachCallTiming) =>
    calls.filter((call) => call.timing === timing);

  return [
    ...withTiming("upcoming").sort(
      (one, other) => startOf(one) - startOf(other),
    ),
    ...withTiming("past").sort((one, other) => startOf(other) - startOf(one)),
  ];
}

export function upcomingCalls(
  calls: readonly ClassifiedCall[],
  limit: number,
): ClassifiedCall[] {
  return orderCalls(calls)
    .filter((call) => call.timing === "upcoming")
    .slice(0, limit);
}

export function countTodayCalls(calls: readonly ClassifiedCall[]): number {
  return calls.filter((call) => call.isToday).length;
}

export function parseStatusParam(raw: string | null): CoachCallStatus {
  if (raw === "today" || raw === "past" || raw === "all") {
    return raw;
  }

  return "upcoming";
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
    if (around >= FIRST_PAGE && around <= pageCount) {
      shown.add(around);
    }
  }

  return withGaps([...shown].sort((one, other) => one - other));
}

// Status, search and page are answered in the browser from the list the loader
// already carried, so a change to any of them must not wait on the server.
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

function hasStatus(call: ClassifiedCall, status: CoachCallStatus): boolean {
  if (status === "all") {
    return true;
  }

  if (status === "today") {
    return call.isToday;
  }

  return call.timing === status;
}

function matchesQuery(call: ClassifiedCall, query: string): boolean {
  const needle = query.trim().toLowerCase();

  if (needle.length === 0) {
    return true;
  }

  return (
    call.call.visitorName.toLowerCase().includes(needle) ||
    call.call.visitorEmail.toLowerCase().includes(needle)
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
