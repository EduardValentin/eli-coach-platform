import {
  haveOnlyListingParamsChanged,
  type SortDirection,
  type SortRule,
} from "@eli-coach-platform/ui/lib";
import type { ShouldRevalidateFunctionArgs } from "react-router";

import {
  CHECK_IN_TABS,
  type ClientCheckIns,
} from "~/features/check-ins/public/check-ins";

export { CHECK_IN_TABS };

export type ListedCheckIn = ClientCheckIns["checkIns"][number];

export type CheckInParty = ListedCheckIn["initiatedBy"];

export type CheckInTab = ListedCheckIn["tab"];

export type CheckInKindFilter = "any" | "recurring" | "ad-hoc";

export type CheckInWaitingFilter = "any" | "you" | "them";

export type CheckInSelection = {
  kind: CheckInKindFilter;
  query: string;
  waiting: CheckInWaitingFilter;
};

type CheckInOrder = { direction: SortDirection; tab: CheckInTab };

type CheckInsAddressChange = Pick<
  ShouldRevalidateFunctionArgs,
  "currentUrl" | "defaultShouldRevalidate" | "nextUrl"
>;

type NameOf<CheckIn> = (checkIn: CheckIn) => string;

export const CHECK_IN_KIND_FILTERS: readonly CheckInKindFilter[] = [
  "any",
  "recurring",
  "ad-hoc",
];

export const CHECK_IN_WAITING_FILTERS: readonly CheckInWaitingFilter[] = [
  "any",
  "you",
  "them",
];

export const CHECK_IN_FILTER_PARAMS = {
  kind: "kind",
  waiting: "waiting",
  query: "q",
} as const;

export const CHECK_IN_LISTING_PARAMS = {
  ...CHECK_IN_FILTER_PARAMS,
  tab: "view",
  direction: "dir",
  page: "page",
} as const;

export const CHECK_INS_PER_PAGE = 10;

const LISTED_KIND_OF: Record<
  Exclude<CheckInKindFilter, "any">,
  ListedCheckIn["kind"]
> = {
  "ad-hoc": "ad_hoc",
  recurring: "recurring",
};

export function shouldReloadCheckIns({
  currentUrl,
  defaultShouldRevalidate,
  nextUrl,
}: CheckInsAddressChange): boolean {
  return haveOnlyListingParamsChanged(
    currentUrl,
    nextUrl,
    Object.values(CHECK_IN_LISTING_PARAMS),
  )
    ? false
    : defaultShouldRevalidate;
}

export function parseTab(raw: string | null, fallback: CheckInTab): CheckInTab {
  return CHECK_IN_TABS.find((tab) => tab === raw) ?? fallback;
}

export function parseKindFilter(raw: string | null): CheckInKindFilter {
  return CHECK_IN_KIND_FILTERS.find((kind) => kind === raw) ?? "any";
}

export function parseWaitingFilter(raw: string | null): CheckInWaitingFilter {
  return CHECK_IN_WAITING_FILTERS.find((waiting) => waiting === raw) ?? "any";
}

export function dateSortRuleFor(tab: CheckInTab): SortRule<"date"> {
  return {
    defaultDirection: { date: tab === "past" ? "desc" : "asc" },
    fallback: "date",
  };
}

export function hasActiveFilters<CheckIn extends ListedCheckIn>(
  selection: CheckInSelection,
  nameOf?: NameOf<CheckIn>,
): boolean {
  return (
    selection.kind !== "any" ||
    selection.waiting !== "any" ||
    nameMatcherFor(selection.query, nameOf) !== null
  );
}

export function matchesSelection<CheckIn extends ListedCheckIn>(
  checkIn: CheckIn,
  selection: CheckInSelection,
  nameOf?: NameOf<CheckIn>,
): boolean {
  return (
    matchesKind(checkIn, selection.kind) &&
    matchesWaiting(checkIn, selection.waiting) &&
    matchesName(checkIn, selection.query, nameOf)
  );
}

