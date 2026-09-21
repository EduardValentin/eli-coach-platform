import { motion, useReducedMotion } from 'motion/react';
import { useLocation, useSearchParams } from 'react-router';
import type { PrototypeBooking } from '../../services/assessmentCallService';
import {
  classifyCalls,
  countsByJourneyStep,
  emptyListingMessage,
  filterCalls,
  orderCallsFor,
  pageOfCalls,
  parseDateRange,
  parseJourneyStep,
  parsePage,
  parseStatus,
  withJourneyStages,
  type AssessmentCallStatus,
  type ClassifiedCall,
  type JourneyStep,
  type ListedCall,
  type ListingSelection,
} from '../../utils/assessmentCallListing';
import { formatShortDay, formatSlotTime } from '../../utils/dateFormatters';
import { Badge } from '../ui/badge';
import { DateRangeField, type IsoDateRange } from '../DateRangeField';
import { FilterChip, FilterChipGroup } from '../FilterChipGroup';
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

const STATUS_PARAM = 'when';
const QUERY_PARAM = 'q';
const PAGE_PARAM = 'page';
const JOURNEY_PARAM = 'status';
const FROM_PARAM = 'from';
const TO_PARAM = 'to';
const CALLS_PER_PAGE = 10;
const DEFAULT_STATUS: AssessmentCallStatus = 'all';
const DEFAULT_JOURNEY: JourneyStep = 'any';
const SEARCH_FIELD_ID = 'assessment-call-search';

const WHEN_TABS: { status: AssessmentCallStatus; label: string }[] = [
  { status: 'all', label: 'All' },
  { status: 'upcoming', label: 'Upcoming' },
  { status: 'today', label: 'Today' },
  { status: 'past', label: 'Past' },
  { status: 'custom', label: 'Custom' },
];

const JOURNEY_CHIPS: { step: JourneyStep; label: string }[] = [
  { step: 'any', label: 'Any' },
  { step: 'payment-link-sent', label: 'Payment link sent' },
  { step: 'paid', label: 'Paid' },
  { step: 'invited', label: 'Invited' },
];

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

function JourneyFilter({
  counts,
  journey,
  onChoose,
}: {
  counts: Record<JourneyStep, number>;
  journey: JourneyStep;
  onChoose: (step: JourneyStep) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-text-secondary">Status</span>
      <FilterChipGroup
        aria-label="Status"
        value={journey}
        onValueChange={(value) => onChoose(parseJourneyStep(value))}
      >
        {JOURNEY_CHIPS.map((chip) => (
          <FilterChip key={chip.step} value={chip.step}>
            {chip.label}{' '}
            <span className="ml-2 text-xs tabular-nums">
              {counts[chip.step]}
            </span>
          </FilterChip>
        ))}
      </FilterChipGroup>
    </div>
  );
}

function CustomRangeFilter({
  range,
  onChoose,
}: {
  range: IsoDateRange;
  onChoose: (range: IsoDateRange) => void;
}) {
  return (
    <DateRangeField
      aria-label="Date range"
      className="w-full"
      value={range}
      onChange={onChoose}
    />
  );
}

function writeDay(params: URLSearchParams, key: string, day: string | null) {
  if (day === null) params.delete(key);
  else params.set(key, day);
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
  const { journeyForCall } = useClientJourneys();

  const status = parseStatus(searchParams.get(STATUS_PARAM));
  const query = searchParams.get(QUERY_PARAM) ?? '';
  const journey = parseJourneyStep(searchParams.get(JOURNEY_PARAM));
  const range = parseDateRange(
    searchParams.get(FROM_PARAM),
    searchParams.get(TO_PARAM),
  );
  const page = parsePage(searchParams.get(PAGE_PARAM));

  const selection: ListingSelection = { status, query, journey, range };
  const calls: ListedCall[] = withJourneyStages(
    classifyCalls(bookings, { now, timeZone }),
    (callId) => journeyForCall(callId)?.stage ?? null,
  );
  const matching = orderCallsFor(filterCalls(calls, selection), status);
  const view = pageOfCalls(matching, { page, perPage: CALLS_PER_PAGE });
  const counts = countsByJourneyStep(calls, selection);

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

  const chooseJourney = (chosen: JourneyStep) => {
    updateSearchParams((params) => {
      params.delete(PAGE_PARAM);
      if (chosen === DEFAULT_JOURNEY) params.delete(JOURNEY_PARAM);
      else params.set(JOURNEY_PARAM, chosen);
    });
  };

  const chooseRange = (chosen: IsoDateRange) => {
    updateSearchParams((params) => {
      params.delete(PAGE_PARAM);
      writeDay(params, FROM_PARAM, chosen.from);
      writeDay(params, TO_PARAM, chosen.to);
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

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : undefined}
      className="bg-card p-5 sm:p-8 rounded-panel shadow-soft border border-border/50"
    >
      <Tabs value={status} onValueChange={chooseStatus} className="w-full">
        <div className="mb-6 flex flex-col gap-5">
          <div className="grid w-fit max-w-full gap-4 xl:flex xl:w-full xl:items-start xl:justify-between xl:gap-8">
            <div className="flex max-w-full flex-col gap-2 xl:w-fit">
              <TabsList aria-label="When" variant="segmented">
                {WHEN_TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.status}
                    variant="segmented"
                    value={tab.status}
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {status === 'custom' && (
                <CustomRangeFilter range={range} onChoose={chooseRange} />
              )}
            </div>

            <div className="w-full xl:min-w-0 xl:flex-1">
              <Label className="sr-only" htmlFor={SEARCH_FIELD_ID}>
                Search calls
              </Label>
              <Input
                id={SEARCH_FIELD_ID}
                type="search"
                placeholder="Search by name or email"
                value={query}
                onChange={(event) => changeQuery(event.target.value)}
              />
            </div>
          </div>

          <JourneyFilter
            counts={counts}
            journey={journey}
            onChoose={chooseJourney}
          />
        </div>

        <TabsContent variant="segmented" value={status}>
          <CallList
            calls={view.calls}
            emptyMessage={emptyListingMessage(selection)}
            timeZone={timeZone}
          />

          {view.pageCount > 1 && (
            <CallListPager view={view} pathForPage={pathForPage} />
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
