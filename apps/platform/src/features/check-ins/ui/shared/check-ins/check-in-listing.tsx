import {
  CountedSelect,
  ListingToolbar,
  ListPager,
  SortControl,
  type SortOption,
} from "@eli-coach-platform/ui/filters";
import {
  pageOf,
  parsePage,
  parseSort,
  pathForPageOf,
  setParamOrDelete,
  setParamUnlessDefault,
  sortParams,
  useSearchParamsWriter,
  type SortChoice,
  type SortDirection,
} from "@eli-coach-platform/ui/lib";
import { EmptyState } from "@eli-coach-platform/ui/portal";
import { Badge, Button, SearchField } from "@eli-coach-platform/ui/primitives";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@eli-coach-platform/ui/tabs";
import { CalendarSearch, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router";

import {
  formatClockTime,
  formatShortDay,
} from "~/features/assessment-calls/public/call-moment";
import { CHECK_IN_FOCUS_PARAM } from "~/features/check-ins/public/paths";

import {
  CHECK_IN_FILTER_PARAMS,
  CHECK_IN_KIND_FILTERS,
  CHECK_IN_LISTING_PARAMS,
  CHECK_IN_TABS,
  CHECK_IN_WAITING_FILTERS,
  CHECK_INS_PER_PAGE,
  countsByKind,
  countsByWaiting,
  dateSortRuleFor,
  hasActiveFilters,
  matchesSelection,
  openingTabOf,
  orderCheckIns,
  pageHolding,
  parseKindFilter,
  parseTab,
  parseWaitingFilter,
  tabHolding,
  type CheckInKindFilter,
  type CheckInSelection,
  type CheckInTab,
  type CheckInWaitingFilter,
  type ListedCheckIn,
} from "./check-in-listing-rules";

export type CheckInMoment = {
  date: string;
  time: string;
};

export type CheckInEmptyCopy = {
  description: string;
  icon: LucideIcon;
  title: string;
};

type CheckInSearch<CheckIn extends ListedCheckIn> = {
  nameOf: (checkIn: CheckIn) => string;
  placeholder: string;
};

type CheckInListingProps<CheckIn extends ListedCheckIn> = {
  checkIns: readonly CheckIn[];
  emptyCopy: Record<CheckInTab, CheckInEmptyCopy>;
  renderCheckIn: (checkIn: CheckIn, tab: CheckInTab) => ReactNode;
  search?: CheckInSearch<CheckIn>;
  waitingForLabel: string;
};

type DateSortChoice = SortChoice<"date">;

type CheckInListingControls = {
  changeQuery: (query: string) => void;
  chooseKind: (kind: CheckInKindFilter) => void;
  chooseSort: (sort: DateSortChoice) => void;
  chooseTab: (value: string) => void;
  chooseWaiting: (waiting: CheckInWaitingFilter) => void;
  clearFilters: () => void;
  focusedId: string | null;
  pageParam: string | null;
  pathForPage: (page: number) => string;
  selection: CheckInSelection;
  sort: DateSortChoice;
  tab: CheckInTab;
};

export function checkInMomentOf(
  startsAt: string,
  timeZone: string,
): CheckInMoment {
  const instant = new Date(startsAt);

  return {
    date: formatShortDay(instant, timeZone),
    time: formatClockTime(instant, timeZone),
  };
}

const TAB_LABELS: Record<CheckInTab, string> = {
  upcoming: "Upcoming",
  requests: "Requests",
  past: "Past",
};

const KIND_LABELS: Readonly<Record<CheckInKindFilter, string>> = {
  any: "All kinds",
  recurring: "Weekly",
  "ad-hoc": "Ad-hoc",
};

const NO_SELECTION: CheckInSelection = {
  kind: "any",
  query: "",
  waiting: "any",
};

const NO_MATCH_COPY: CheckInEmptyCopy = {
  description: "Try another filter or search.",
  icon: CalendarSearch,
  title: "No check-ins match",
};

const DATE_DIRECTION_LABELS: Readonly<Record<SortDirection, string>> = {
  asc: "Soonest first",
  desc: "Latest first",
};

export function CheckInListing<CheckIn extends ListedCheckIn>({
  checkIns,
  emptyCopy,
  renderCheckIn,
  search,
  waitingForLabel,
}: CheckInListingProps<CheckIn>) {
  const { key: locationKey } = useLocation();
  const listing = useCheckInListingParams(checkIns);
  const { selection, tab } = listing;
  useBringCheckInIntoFocus(listing.focusedId, locationKey);
  const inTab = checkIns.filter((checkIn) => checkIn.tab === tab);
  const shown = orderCheckIns(
    inTab.filter((checkIn) =>
      matchesSelection(checkIn, selection, search?.nameOf),
    ),
    { direction: listing.sort.direction, tab },
  );
  const pageHoldingFocused =
    listing.focusedId !== null && listing.pageParam === null
      ? pageHolding(shown, listing.focusedId, CHECK_INS_PER_PAGE)
      : null;
  const listPage = pageOf(shown, {
    page: pageHoldingFocused ?? parsePage(listing.pageParam),
    perPage: CHECK_INS_PER_PAGE,
  });
  const awaitingViewerCount = checkIns.filter(
    (checkIn) => checkIn.awaitsViewer,
  ).length;
  const emptyStateCopy = inTab.length === 0 ? emptyCopy[tab] : NO_MATCH_COPY;
  const offersClearFilters =
    inTab.length > 0 && hasActiveFilters(selection, search?.nameOf);

  return (
    <Tabs
      className="w-full"
      onValueChange={listing.chooseTab}
      value={tab}
      variant="segmented"
    >
      <ListingToolbar
        filters={
          <>
            <CountedSelect
              counts={countsByKind(inTab, selection, search?.nameOf)}
              label="Kind"
              labels={KIND_LABELS}
              onChoose={listing.chooseKind}
              options={CHECK_IN_KIND_FILTERS}
              value={selection.kind}
            />
            {tab === "requests" && (
              <CountedSelect
                counts={countsByWaiting(inTab, selection, search?.nameOf)}
                label="Waiting on"
                labels={{
                  any: "All requests",
                  them: waitingForLabel,
                  you: "Needs your answer",
                }}
                onChoose={listing.chooseWaiting}
                options={CHECK_IN_WAITING_FILTERS}
                value={selection.waiting}
              />
            )}
          </>
        }
        filtersParity="checkin-filters"
        search={
          <>
            {search && (
              <SearchField
                aria-label="Search check-ins"
                className="w-full sm:w-72"
                onChange={(event) => listing.changeQuery(event.target.value)}
                placeholder={search.placeholder}
                size="sm"
                value={selection.query}
              />
            )}
            <SortControl
              className="sm:w-72"
              onChange={listing.chooseSort}
              options={dateSortOptionsFor(tab)}
              sort={listing.sort}
            />
          </>
        }
        searchParity="checkin-search-sort"
        view={<CheckInTabsList awaitingViewerCount={awaitingViewerCount} />}
      />

      <TabsContent data-parity="checkins-tab-panel" value={tab}>
        {listPage.items.length === 0 ? (
          <EmptyState
            action={
              offersClearFilters && (
                <Button
                  onClick={listing.clearFilters}
                  size="sm"
                  variant="outline"
                >
                  Clear filters
                </Button>
              )
            }
            description={emptyStateCopy.description}
            descriptionParity="checkins-empty-description"
            icon={emptyStateCopy.icon}
            title={emptyStateCopy.title}
          />
        ) : (
          <>
            <ul
              aria-label={`${TAB_LABELS[tab]} check-ins`}
              className="space-y-3"
            >
              {listPage.items.map((checkIn) => (
                <li data-parity="checkin-row" key={checkIn.id}>
                  <div
                    className="rounded-card"
                    id={anchorIdOf(checkIn.id)}
                    tabIndex={-1}
                  >
                    {renderCheckIn(checkIn, tab)}
                  </div>
                </li>
              ))}
            </ul>
            {listPage.pageCount > 1 && (
              <ListPager pathForPage={listing.pathForPage} view={listPage} />
            )}
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

function CheckInTabsList({
  awaitingViewerCount,
}: {
  awaitingViewerCount: number;
}) {
  return (
    <TabsList>
      {CHECK_IN_TABS.map((value) => (
        <TabsTrigger className="px-4 sm:px-5" key={value} value={value}>
          {TAB_LABELS[value]}
          {value === "requests" && awaitingViewerCount > 0 && (
            <>
              <Badge
                aria-hidden="true"
                data-parity="requests-count"
                tone="count"
              >
                {awaitingViewerCount}
              </Badge>
              <span className="sr-only" data-parity="requests-count-sr">
                {awaitingViewerCount} waiting on you
              </span>
            </>
          )}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}

function useCheckInListingParams(
  checkIns: readonly ListedCheckIn[],
): CheckInListingControls {
  const { pathname } = useLocation();
  const { replaceSearchParams, searchParams } = useSearchParamsWriter();
  const [openedOn] = useState(() => openingTabOf(checkIns));
  const focusedId = searchParams.get(CHECK_IN_FOCUS_PARAM);
  const tab = parseTab(
    searchParams.get(CHECK_IN_LISTING_PARAMS.tab),
    tabHolding(focusedId, checkIns) ?? openedOn,
  );
  const sortRule = dateSortRuleFor(tab);
  const sort = parseSort(
    sortRule,
    null,
    searchParams.get(CHECK_IN_LISTING_PARAMS.direction),
  );
  const selection: CheckInSelection = {
    kind: parseKindFilter(searchParams.get(CHECK_IN_LISTING_PARAMS.kind)),
    query:
      searchParams.get(CHECK_IN_LISTING_PARAMS.query) ?? NO_SELECTION.query,
    waiting:
      tab === "requests"
        ? parseWaitingFilter(searchParams.get(CHECK_IN_LISTING_PARAMS.waiting))
        : NO_SELECTION.waiting,
  };

  const releaseFocusedCheckIn = (params: URLSearchParams) => {
    if (focusedId === null) {
      return;
    }

    setParamUnlessDefault(params, CHECK_IN_LISTING_PARAMS.tab, {
      defaultValue: openedOn,
      value: tab,
    });
    params.delete(CHECK_IN_FOCUS_PARAM);
  };

  const reviseFromFirstPage = (revise: (params: URLSearchParams) => void) =>
    replaceSearchParams((params) => {
      releaseFocusedCheckIn(params);
      revise(params);
      params.delete(CHECK_IN_LISTING_PARAMS.page);
    });

  const chooseFilter = (name: string, value: string, defaultValue: string) =>
    reviseFromFirstPage((params) =>
      setParamUnlessDefault(params, name, { defaultValue, value }),
    );

  return {
    changeQuery: (query) =>
      chooseFilter(CHECK_IN_LISTING_PARAMS.query, query, NO_SELECTION.query),
    chooseKind: (kind) =>
      chooseFilter(CHECK_IN_LISTING_PARAMS.kind, kind, NO_SELECTION.kind),
    chooseSort: (chosen) =>
      reviseFromFirstPage((params) =>
        setParamOrDelete(
          params,
          CHECK_IN_LISTING_PARAMS.direction,
          sortParams(sortRule, chosen).dir,
        ),
      ),
    chooseTab: (value) =>
      reviseFromFirstPage((params) => {
        setParamUnlessDefault(params, CHECK_IN_LISTING_PARAMS.tab, {
          defaultValue: openedOn,
          value: parseTab(value, openedOn),
        });
        params.delete(CHECK_IN_LISTING_PARAMS.waiting);
        params.delete(CHECK_IN_LISTING_PARAMS.direction);
      }),
    chooseWaiting: (waiting) =>
      chooseFilter(
        CHECK_IN_LISTING_PARAMS.waiting,
        waiting,
        NO_SELECTION.waiting,
      ),
    clearFilters: () =>
      reviseFromFirstPage((params) => {
        for (const param of Object.values(CHECK_IN_FILTER_PARAMS)) {
          params.delete(param);
        }
      }),
    focusedId,
    pageParam: searchParams.get(CHECK_IN_LISTING_PARAMS.page),
    pathForPage: (page) => {
      const params = new URLSearchParams(searchParams);
      releaseFocusedCheckIn(params);

      return pathForPageOf(
        {
          pageParam: CHECK_IN_LISTING_PARAMS.page,
          pathname,
          searchParams: params,
        },
        page,
      );
    },
    selection,
    sort,
    tab,
  };
}

function dateSortOptionsFor(tab: CheckInTab): readonly SortOption<"date">[] {
  return [
    {
      defaultDirection: dateSortRuleFor(tab).defaultDirection.date,
      directionLabels: DATE_DIRECTION_LABELS,
      key: "date",
      label: "Check-in date",
      order: "chronological",
    },
  ];
}

function useBringCheckInIntoFocus(
  focusedId: string | null,
  locationKey: string,
) {
  useEffect(() => {
    if (focusedId === null) {
      return;
    }

    const anchor = document.getElementById(anchorIdOf(focusedId));
    anchor?.scrollIntoView({ block: "center" });
    anchor?.focus({ preventScroll: true });
  }, [focusedId, locationKey]);
}

function anchorIdOf(checkInId: string): string {
  return `checkin-${checkInId}`;
}
