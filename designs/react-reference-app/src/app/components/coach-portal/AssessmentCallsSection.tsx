import { CalendarSearch } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useLocation, useSearchParams } from 'react-router';
import {
  visitorFullName,
  type PrototypeBooking,
} from '../../services/assessmentCallService';
import { findCountry } from '../../services/countries';
import {
  formatAgeForCard,
  labelForGender,
  labelForPrimaryGoal,
} from '../../services/visitorProfile';
import type { AppointmentDetail } from './appointment';
import {
  classifyCalls,
  countsByJourneyStep,
  defaultDirectionFor,
  emptyListingMessage,
  filterCalls,
  hasActiveFilters,
  orderCallsBy,
  pageOfCalls,
  parseJourneyStep,
  parsePage,
  parseSortDirection,
  parseSortKey,
  parseStatus,
  withJourneyStages,
  type AssessmentCallStatus,
  type CallSort,
  type ClassifiedCall,
  type JourneyStep,
  type ListedCall,
  type ListingSelection,
  type SortKey,
} from '../../utils/assessmentCallListing';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { EmptyState } from '../EmptyState';
import { SearchField } from '../SearchField';
import { useClientJourneys } from '../../context/ClientJourneyContext';
import type { JourneyStage } from '../../domain/journey';
import { AppointmentCard } from './AppointmentCard';
import { CallJourneyActions } from './CallJourneyActions';
import { CallStageBadge } from './CallStageBadge';
import { CallListPager } from './CallListPager';
import { JoinCallLink } from './JoinCallLink';
import { SortControl } from './SortControl';

const STATUS_PARAM = 'when';
const QUERY_PARAM = 'q';
const PAGE_PARAM = 'page';
const JOURNEY_PARAM = 'status';
const SORT_PARAM = 'sort';
const DIRECTION_PARAM = 'dir';
const CALLS_PER_PAGE = 10;
const DEFAULT_STATUS: AssessmentCallStatus = 'all';
const DEFAULT_JOURNEY: JourneyStep = 'any';
const DEFAULT_SORT_KEY: SortKey = 'scheduled';
const SEARCH_FIELD_ID = 'assessment-call-search';

const WHEN_TABS: { status: AssessmentCallStatus; label: string }[] = [
  { status: 'all', label: 'All' },
  { status: 'today', label: 'Today' },
  { status: 'upcoming', label: 'Upcoming' },
  { status: 'past', label: 'Past' },
];

const JOURNEY_FILTER_OPTIONS: { step: JourneyStep; label: string }[] = [
  { step: 'any', label: 'All statuses' },
  { step: 'held', label: 'Call held' },
  { step: 'payment-link-sent', label: 'Payment link sent' },
  { step: 'paid', label: 'Paid' },
];

function visitorDetails(
  booking: PrototypeBooking,
  now: Date,
): AppointmentDetail[] {
  return [
    { label: 'Age', value: formatAgeForCard(booking.dateOfBirth, now) },
    { label: 'Gender', value: labelForGender(booking.gender) },
    { label: 'Goal', value: labelForPrimaryGoal(booking.primaryGoal) },
    {
      label: 'Country',
      value: findCountry(booking.country)?.name ?? booking.country,
    },
  ];
}

