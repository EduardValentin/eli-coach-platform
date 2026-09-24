import {
  AppointmentCard,
  type AppointmentDetail,
} from "@eli-coach-platform/ui/appointments";
import { DateRangeField } from "@eli-coach-platform/ui/calendar";
import { cn } from "@eli-coach-platform/ui/lib";
import { EmptyState } from "@eli-coach-platform/ui/portal";
import {
  Badge,
  Button,
  cardVariants,
  Label,
  SearchField,
} from "@eli-coach-platform/ui/primitives";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@eli-coach-platform/ui/tabs";
import { CalendarSearch } from "lucide-react";
import type { CoachAssessmentCall } from "~/features/assessment-calls/contracts/assessment-calls";
import {
  formatClockTime,
  formatShortDay,
} from "~/features/assessment-calls/contracts/call-moment";
import { findCountry } from "~/features/assessment-calls/contracts/countries";
import {
  formatAgeForCard,
  labelForGender,
  labelForPrimaryGoal,
} from "~/features/assessment-calls/contracts/visitor-profile";
import {
  classifyCalls,
  DEFAULT_CALL_STATUS,
  emptyListingMessage,
  filterCalls,
  orderCallsBy,
  pageOfCalls,
  PAGE_SIZE,
  type ClassifiedCall,
  type CoachCallStatus,
  type ListingMoment,
  type ListingSelection,
} from "~/features/assessment-calls/ui/coach/assessment-call-listing";
import { JoinCallLink } from "~/features/assessment-calls/ui/coach/join-call-link";

import { CallListPager } from "./call-list-pager";
import { SortControl } from "./sort-control";
import { useCallListingParams } from "./use-call-listing-params";

const SEARCH_FIELD_ID = "assessment-call-search";
const RANGE_YEARS_AROUND_NOW = 1;

const STATUS_TABS: readonly { label: string; status: CoachCallStatus }[] = [
  { label: "All", status: "all" },
  { label: "Today", status: "today" },
  { label: "Upcoming", status: "upcoming" },
  { label: "Past", status: "past" },
  { label: "Custom", status: "custom" },
];

const NO_RANGE = { from: null, to: null } as const;

type EmptyCallsCopy = { description: string; title: string };

type AssessmentCallsSectionProps = {
  calls: readonly CoachAssessmentCall[];
  now: Date;
  timeZone: string;
};

