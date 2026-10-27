import type { SortChoice, SortRule } from "~/shared/design-system/lib";

import type { CoachAssessmentCall } from "~/bounded-contexts/scheduling/assessment-calls/public/assessment-calls";
import { COACH_CALLS_PAGE_PARAM } from "~/bounded-contexts/scheduling/assessment-calls/public/paths";
import { dayKeyOf } from "~/bounded-contexts/scheduling/assessment-calls/ui/shared/day-key";

export const WHEN_PARAM = "when";
export const QUERY_PARAM = "q";
export const SORT_PARAM = "sort";
export const DIRECTION_PARAM = "dir";
export const PAGE_SIZE = 10;

export const FILTER_PARAMS = [WHEN_PARAM, QUERY_PARAM, COACH_CALLS_PAGE_PARAM];

export const LISTING_PARAMS = [...FILTER_PARAMS, SORT_PARAM, DIRECTION_PARAM];

export type CoachCallWhen = "upcoming" | "today" | "past" | "all";

export const DEFAULT_CALL_WHEN: CoachCallWhen = "all";

type CoachCallTiming = "upcoming" | "past";

export type SortKey = "scheduled" | "booked" | "name" | "email";

export const SORT_KEYS: readonly SortKey[] = [
  "scheduled",
  "booked",
  "name",
  "email",
];

export const CALL_SORT_RULE: SortRule<SortKey> = {
  defaultDirection: {
    booked: "desc",
    email: "asc",
    name: "asc",
    scheduled: "desc",
  },
  fallback: "scheduled",
};

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
  sort: SortChoice<SortKey>,
): ClassifiedCall[] {
  const ordered = orderCallsInDefaultDirection(calls, sort.key);

  return sort.direction === CALL_SORT_RULE.defaultDirection[sort.key]
    ? ordered
    : ordered.reverse();
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