function CallItem({
  call,
  now,
  timeZone,
}: {
  call: ClassifiedCall;
  now: Date;
  timeZone: string;
}) {
  const { booking, timing, isToday } = call;
  const { journeyForCall } = useClientJourneys();
  const journey = journeyForCall(booking.id);

  return (
    <li>
      <AppointmentCard
        attendee={{
          name: visitorFullName(booking),
          email: booking.visitorEmail,
          phone: booking.phone ?? undefined,
        }}
        details={visitorDetails(booking, now)}
        when={{ startsAt: booking.startsAt, timeZone }}
        status={timing === 'past' ? 'past' : 'scheduled'}
        titleElement="h2"
        badges={
          <>
            {isToday && <Badge tone="brand-secondary">Today</Badge>}
            {journey && showsJourneyStage(journey.stage, timing) && (
              <CallStageBadge stage={journey.stage} />
            )}
          </>
        }
        quote={booking.notes.length > 0 ? booking.notes : undefined}
        actions={
          <>
            {timing === 'upcoming' && (
              <JoinCallLink
                joinPath={booking.joinPath}
                tone={isToday ? 'live' : 'default'}
              />
            )}
            {journey && timing === 'past' && (
              <CallJourneyActions journey={journey} />
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
  now,
  timeZone,
}: {
  calls: ClassifiedCall[];
  now: Date;
  timeZone: string;
}) {
  return (
    <ul aria-label="Assessment calls" className="space-y-4">
      {calls.map((call) => (
        <CallItem
          key={call.booking.id}
          call={call}
          now={now}
          timeZone={timeZone}
        />
      ))}
    </ul>
  );
}

function StatusFilter({
  counts,
  journey,
  onChoose,
}: {
  counts: Record<JourneyStep, number>;
  journey: JourneyStep;
  onChoose: (step: JourneyStep) => void;
}) {
  const chosenLabel =
    JOURNEY_FILTER_OPTIONS.find((option) => option.step === journey)?.label ??
    '';

  return (
    <Select
      value={journey}
      onValueChange={(value) => onChoose(parseJourneyStep(value))}
    >
      <SelectTrigger aria-label="Status" size="sm" className="w-full">
        <SelectValue>{chosenLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {JOURNEY_FILTER_OPTIONS.map((option) => (
          <SelectItem key={option.step} value={option.step}>
            <span className="flex items-center gap-2">
              {option.label}{' '}
              <Badge tone="count">{counts[option.step]}</Badge>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function emptyCallsCopy(
  selection: ListingSelection,
  totalCalls: number,
): { title: string; description: string } {
  if (totalCalls === 0 && !hasActiveFilters(selection)) {
    return {
      title: 'No calls yet',
      description: 'Booked assessment calls appear here.',
    };
  }

  return {
    title: 'No calls found',
    description: emptyListingMessage(selection),
  };
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
  const page = parsePage(searchParams.get(PAGE_PARAM));
  const sortKey = parseSortKey(searchParams.get(SORT_PARAM));
  const sort: CallSort = {
    key: sortKey,
    direction: parseSortDirection(searchParams.get(DIRECTION_PARAM), sortKey),
  };

  const selection: ListingSelection = { status, query, journey };
  const calls: ListedCall[] = withJourneyStages(
    classifyCalls(bookings, { now, timeZone }),
    (callId) => journeyForCall(callId)?.stage ?? null,
  );
  const matching = orderCallsBy(filterCalls(calls, selection), sort);
  const view = pageOfCalls(matching, { page, perPage: CALLS_PER_PAGE });
  const counts = countsByJourneyStep(calls, selection);
  const emptyCopy = emptyCallsCopy(selection, calls.length);

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

  const chooseSort = (chosen: CallSort) => {
    updateSearchParams((params) => {
      params.delete(PAGE_PARAM);
      if (chosen.key === DEFAULT_SORT_KEY) params.delete(SORT_PARAM);
      else params.set(SORT_PARAM, chosen.key);
      if (chosen.direction === defaultDirectionFor(chosen.key)) {
        params.delete(DIRECTION_PARAM);
      } else {
        params.set(DIRECTION_PARAM, chosen.direction);
      }
    });
  };

  const changeQuery = (value: string) => {
    updateSearchParams((params) => {
      params.delete(PAGE_PARAM);
      if (value.length === 0) params.delete(QUERY_PARAM);
      else params.set(QUERY_PARAM, value);
    });
  };

  const clearFilters = () => {
    updateSearchParams((params) => {
      params.delete(STATUS_PARAM);
      params.delete(JOURNEY_PARAM);
      params.delete(QUERY_PARAM);
      params.delete(PAGE_PARAM);
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
      <Tabs
        variant="segmented"
        value={status}
        onValueChange={chooseStatus}
        className="w-full"
      >
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="grid w-full gap-3 sm:w-fit sm:max-w-full">
            <TabsList aria-label="When">
              {WHEN_TABS.map((tab) => (
                <TabsTrigger key={tab.status} value={tab.status}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <StatusFilter
              counts={counts}
              journey={journey}
              onChoose={chooseJourney}
            />
          </div>

          <div className="grid w-full gap-3 sm:w-fit sm:max-w-full">
            <SearchField
              id={SEARCH_FIELD_ID}
              aria-label="Search calls"
              placeholder="Search by name or email"
              size="sm"
              className="w-full sm:w-72"
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
            />
            <SortControl sort={sort} onChange={chooseSort} />
          </div>
        </div>

        <TabsContent value={status}>
          {view.calls.length === 0 ? (
            <EmptyState
              icon={CalendarSearch}
              title={emptyCopy.title}
              description={emptyCopy.description}
              action={
                hasActiveFilters(selection) ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <CallList calls={view.calls} now={now} timeZone={timeZone} />

              {view.pageCount > 1 && (
                <CallListPager view={view} pathForPage={pathForPage} />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
