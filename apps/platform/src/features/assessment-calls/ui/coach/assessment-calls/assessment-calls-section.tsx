import {
  AppointmentCard,
  type AppointmentDetail,
} from "@eli-coach-platform/ui/appointments";
import { DateRangeField } from "@eli-coach-platform/ui/calendar";
import { cn } from "@eli-coach-platform/ui/lib";
import {
  Badge,
  cardVariants,
  Input,
  Label,
} from "@eli-coach-platform/ui/primitives";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@eli-coach-platform/ui/tabs";
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
  { label: "Upcoming", status: "upcoming" },
  { label: "Today", status: "today" },
  { label: "Past", status: "past" },
  { label: "Custom", status: "custom" },
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
  const matching = orderCallsBy(
    filterCalls(classifyCalls(calls, { now, timeZone }), selection),
    sort,
    status,
  );
  const view = pageOfCalls(matching, { page, size: PAGE_SIZE });

  return (
    <div
      className={cn(cardVariants({ variant: "portal-panel" }), "p-5 sm:p-8")}
      data-parity-root="AssessmentCallsSection"
    >
      <Tabs className="w-full" onValueChange={chooseStatus} value={status}>
        <div className="mb-6 grid w-fit max-w-full gap-4 xl:flex xl:w-full xl:items-start xl:justify-between xl:gap-8">
          <div className="flex max-w-full flex-col gap-2 xl:w-fit">
            <TabsList aria-label="When">
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.status} value={tab.status}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {status === "custom" && (
              <DateRangeField
                aria-label="Date range"
                className="w-full"
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

          <div className="w-full xl:min-w-0 xl:flex-1">
            <Label className="sr-only" htmlFor={SEARCH_FIELD_ID}>
              Search calls
            </Label>
            <Input
              id={SEARCH_FIELD_ID}
              onChange={(event) => changeQuery(event.target.value)}
              placeholder="Search by name or email"
              type="search"
              value={query}
            />
          </div>

          <SortControl
            onChooseKey={chooseSortKey}
            onToggleDirection={toggleSortDirection}
            sort={sort}
          />
        </div>

        <TabsContent value={status}>
          <CallList
            calls={view.calls}
            emptyMessage={emptyListingMessage(selection)}
            moment={{ now, timeZone }}
          />

          {view.pageCount > 1 && (
            <CallListPager pathForPage={pathForPage} view={view} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CallList(props: {
  calls: readonly ClassifiedCall[];
  emptyMessage: string;
  moment: ListingMoment;
}) {
  const { calls, emptyMessage, moment } = props;

  if (calls.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-text-muted">{emptyMessage}</p>
    );
  }

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
        call.timing === "upcoming" ? (
          <JoinCallLink joinPath={call.joinPath} />
        ) : (
          <Badge tone="muted">Past</Badge>
        )
      }
      attendee={{
        email: call.visitorEmail,
        name: call.fullName,
        phone: call.phone ?? undefined,
      }}
      badges={call.isToday && <Badge tone="brand-secondary">Today</Badge>}
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
