import type { ReactNode } from "react";
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
import { pageOf, parsePage } from "../utils/listPaging";
import { EmptyState } from "./EmptyState";
import { ListPager } from "./ListPager";
import { SearchField } from "./SearchField";
import { SortControl, type SortChoice, type SortOption } from "./SortControl";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const TAB_PARAM = "view";
const KIND_PARAM = "kind";
const WAITING_PARAM = "waiting";
const QUERY_PARAM = "q";
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

function CountedSelect<Value extends string>({
  label,
  value,
  options,
  labels,
  counts,
  onChoose,
}: {
  label: string;
  value: Value;
  options: readonly Value[];
  labels: Record<Value, string>;
  counts: Record<Value, number>;
  onChoose: (value: Value) => void;
}) {
  return (
    <Select value={value} onValueChange={(chosen) => onChoose(chosen as Value)}>
      <SelectTrigger aria-label={label} size="sm" className="w-full">
        <SelectValue>{labels[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            <span className="flex items-center gap-2">
              {labels[option]} <Badge tone="count">{counts[option]}</Badge>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CheckinListing({
  party,
  clientId,
  defaultTab,
  waitingForLabel,
  search,
  emptyCopy,
  renderCheckin,
}: {
  party: CheckinParty;
  clientId?: string;
  defaultTab: CheckinTab;
  waitingForLabel: string;
  search?: { placeholder: string };
  emptyCopy: Record<CheckinTab, CheckinEmptyCopy>;
  renderCheckin: (checkin: CheckIn, tab: CheckinTab) => ReactNode;
}) {
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { appState } = useAppState();
  const {
    getUpcomingCheckins,
    getPendingCheckins,
    getPastCheckins,
    getCheckinsAwaiting,
  } = useCheckins();

  const tab = parseTab(searchParams.get(TAB_PARAM), defaultTab);
  const selection: CheckinSelection = {
    kind: parseKindFilter(searchParams.get(KIND_PARAM)),
    waiting:
      tab === "requests"
        ? parseWaitingFilter(searchParams.get(WAITING_PARAM))
        : "any",
    query: search ? (searchParams.get(QUERY_PARAM) ?? "") : "",
  };
  const direction = parseDirection(searchParams.get(DIRECTION_PARAM), tab);
  const page = parsePage(searchParams.get(PAGE_PARAM));

  const tabCheckins: Record<CheckinTab, CheckIn[]> = {
    upcoming: getUpcomingCheckins(clientId),
    requests: getPendingCheckins(clientId),
    past: getPastCheckins(clientId),
  };
  const inTab = tabCheckins[tab];
  const shown = orderCheckins(filterCheckins(inTab, selection, party), {
    tab,
    direction,
    party,
  });
  const view = pageOf(shown, { page, perPage: CHECKINS_PER_PAGE });
  const awaitingViewer = getCheckinsAwaiting(party, clientId).length;
  const kinds =
    appState.prototypeMode === "post-mvp" ? POST_MVP_KINDS : MVP_KINDS;
  const waitingLabels: Record<WaitingFilter, string> = {
    any: "All requests",
    you: "Needs your answer",
    them: waitingForLabel,
  };

  const updateSearchParams = (edit: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
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
      setOrClear(params, TAB_PARAM, parseTab(value, defaultTab), defaultTab);
      params.delete(WAITING_PARAM);
      params.delete(DIRECTION_PARAM);
    });
  };

  const chooseKind = (kind: KindFilter) => {
    updateSearchParams((params) => setOrClear(params, KIND_PARAM, kind, "any"));
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
    updateSearchParams((params) => setOrClear(params, QUERY_PARAM, value, ""));
  };

  const clearFilters = () => {
    updateSearchParams((params) => {
      params.delete(KIND_PARAM);
      params.delete(WAITING_PARAM);
      params.delete(QUERY_PARAM);
    });
  };

  const pathForPage = (chosen: number) => {
    const params = new URLSearchParams(searchParams);
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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="grid w-full gap-3 sm:w-fit sm:max-w-full">
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
          <div
            className="grid gap-3 sm:grid-flow-col sm:auto-cols-fr"
            data-parity="checkin-filters"
          >
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
          </div>
        </div>

        <div
          className="grid w-full gap-3 sm:w-fit sm:max-w-full"
          data-parity="checkin-search-sort"
        >
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
        </div>
      </div>

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
                  {renderCheckin(checkin, tab)}
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
