import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useSearchParams } from "react-router";
import { CalendarSearch, type LucideIcon } from "lucide-react";
import { useAppState } from "../context/AppContext";
import { useCheckins } from "../context/CheckinContext";
import type { CheckIn, CheckinParty } from "../domain/checkins";
import {
  countsByKind,
  countsByWaiting,
  defaultDirectionFor,
  filterCheckins,
  hasActiveFilters,
  openingTab,
  orderCheckins,
  parseDirection,
  parseKindFilter,
  parseTab,
  parseWaitingFilter,
  type CheckinSelection,
  type CheckinTab,
  type KindFilter,
  type WaitingFilter,
} from "../utils/checkinListing";
import {
  CHECKIN_KIND_PARAM,
  CHECKIN_QUERY_PARAM,
  checkinAnchorId,
  checkinIdFromSearch,
  withoutCheckinTarget,
} from "../utils/checkinLinks";
import { pageHolding, pageOf, parsePage } from "../utils/listPaging";
import { EmptyState } from "./EmptyState";
import { ListPager } from "./ListPager";
import { ListingToolbar } from "./ListingToolbar";
import { SearchField } from "./SearchField";
import { SortControl, type SortChoice, type SortOption } from "./SortControl";
import { CountedSelect } from "./CountedSelect";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const TAB_PARAM = "view";
const WAITING_PARAM = "waiting";
const DIRECTION_PARAM = "dir";
const PAGE_PARAM = "page";
const CHECKINS_PER_PAGE = 10;

const TAB_LABELS: Record<CheckinTab, string> = {
  upcoming: "Upcoming",
  requests: "Requests",
  past: "Past",
};

const KIND_LABELS: Record<KindFilter, string> = {
  any: "All kinds",
  recurring: "Recurring",
  "ad-hoc": "Ad-hoc",
  "program-review": "Program review",
};

const MVP_KINDS: readonly KindFilter[] = ["any", "recurring", "ad-hoc"];
const POST_MVP_KINDS: readonly KindFilter[] = [...MVP_KINDS, "program-review"];

export type CheckinEmptyCopy = {
  icon: LucideIcon;
  title: string;
  description: string;
};

function tabHoldingCheckin(
  checkinId: string | null,
  groups: Record<CheckinTab, CheckIn[]>,
): CheckinTab | undefined {
  if (!checkinId) return undefined;
  const tabs = Object.keys(groups) as CheckinTab[];
  return tabs.find((tab) => groups[tab].some((c) => c.id === checkinId));
}

function dateSortOptions(tab: CheckinTab): readonly SortOption<"date">[] {
  return [
    {
      key: "date",
      label: "Check-in date",
      order: "chronological",
      defaultDirection: defaultDirectionFor(tab),
      directionLabels: { asc: "Soonest first", desc: "Latest first" },
    },
  ];
}