export function AssessmentCallsSection({
  calls,
  now,
  timeZone,
}: AssessmentCallsSectionProps) {
  const {
    changeQuery,
    chooseRange,
    chooseSortKey,
    chooseStatus,
    page,
    pathForPage,
    query,
    range,
    sort,
    status,
    toggleSortDirection,
  } = useCallListingParams();
  const selection: ListingSelection = { query, range, status };
  const classified = classifyCalls(calls, { now, timeZone });
  const matching = orderCallsBy(
    filterCalls(classified, selection),
    sort,
    status,
  );
  const view = pageOfCalls(matching, { page, size: PAGE_SIZE });
  const emptyCopy = emptyCallsCopy(selection, classified.length);

  const clearFilters = () => {
    changeQuery("");
    chooseRange(NO_RANGE);
  };

  return (
    <div
      className={cn(cardVariants({ variant: "portal-panel" }), "p-5 sm:p-8")}
      data-parity-root="AssessmentCallsSection"
    >
      <Tabs className="w-full" onValueChange={chooseStatus} value={status}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="grid w-full gap-3 sm:w-fit sm:max-w-full">
            <TabsList aria-label="When" variant="segmented">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.status}
                  value={tab.status}
                  variant="segmented"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {status === "custom" && (
              <DateRangeField
                aria-label="Date range"
                className="w-full"
                size="sm"
                data-parity-root="DateRangeField"
                onChange={chooseRange}
                value={range}
                yearRange={{
                  from: now.getFullYear() - RANGE_YEARS_AROUND_NOW,
                  to: now.getFullYear() + RANGE_YEARS_AROUND_NOW,
                }}
              />
            )}
          </div>

          <div className="grid w-full gap-3 sm:w-fit sm:max-w-full">
            <Label className="sr-only" htmlFor={SEARCH_FIELD_ID}>
              Search calls
            </Label>
            <SearchField
              className="w-full sm:w-72"
              id={SEARCH_FIELD_ID}
              onChange={(event) => changeQuery(event.target.value)}
              placeholder="Search by name or email"
              size="sm"
              value={query}
            />
            <SortControl
              onChooseKey={chooseSortKey}
              onToggleDirection={toggleSortDirection}
              sort={sort}
            />
          </div>
        </div>

        <TabsContent value={status} variant="segmented">
          {view.calls.length === 0 ? (
            <EmptyState
              action={
                hasClearableFilters(selection) && (
                  <Button onClick={clearFilters} size="sm" variant="outline">
                    Clear filters
                  </Button>
                )
              }
              description={emptyCopy.description}
              icon={CalendarSearch}
              title={emptyCopy.title}
            />
          ) : (
            <>
              <CallList calls={view.calls} moment={{ now, timeZone }} />

              {view.pageCount > 1 && (
                <CallListPager pathForPage={pathForPage} view={view} />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function emptyCallsCopy(
  selection: ListingSelection,
  totalCalls: number,
): EmptyCallsCopy {
  if (totalCalls === 0 && !isNarrowed(selection)) {
    return {
      description: "Booked assessment calls appear here.",
      title: "No calls yet",
    };
  }

  return {
    description: emptyListingMessage(selection),
    title: "No calls found",
  };
}

function isNarrowed(selection: ListingSelection): boolean {
  return selection.status !== DEFAULT_CALL_STATUS || hasSearch(selection);
}

function hasClearableFilters(selection: ListingSelection): boolean {
  return hasSearch(selection) || hasPickedRange(selection);
}

function hasSearch(selection: ListingSelection): boolean {
  return selection.query.trim().length > 0;
}

function hasPickedRange(selection: ListingSelection): boolean {
  return (
    selection.status === "custom" &&
    (selection.range.from !== null || selection.range.to !== null)
  );
}

function CallList(props: {
  calls: readonly ClassifiedCall[];
  moment: ListingMoment;
}) {
  const { calls, moment } = props;

  return (
    <ul aria-label="Assessment calls" className="space-y-4">
      {calls.map((call) => (
        <li data-parity-root="AppointmentCard" key={call.id}>
          <CallCard call={call} moment={moment} />
        </li>
      ))}
    </ul>
  );
}

function visitorDetails(
  call: ClassifiedCall,
  moment: ListingMoment,
): AppointmentDetail[] {
  return [
    {
      label: "Age",
      value: formatAgeForCard({
        dateOfBirth: call.dateOfBirth,
        on: moment.now,
        timeZone: moment.timeZone,
      }),
    },
    { label: "Gender", value: labelForGender(call.gender) },
    { label: "Goal", value: labelForPrimaryGoal(call.primaryGoal) },
    {
      label: "Country",
      value: findCountry(call.country)?.name ?? call.country,
    },
  ];
}

function CallCard(props: { call: ClassifiedCall; moment: ListingMoment }) {
  const { call, moment } = props;
  const { timeZone } = moment;
  const startsAt = new Date(call.startsAt);

  return (
    <AppointmentCard
      actions={
        call.timing === "upcoming" && (
          <JoinCallLink joinPath={call.joinPath} live={call.isToday} />
        )
      }
      attendee={{
        email: call.visitorEmail,
        name: call.fullName,
        phone: call.phone ?? undefined,
      }}
      badges={
        <>
          {call.isToday && <Badge tone="brand-secondary">Today</Badge>}
          {call.timing === "past" && <Badge tone="muted">Past</Badge>}
        </>
      }
      details={visitorDetails(call, moment)}
      quote={call.visitorNotes ?? undefined}
      status={call.timing === "past" ? "past" : "scheduled"}
      titleElement="h2"
      when={{
        date: formatShortDay(startsAt, timeZone),
        time: formatClockTime(startsAt, timeZone),
      }}
    />
  );
}
