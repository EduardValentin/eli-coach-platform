import {
  AppointmentCard,
  type AppointmentDetail,
} from "~/shared/design-system/appointments";
import {
  ListPager,
  ListingToolbar,
  SortControl,
  type SortOption,
} from "~/shared/design-system/filters";
import {
  cn,
  pageOf,
  type ListPage,
  type SortChoice,
  type SortDirection,
} from "~/shared/design-system/lib";
import { EmptyState } from "~/shared/design-system/portal";
import {
  Badge,
  Button,
  cardVariants,
  SearchField,
} from "~/shared/design-system/primitives";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/shared/design-system/tabs";
import { CalendarSearch } from "lucide-react";
import type { ReactNode } from "react";
import type { CoachAssessmentCall } from "~/bounded-contexts/scheduling/assessment-calls/public/assessment-calls";
import {
  formatClockTime,
  formatShortDay,
} from "~/shared/time-format/call-moment";
import { findCountry } from "~/shared/contact/countries";
import {
  formatAgeForCard,
  labelForGender,
  labelForPrimaryGoal,
} from "~/bounded-contexts/scheduling/assessment-calls/public/visitor-profile";
import {
  CALL_SORT_RULE,
  classifyCalls,
  emptyListingCopy,
  filterCalls,
  hasActiveFilters,
  isEndedCall,
  orderCallsBy,
  PAGE_SIZE,
  SORT_KEYS,
  type ClassifiedCall,
  type CoachCallWhen,
  type EmptyListingCopy,
  type ListingMoment,
  type ListingSelection,
  type SortKey,
} from "~/bounded-contexts/scheduling/assessment-calls/ui/coach/assessment-call-listing";
import { JoinCallLink } from "~/bounded-contexts/scheduling/assessment-calls/ui/coach/join-call-link";

import { useCallListingParams } from "./use-call-listing-params";

const WHEN_TABS: readonly { label: string; when: CoachCallWhen }[] = [
  { label: "All", when: "all" },
  { label: "Today", when: "today" },
  { label: "Upcoming", when: "upcoming" },
  { label: "Past", when: "past" },
];

const SORT_KEY_LABELS: Record<SortKey, string> = {
  booked: "Booking date",
  email: "Email",
  name: "Name",
  scheduled: "Scheduled date",
};

const TEXT_DIRECTION_LABELS: Record<SortDirection, string> = {
  asc: "A to Z",
  desc: "Z to A",
};

const SORT_PRESENTATION: Record<
  SortKey,
  Pick<SortOption<SortKey>, "directionLabels" | "order">
> = {
  booked: {
    directionLabels: { asc: "Oldest first", desc: "Newest first" },
    order: "chronological",
  },
  email: { directionLabels: TEXT_DIRECTION_LABELS, order: "alphabetical" },
  name: { directionLabels: TEXT_DIRECTION_LABELS, order: "alphabetical" },
  scheduled: {
    directionLabels: { asc: "Latest first", desc: "Soonest first" },
    order: "chronological",
  },
};

const SORT_OPTIONS: readonly SortOption<SortKey>[] = SORT_KEYS.map((key) => ({
  ...SORT_PRESENTATION[key],
  defaultDirection: CALL_SORT_RULE.defaultDirection[key],
  key,
  label: SORT_KEY_LABELS[key],
}));

export type ToolbarFilter = {
  control: (scopedCalls: readonly ClassifiedCall[]) => ReactNode;
  isActive: boolean;
  label: string;
  matches: (call: ClassifiedCall) => boolean;
  params: readonly string[];
};

export type EndedCallExtras = { action?: ReactNode; badge?: ReactNode };

type RenderEndedCallExtras = (call: ClassifiedCall) => EndedCallExtras;

type ExtraDetails = (call: ClassifiedCall) => AppointmentDetail[];

type AssessmentCallsSectionProps = {
  calls: readonly CoachAssessmentCall[];
  extraDetails?: ExtraDetails;
  now: Date;
  renderEndedCallExtras?: RenderEndedCallExtras;
  timeZone: string;
  toolbarFilter?: ToolbarFilter;
};

export function AssessmentCallsSection({
  calls,
  extraDetails,
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
  const view = pageOf(orderCallsBy(filtered, sort), {
    page,
    perPage: PAGE_SIZE,
  });
  const emptyCopy = emptyListingCopy(selection, toolbarFilter);
  const changeSort = (next: SortChoice<SortKey>) => {
    if (next.key !== sort.key) {
      chooseSortKey(next.key);
      return;
    }
    if (next.direction !== sort.direction) toggleSortDirection();
  };
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
        <ListingToolbar
          filters={toolbarFilter?.control(scoped)}
          search={
            <>
              <SearchField
                aria-label="Search calls"
                className="w-full sm:w-72"
                onChange={(event) => changeQuery(event.target.value)}
                placeholder="Search by name or email"
                size="sm"
                value={query}
              />
              <SortControl
                onChange={changeSort}
                options={SORT_OPTIONS}
                sort={sort}
              />
            </>
          }
          view={
            <TabsList aria-label="When">
              {WHEN_TABS.map((tab) => (
                <TabsTrigger key={tab.when} value={tab.when}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          }
        />

        <TabsContent value={when}>
          <CallResults
            emptyCopy={emptyCopy}
            extraDetails={extraDetails}
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

type CallResultsProps = CallRowProps & {
  emptyCopy: EmptyListingCopy;
  onClearFilters?: () => void;
  pathForPage: (page: number) => string;
  view: ListPage<ClassifiedCall>;
};

function CallResults({
  emptyCopy,
  onClearFilters,
  pathForPage,
  view,
  ...row
}: CallResultsProps) {
  if (view.items.length === 0) {
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
      <CallList calls={view.items} {...row} />

      {view.pageCount > 1 && (
        <ListPager pathForPage={pathForPage} view={view} />
      )}
    </>
  );
}

type CallRowProps = {
  extraDetails?: ExtraDetails;
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
  const { call, extraDetails, moment, renderEndedCallExtras } = props;
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
      details={[
        ...visitorDetails(call, moment),
        ...(extraDetails?.(call) ?? []),
      ]}
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