export function countsByKind<CheckIn extends ListedCheckIn>(
  inTab: readonly CheckIn[],
  selection: CheckInSelection,
  nameOf?: NameOf<CheckIn>,
): Record<CheckInKindFilter, number> {
  const count = (kind: CheckInKindFilter) =>
    countMatching(inTab, { ...selection, kind }, nameOf);

  return {
    "ad-hoc": count("ad-hoc"),
    any: count("any"),
    recurring: count("recurring"),
  };
}

export function countsByWaiting<CheckIn extends ListedCheckIn>(
  inTab: readonly CheckIn[],
  selection: CheckInSelection,
  nameOf?: NameOf<CheckIn>,
): Record<CheckInWaitingFilter, number> {
  const count = (waiting: CheckInWaitingFilter) =>
    countMatching(inTab, { ...selection, waiting }, nameOf);

  return { any: count("any"), them: count("them"), you: count("you") };
}

export function orderCheckIns<CheckIn extends ListedCheckIn>(
  checkIns: readonly CheckIn[],
  order: CheckInOrder,
): CheckIn[] {
  const sign = order.direction === "asc" ? 1 : -1;
  const byStart = (first: CheckIn, second: CheckIn) =>
    sign * (Date.parse(first.startsAt) - Date.parse(second.startsAt));
  const rankOf = (checkIn: CheckIn) =>
    order.tab === "requests" ? requestRankOf(checkIn) : 0;

  return [...checkIns].sort(
    (first, second) => rankOf(first) - rankOf(second) || byStart(first, second),
  );
}

export function openingTabOf(checkIns: readonly ListedCheckIn[]): CheckInTab {
  return checkIns.some((checkIn) => checkIn.awaitsViewer)
    ? "requests"
    : "upcoming";
}

export function tabHolding(
  checkInId: string | null,
  checkIns: readonly ListedCheckIn[],
): CheckInTab | undefined {
  return checkIns.find((checkIn) => checkIn.id === checkInId)?.tab;
}

export function pageHolding(
  ordered: readonly ListedCheckIn[],
  checkInId: string,
  perPage: number,
): number | null {
  const index = ordered.findIndex((checkIn) => checkIn.id === checkInId);

  return index === -1 ? null : Math.floor(index / perPage) + 1;
}

function countMatching<CheckIn extends ListedCheckIn>(
  inTab: readonly CheckIn[],
  selection: CheckInSelection,
  nameOf?: NameOf<CheckIn>,
): number {
  return inTab.filter((checkIn) => matchesSelection(checkIn, selection, nameOf))
    .length;
}

function matchesKind(checkIn: ListedCheckIn, kind: CheckInKindFilter): boolean {
  return kind === "any" || checkIn.kind === LISTED_KIND_OF[kind];
}

function matchesWaiting(
  checkIn: ListedCheckIn,
  waiting: CheckInWaitingFilter,
): boolean {
  if (waiting === "any") {
    return true;
  }

  return checkIn.awaitsViewer === (waiting === "you");
}

function matchesName<CheckIn extends ListedCheckIn>(
  checkIn: CheckIn,
  query: string,
  nameOf?: NameOf<CheckIn>,
): boolean {
  return nameMatcherFor(query, nameOf)?.(checkIn) ?? true;
}

function nameMatcherFor<CheckIn extends ListedCheckIn>(
  query: string,
  nameOf?: NameOf<CheckIn>,
): ((checkIn: CheckIn) => boolean) | null {
  const needle = query.trim().toLowerCase();

  if (nameOf === undefined || needle.length === 0) {
    return null;
  }

  return (checkIn) => nameOf(checkIn).toLowerCase().includes(needle);
}

function requestRankOf(checkIn: ListedCheckIn): number {
  if (checkIn.status === "clash") {
    return 0;
  }

  return checkIn.awaitsViewer ? 1 : 2;
}
