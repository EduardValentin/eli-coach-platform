import { motion, useReducedMotion } from 'motion/react';
import { useLocation, useSearchParams } from 'react-router';
import type { PrototypeBooking } from '../../services/assessmentCallService';
import {
  classifyCalls,
  filterCalls,
  orderCalls,
  pageOfCalls,
  parsePage,
  parseStatus,
  type AssessmentCallStatus,
  type ClassifiedCall,
} from '../../utils/assessmentCallListing';
import { formatShortDay, formatSlotTime } from '../../utils/dateFormatters';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import type { JourneyStage } from '../../domain/journey';
import { AppointmentCard } from './AppointmentCard';
import { CallJourneyActions } from './CallJourneyActions';
import { JourneyStageBadge } from './JourneyStageBadge';
import { CallListPager } from './CallListPager';
import { JoinCallLink } from './JoinCallLink';

const STATUS_PARAM = 'status';
const QUERY_PARAM = 'q';
const PAGE_PARAM = 'page';
const CALLS_PER_PAGE = 10;
const DEFAULT_STATUS: AssessmentCallStatus = 'upcoming';
const SEARCH_FIELD_ID = 'assessment-call-search';
const NO_MATCH_MESSAGE = 'No calls match your search.';

const STATUS_TABS: { status: AssessmentCallStatus; label: string }[] = [
  { status: 'upcoming', label: 'Upcoming' },
  { status: 'today', label: 'Today' },
  { status: 'past', label: 'Past' },
  { status: 'all', label: 'All' },
];

const EMPTY_MESSAGES: Record<AssessmentCallStatus, string> = {
  upcoming: 'No upcoming calls.',
  today: 'No calls today.',
  past: 'No past calls.',
  all: 'No calls yet.',
};

function CallItem({
  call,
  timeZone,
}: {
  call: ClassifiedCall;
  timeZone: string;
}) {
  const { booking, timing, isToday } = call;
  const { journeyForCall } = useClientJourneys();
  const journey = journeyForCall(booking.id);

  return (
    <li>
      <AppointmentCard
        attendee={{
          name: booking.visitorName,
          email: booking.visitorEmail,
        }}
        when={{
          date: formatShortDay(booking.startsAt, timeZone),
          time: formatSlotTime(booking.startsAt, timeZone),
        }}
        status={timing === 'past' ? 'past' : 'scheduled'}
        titleElement="h2"
        badges={
          <>
            {isToday && <Badge variant="brand-secondary">Today</Badge>}
            {journey && showsJourneyStage(journey.stage, timing) && (
              <JourneyStageBadge stage={journey.stage} />
            )}
          </>
        }
        quote={booking.notes.length > 0 ? booking.notes : undefined}
        actions={
          <>
            {timing === 'upcoming' && (
              <JoinCallLink joinPath={booking.joinPath} />
            )}
            {journey && timing === 'past' && (
              <CallJourneyActions
                journey={journey}
                visitorName={booking.visitorName}
              />
            )}
          </>
        }
      />
    </li>
  );
}

function showsJourneyStage(
  stage: JourneyStage,
  timing: ClassifiedCall['timing'],
) {
  return stage !== 'held' || timing === 'past';
}

function CallList({
  calls,
  emptyMessage,
  timeZone,
}: {
  calls: ClassifiedCall[];
  emptyMessage: string;
  timeZone: string;
}) {
  if (calls.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul aria-label="Assessment calls" className="space-y-4">
      {calls.map((call) => (
        <CallItem key={call.booking.id} call={call} timeZone={timeZone} />
      ))}
    </ul>
  );
}

export function AssessmentCallsSection({
  bookings,
  now,
  timeZone,
}: {
  bookings: PrototypeBooking[];
  now: Date;
  timeZone: string;
}) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = parseStatus(searchParams.get(STATUS_PARAM));
  const query = searchParams.get(QUERY_PARAM) ?? '';
  const page = parsePage(searchParams.get(PAGE_PARAM));
  const calls = orderCalls(classifyCalls(bookings, { now, timeZone }));

  const updateSearchParams = (edit: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    edit(next);
    setSearchParams(next, { replace: true });
  };

  const chooseStatus = (value: string) => {
    const chosen = parseStatus(value);
    updateSearchParams((params) => {
      params.delete(PAGE_PARAM);
      if (chosen === DEFAULT_STATUS) params.delete(STATUS_PARAM);
      else params.set(STATUS_PARAM, chosen);
    });
  };

  const changeQuery = (value: string) => {
    updateSearchParams((params) => {
      params.delete(PAGE_PARAM);
      if (value.length === 0) params.delete(QUERY_PARAM);
      else params.set(QUERY_PARAM, value);
    });
  };

  const writePage = (params: URLSearchParams, chosen: number) => {
    if (chosen === 1) params.delete(PAGE_PARAM);
    else params.set(PAGE_PARAM, String(chosen));
  };

  const pathForPage = (chosen: number) => {
    const params = new URLSearchParams(searchParams);
    writePage(params, chosen);
    const search = params.toString();
    return search.length > 0 ? `${pathname}?${search}` : pathname;
  };

  const emptyMessageFor = (tabStatus: AssessmentCallStatus) =>
    query.trim().length > 0 ? NO_MATCH_MESSAGE : EMPTY_MESSAGES[tabStatus];

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : undefined}
      className="bg-card p-5 sm:p-8 rounded-panel shadow-soft border border-border/50"
    >
      <div className="space-y-2 mb-6">
        <Label htmlFor={SEARCH_FIELD_ID}>Search calls</Label>
        <Input
          id={SEARCH_FIELD_ID}
          type="search"
          placeholder="Name or email"
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
        />
      </div>

      <Tabs value={status} onValueChange={chooseStatus} className="w-full">
        <TabsList variant="segmented" className="mb-6">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger
              key={tab.status}
              variant="segmented"
              value={tab.status}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((tab) => {
          const matching = filterCalls(calls, { status: tab.status, query });
          const view = pageOfCalls(matching, { page, perPage: CALLS_PER_PAGE });

          return (
            <TabsContent
              key={tab.status}
              variant="segmented"
              value={tab.status}
            >
              <CallList
                calls={view.calls}
                emptyMessage={emptyMessageFor(tab.status)}
                timeZone={timeZone}
              />

              {view.pageCount > 1 && (
                <CallListPager view={view} pathForPage={pathForPage} />
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </motion.div>
  );
}
