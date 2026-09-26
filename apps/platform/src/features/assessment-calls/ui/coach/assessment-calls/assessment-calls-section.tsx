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
  SearchField,
} from "@eli-coach-platform/ui/primitives";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@eli-coach-platform/ui/tabs";
import { CalendarSearch } from "lucide-react";
import type { ReactNode } from "react";
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
  hasActiveFilters,
  isEndedCall,
  orderCallsBy,
  pageOfCalls,
  PAGE_SIZE,
  type CallPageView,
  type ClassifiedCall,
  type CoachCallWhen,
  type EmptyListingCopy,
  type ListingMoment,
  type ListingSelection,
} from "~/features/assessment-calls/ui/coach/assessment-call-listing";
import { JoinCallLink } from "~/features/assessment-calls/ui/coach/join-call-link";

import { CallListPager } from "./call-list-pager";
import { SortControl } from "./sort-control";
import { useCallListingParams } from "./use-call-listing-params";

const WHEN_TABS: readonly { label: string; when: CoachCallWhen }[] = [
  { label: "All", when: "all" },
  { label: "Today", when: "today" },
  { label: "Upcoming", when: "upcoming" },
  { label: "Past", when: "past" },
];

export type ToolbarFilter = {
  control: (scopedCalls: readonly ClassifiedCall[]) => ReactNode;
  isActive: boolean;
  label: string;
  matches: (call: ClassifiedCall) => boolean;
  params: readonly string[];
};

export type EndedCallExtras = { action?: ReactNode; badge?: ReactNode };

type RenderEndedCallExtras = (call: ClassifiedCall) => EndedCallExtras;

type AssessmentCallsSectionProps = {
  calls: readonly CoachAssessmentCall[];
  now: Date;
  renderEndedCallExtras?: RenderEndedCallExtras;
  timeZone: string;
  toolbarFilter?: ToolbarFilter;
};

export function AssessmentCallsSection({
  calls,
  now,
  renderEndedCallExtras,
  timeZone,
  toolbarFilter,
}: AssessmentCallsSectionProps) {
  const {
    changeQuery,
    chooseSortKey,
    chooseWhen,
    clearFilters,
    page,
    pathForPage,
    query,
    sort,
    toggleSortDirection,
    when,
  } = useCallListingParams();
  const selection: ListingSelection = { query, when };
  const classified = classifyCalls(calls, { now, timeZone });
  const scoped = filterCalls(classified, selection);
  const filtered = toolbarFilter
    ? scoped.filter(toolbarFilter.matches)
    : scoped;
  const view = pageOfCalls(orderCallsBy(filtered, sort), {
    page,
    size: PAGE_SIZE,
  });
  const emptyCopy = emptyListingCopy(selection, toolbarFilter);
  const canClearFilters = hasActiveFilters(selection, toolbarFilter);

  return (
    <div
      className={cn(cardVariants({ variant: "portal-panel" }), "p-5 sm:p-8")}
      data-parity-root="AssessmentCallsSection"
    >
      <Tabs
        className="w-full"
        onValueChange={chooseWhen}
        value={when}
        variant="segmented"
      >
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="grid w-full gap-3 sm:w-fit sm:max-w-full">
            <TabsList aria-label="When">
              {WHEN_TABS.map((tab) => (
                <TabsTrigger key={tab.when} value={tab.when}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {toolbarFilter?.control(scoped)}
          </div>

          <div className="grid w-full gap-3 sm:w-fit sm:max-w-full">
            <SearchField
              aria-label="Search calls"
              className="w-full sm:w-72"
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

        <TabsContent value={when}>
          <CallResults
            emptyCopy={emptyCopy}
            moment={{ now, timeZone }}
            onClearFilters={
              canClearFilters
                ? () => clearFilters(toolbarFilter?.params ?? [])
                : undefined
            }
            pathForPage={pathForPage}
            renderEndedCallExtras={renderEndedCallExtras}
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
  renderEndedCallExtras?: RenderEndedCallExtras;
  view: CallPageView;
};

function CallResults({
  emptyCopy,
  moment,
  onClearFilters,
  pathForPage,
  renderEndedCallExtras,
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
      <CallList
        calls={view.calls}
        moment={moment}
        renderEndedCallExtras={renderEndedCallExtras}
      />

      {view.pageCount > 1 && (
        <CallListPager pathForPage={pathForPage} view={view} />
      )}
    </>
  );
}

type CallRowProps = {
  moment: ListingMoment;
  renderEndedCallExtras?: RenderEndedCallExtras;
};

function CallList(props: CallRowProps & { calls: readonly ClassifiedCall[] }) {
  const { calls, ...row } = props;

  return (
    <ul aria-label="Assessment calls" className="space-y-4">
      {calls.map((call) => (
        <li data-parity-root="AppointmentCard" key={call.id}>
          <CallCard call={call} {...row} />
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

function CallCard(props: CallRowProps & { call: ClassifiedCall }) {
  const { call, moment, renderEndedCallExtras } = props;
  const { timeZone } = moment;
  const startsAt = new Date(call.startsAt);
  const extras = isEndedCall(call) ? renderEndedCallExtras?.(call) : undefined;

  return (
    <AppointmentCard
      actions={
        call.timing === "upcoming" ? (
          <JoinCallLink
            joinPath={call.joinPath}
            tone={call.isToday ? "live" : "default"}
          />
        ) : (
          extras?.action
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
          {extras?.badge}
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
