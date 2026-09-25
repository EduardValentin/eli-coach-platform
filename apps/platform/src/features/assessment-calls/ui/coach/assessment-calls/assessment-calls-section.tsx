import {
  AppointmentCard,
  type AppointmentDetail,
} from "@eli-coach-platform/ui/appointments";
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
  emptyListingCopy,
  filterCalls,
  hasSearchQuery,
  orderCallsBy,
  pageOfCalls,
  PAGE_SIZE,
  type CallPageView,
  type ClassifiedCall,
  type CoachCallStatus,
  type EmptyListingCopy,
  type ListingMoment,
  type ListingSelection,
} from "~/features/assessment-calls/ui/coach/assessment-call-listing";
import { JoinCallLink } from "~/features/assessment-calls/ui/coach/join-call-link";

import { CallListPager } from "./call-list-pager";
import { SortControl } from "./sort-control";
import { useCallListingParams } from "./use-call-listing-params";

const SEARCH_FIELD_ID = "assessment-call-search";

const STATUS_TABS: readonly { label: string; status: CoachCallStatus }[] = [
  { label: "All", status: "all" },
  { label: "Today", status: "today" },
  { label: "Upcoming", status: "upcoming" },
  { label: "Past", status: "past" },
];

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
    chooseSortKey,
    chooseStatus,
    page,
    pathForPage,
    query,
    sort,
    status,
    toggleSortDirection,
  } = useCallListingParams();
  const selection: ListingSelection = { query, status };
  const classified = classifyCalls(calls, { now, timeZone });
  const matching = orderCallsBy(filterCalls(classified, selection), sort);
  const view = pageOfCalls(matching, { page, size: PAGE_SIZE });
  const emptyCopy = emptyListingCopy(selection);

  const clearFilters = () => changeQuery("");

  return (
    <div
      className={cn(cardVariants({ variant: "portal-panel" }), "p-5 sm:p-8")}
      data-parity-root="AssessmentCallsSection"
    >
      <Tabs
        className="w-full"
        onValueChange={chooseStatus}
        value={status}
        variant="segmented"
      >
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="grid w-full gap-3 sm:w-fit sm:max-w-full">
            <TabsList aria-label="When">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.status} value={tab.status}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
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

        <TabsContent value={status}>
          <CallResults
            emptyCopy={emptyCopy}
            moment={{ now, timeZone }}
            onClearFilters={
              hasSearchQuery(selection) ? clearFilters : undefined
            }
            pathForPage={pathForPage}
            view={view}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type CallResultsProps = {
  emptyCopy: EmptyListingCopy;
  moment: ListingMoment;
  onClearFilters?: () => void;
  pathForPage: (page: number) => string;
  view: CallPageView;
};

function CallResults({
  emptyCopy,
  moment,
  onClearFilters,
  pathForPage,
  view,
}: CallResultsProps) {
  if (view.calls.length === 0) {
    return (
      <EmptyState
        action={
          onClearFilters && (
            <Button onClick={onClearFilters} size="sm" variant="outline">
              Clear filters
            </Button>
          )
        }
        description={emptyCopy.description}
        icon={CalendarSearch}
        title={emptyCopy.title}
      />
    );
  }

  return (
    <>
      <CallList calls={view.calls} moment={moment} />

      {view.pageCount > 1 && (
        <CallListPager pathForPage={pathForPage} view={view} />
      )}
    </>
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
          <JoinCallLink
            joinPath={call.joinPath}
            tone={call.isToday ? "live" : "default"}
          />
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
          {call.timing === "past" && <Badge tone="muted">Call held</Badge>}
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