export function CheckinListing({
  party,
  clientId,
  waitingForLabel,
  search,
  emptyCopy,
  renderCheckin,
}: {
  party: CheckinParty;
  clientId?: string;
  waitingForLabel: string;
  search?: { placeholder: string };
  emptyCopy: Record<CheckinTab, CheckinEmptyCopy>;
  renderCheckin: (checkin: CheckIn, tab: CheckinTab) => ReactNode;
}) {
  const { pathname, key: locationKey } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { appState } = useAppState();
  const { getCheckinsInTab, getCheckinsAwaiting } = useCheckins();

  const focusedCheckinId = checkinIdFromSearch(searchParams);
  const tabCheckins: Record<CheckinTab, CheckIn[]> = {
    upcoming: getCheckinsInTab("upcoming", party, clientId),
    requests: getCheckinsInTab("requests", party, clientId),
    past: getCheckinsInTab("past", party, clientId),
  };
  const awaitingViewer = getCheckinsAwaiting(party, clientId).length;
  const [openedOn] = useState<CheckinTab>(() => openingTab(awaitingViewer));
  const defaultTab = tabHoldingCheckin(focusedCheckinId, tabCheckins) ?? openedOn;

  useBringCheckinIntoFocus(focusedCheckinId, locationKey);

  const tab = parseTab(searchParams.get(TAB_PARAM), defaultTab);
  const selection: CheckinSelection = {
    kind: parseKindFilter(searchParams.get(CHECKIN_KIND_PARAM)),
    waiting:
      tab === "requests"
        ? parseWaitingFilter(searchParams.get(WAITING_PARAM))
        : "any",
    query: search ? (searchParams.get(CHECKIN_QUERY_PARAM) ?? "") : "",
  };
  const direction = parseDirection(searchParams.get(DIRECTION_PARAM), tab);
  const inTab = tabCheckins[tab];
  const shown = orderCheckins(filterCheckins(inTab, selection, party), {
    tab,
    direction,
    party,
  });
  const pageWithTarget =
    focusedCheckinId && !searchParams.has(PAGE_PARAM)
      ? pageHolding(shown, {
          holds: (c) => c.id === focusedCheckinId,
          perPage: CHECKINS_PER_PAGE,
        })
      : null;
  const page = pageWithTarget ?? parsePage(searchParams.get(PAGE_PARAM));
  const view = pageOf(shown, { page, perPage: CHECKINS_PER_PAGE });
  const kinds =
    appState.prototypeMode === "post-mvp" ? POST_MVP_KINDS : MVP_KINDS;
  const waitingLabels: Record<WaitingFilter, string> = {
    any: "All requests",
    you: "Needs your answer",
    them: waitingForLabel,
  };

  const updateSearchParams = (edit: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    if (focusedCheckinId) {
      setOrClear(next, TAB_PARAM, tab, openedOn);
      withoutCheckinTarget(next);
    }
    edit(next);
    next.delete(PAGE_PARAM);
    setSearchParams(next, { replace: true });
  };

  const setOrClear = (
    params: URLSearchParams,
    name: string,
    value: string,
    fallback: string,
  ) => {
    if (value === fallback) params.delete(name);
    else params.set(name, value);
  };

  const chooseTab = (value: string) => {
    updateSearchParams((params) => {
      setOrClear(params, TAB_PARAM, parseTab(value, openedOn), openedOn);
      params.delete(WAITING_PARAM);
      params.delete(DIRECTION_PARAM);
    });
  };

  const chooseKind = (kind: KindFilter) => {
    updateSearchParams((params) => setOrClear(params, CHECKIN_KIND_PARAM, kind, "any"));
  };

  const chooseWaiting = (waiting: WaitingFilter) => {
    updateSearchParams((params) =>
      setOrClear(params, WAITING_PARAM, waiting, "any"),
    );
  };

  const chooseSort = (sort: SortChoice<"date">) => {
    updateSearchParams((params) =>
      setOrClear(
        params,
        DIRECTION_PARAM,
        sort.direction,
        defaultDirectionFor(tab),
      ),
    );
  };

  const changeQuery = (value: string) => {
    updateSearchParams((params) => setOrClear(params, CHECKIN_QUERY_PARAM, value, ""));
  };

  const clearFilters = () => {
    updateSearchParams((params) => {
      params.delete(CHECKIN_KIND_PARAM);
      params.delete(WAITING_PARAM);
      params.delete(CHECKIN_QUERY_PARAM);
    });
  };

  const pathForPage = (chosen: number) => {
    const params = new URLSearchParams(searchParams);
    if (focusedCheckinId) {
      setOrClear(params, TAB_PARAM, tab, openedOn);
      withoutCheckinTarget(params);
    }
    setOrClear(params, PAGE_PARAM, String(chosen), "1");
    const query = params.toString();
    return query.length > 0 ? `${pathname}?${query}` : pathname;
  };

  const empty =
    inTab.length === 0
      ? emptyCopy[tab]
      : {
          icon: CalendarSearch,
          title: "No check-ins match",
          description: "Try another filter or search.",
        };

  return (
    <Tabs
      variant="segmented"
      value={tab}
      onValueChange={chooseTab}
      className="w-full"
    >
      <ListingToolbar
        view={
          <TabsList>
            {(["upcoming", "requests", "past"] as const).map((value) => (
              <TabsTrigger key={value} value={value} className="px-4 sm:px-5">
                {TAB_LABELS[value]}
                {value === "requests" && awaitingViewer > 0 && (
                  <>
                    <Badge
                      tone="count"
                      data-parity="requests-count"
                      aria-hidden="true"
                    >
                      {awaitingViewer}
                    </Badge>
                    <span className="sr-only" data-parity="requests-count-sr">
                      {awaitingViewer} waiting on you
                    </span>
                  </>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        }
        filters={
          <>
            <CountedSelect
              label="Kind"
              value={selection.kind}
              options={kinds}
              labels={KIND_LABELS}
              counts={countsByKind(inTab, selection, party)}
              onChoose={chooseKind}
            />
            {tab === "requests" && (
              <CountedSelect
                label="Waiting on"
                value={selection.waiting}
                options={["any", "you", "them"]}
                labels={waitingLabels}
                counts={countsByWaiting(inTab, selection, party)}
                onChoose={chooseWaiting}
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
                placeholder={search.placeholder}
                size="sm"
                className="w-full sm:w-72"
                value={selection.query}
                onChange={(event) => changeQuery(event.target.value)}
              />
            )}
            <SortControl
              options={dateSortOptions(tab)}
              sort={{ key: "date", direction }}
              onChange={chooseSort}
              className="sm:w-72"
            />
          </>
        }
        searchParity="checkin-search-sort"
      />

      <TabsContent value={tab} data-parity="checkins-tab-panel">
        {view.items.length === 0 ? (
          <EmptyState
            icon={empty.icon}
            title={empty.title}
            description={empty.description}
            descriptionParity="checkins-empty-description"
            action={
              inTab.length > 0 && hasActiveFilters(selection) ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <ul
              aria-label={`${TAB_LABELS[tab]} check-ins`}
              className="space-y-3"
            >
              {view.items.map((checkin) => (
                <li key={checkin.id} data-parity="checkin-row">
                  <div
                    id={checkinAnchorId(checkin.id)}
                    tabIndex={-1}
                    className="rounded-card"
                  >
                    {renderCheckin(checkin, tab)}
                  </div>
                </li>
              ))}
            </ul>
            {view.pageCount > 1 && (
              <ListPager view={view} pathForPage={pathForPage} />
            )}
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

function useBringCheckinIntoFocus(focusedCheckinId: string | null, locationKey: string) {
  useEffect(() => {
    if (!focusedCheckinId) return;
    const anchor = document.getElementById(checkinAnchorId(focusedCheckinId));
    anchor?.scrollIntoView({ block: "center" });
    anchor?.focus({ preventScroll: true });
  }, [focusedCheckinId, locationKey]);
}
