import { AppointmentCard } from "@eli-coach-platform/ui/appointments";
import { cn, useSearchParamsWriter } from "@eli-coach-platform/ui/lib";
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
import { useLocation } from "react-router";

import type { CoachAssessmentCall } from "~/features/assessment-calls/contracts/assessment-calls";
import {
  formatClockTime,
  formatShortDay,
} from "~/features/assessment-calls/contracts/call-moment";
import {
  classifyCalls,
  filterCalls,
  orderCalls,
  pageOfCalls,
  parsePageParam,
  parseStatusParam,
  PAGE_PARAM,
  PAGE_SIZE,
  QUERY_PARAM,
  STATUS_PARAM,
  type ClassifiedCall,
  type CoachCallStatus,
} from "~/features/assessment-calls/ui/coach/assessment-call-listing";
import { JoinCallLink } from "~/features/assessment-calls/ui/coach/join-call-link";

import { CallListPager } from "./call-list-pager";

const SEARCH_FIELD_ID = "assessment-call-search";
const DEFAULT_STATUS: CoachCallStatus = "upcoming";
const FIRST_PAGE = 1;
const NO_MATCH_MESSAGE = "No calls match your search.";

const STATUS_TABS: readonly { label: string; status: CoachCallStatus }[] = [
  { label: "Upcoming", status: "upcoming" },
  { label: "Today", status: "today" },
  { label: "Past", status: "past" },
  { label: "All", status: "all" },
];

const EMPTY_MESSAGES: Record<CoachCallStatus, string> = {
  all: "No calls yet.",
  past: "No past calls.",
  today: "No calls today.",
  upcoming: "No upcoming calls.",
};

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
  const { pathname } = useLocation();
  const { replaceSearchParams, searchParams } = useSearchParamsWriter();
  const status = parseStatusParam(searchParams.get(STATUS_PARAM));
  const query = searchParams.get(QUERY_PARAM) ?? "";
  const page = parsePageParam(searchParams.get(PAGE_PARAM));
  const classified = orderCalls(classifyCalls(calls, { now, timeZone }));

  const chooseStatus = (value: string) => {
    const chosen = parseStatusParam(value);

    replaceSearchParams((params) => {
      params.delete(PAGE_PARAM);

      if (chosen === DEFAULT_STATUS) {
        params.delete(STATUS_PARAM);
      } else {
        params.set(STATUS_PARAM, chosen);
      }
    });
  };

  const changeQuery = (value: string) => {
    replaceSearchParams((params) => {
      params.delete(PAGE_PARAM);

      if (value.length === 0) {
        params.delete(QUERY_PARAM);
      } else {
        params.set(QUERY_PARAM, value);
      }
    });
  };

  const pathForPage = (chosen: number) => {
    const params = new URLSearchParams(searchParams);

    if (chosen === FIRST_PAGE) {
      params.delete(PAGE_PARAM);
    } else {
      params.set(PAGE_PARAM, String(chosen));
    }

    const search = params.toString();

    return search.length > 0 ? `${pathname}?${search}` : pathname;
  };

  const emptyMessageFor = (tabStatus: CoachCallStatus) =>
    query.trim().length > 0 ? NO_MATCH_MESSAGE : EMPTY_MESSAGES[tabStatus];

  return (
    <div
      className={cn(cardVariants({ variant: "portal-panel" }), "p-5 sm:p-8")}
      data-parity-root="AssessmentCallsSection"
    >
      <div className="mb-6 space-y-2">
        <Label htmlFor={SEARCH_FIELD_ID}>Search calls</Label>
        <Input
          id={SEARCH_FIELD_ID}
          onChange={(event) => changeQuery(event.target.value)}
          placeholder="Name or email"
          type="search"
          value={query}
        />
      </div>

      <Tabs className="w-full" onValueChange={chooseStatus} value={status}>
        <TabsList className="mb-6">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.status} value={tab.status}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((tab) => {
          const matching = filterCalls(classified, {
            query,
            status: tab.status,
          });
          const view = pageOfCalls(matching, { page, size: PAGE_SIZE });

          return (
            <TabsContent key={tab.status} value={tab.status}>
              <CallList
                calls={view.calls}
                emptyMessage={emptyMessageFor(tab.status)}
                timeZone={timeZone}
              />

              {view.pageCount > 1 && (
                <CallListPager pathForPage={pathForPage} view={view} />
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function CallList(props: {
  calls: readonly ClassifiedCall[];
  emptyMessage: string;
  timeZone: string;
}) {
  const { calls, emptyMessage, timeZone } = props;

  if (calls.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-text-muted">{emptyMessage}</p>
    );
  }

  return (
    <ul aria-label="Assessment calls" className="space-y-4">
      {calls.map((call) => (
        <li key={call.call.id}>
          <CallCard call={call} timeZone={timeZone} />
        </li>
      ))}
    </ul>
  );
}

function CallCard(props: { call: ClassifiedCall; timeZone: string }) {
  const { call, isToday, timing } = props.call;
  const startsAt = new Date(call.startsAt);

  return (
    <AppointmentCard
      actions={
        timing === "upcoming" ? (
          <JoinCallLink joinPath={call.joinPath} />
        ) : (
          <Badge tone="neutral">Past</Badge>
        )
      }
      attendee={{ email: call.visitorEmail, name: call.visitorName }}
      badges={isToday && <Badge tone="accent">Today</Badge>}
      quote={call.visitorNotes ?? undefined}
      status={timing === "past" ? "past" : "scheduled"}
      titleElement="h2"
      when={{
        date: formatShortDay(startsAt, props.timeZone),
        time: formatClockTime(startsAt, props.timeZone),
      }}
    />
  );
}
