import { motion } from 'motion/react';
import { useSearchParams } from 'react-router';
import type { PrototypeBooking } from '../../services/assessmentCallService';
import {
  classifyCalls,
  filterCalls,
  orderCalls,
  parseStatus,
  type AssessmentCallStatus,
  type ClassifiedCall,
} from '../../utils/assessmentCallListing';
import { formatCallSchedule } from '../../utils/dateFormatters';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { cn } from '../ui/utils';
import {
  CALL_CARD_CLASS,
  CALL_ROW_HOVER,
  PAST_CALL_TONE,
  UPCOMING_CALL_TONE,
} from './assessmentCallCard';
import { JoinCallLink } from './JoinCallLink';

const STATUS_PARAM = 'status';
const QUERY_PARAM = 'q';
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

  return (
    <li
      className={cn(CALL_CARD_CLASS, {
        [UPCOMING_CALL_TONE]: timing === 'upcoming',
        [CALL_ROW_HOVER]: timing === 'upcoming',
        [PAST_CALL_TONE]: timing === 'past',
      })}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-semibold text-sm">{booking.visitorName}</h2>
          {isToday && <Badge variant="brand-secondary">Today</Badge>}
        </div>
        <a
          href={`mailto:${booking.visitorEmail}`}
          className="mt-1 inline-block text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          {booking.visitorEmail}
        </a>
        <p className="text-xs text-muted-foreground mt-1">
          {formatCallSchedule(booking.startsAt, timeZone)}
        </p>
        {booking.notes.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line">
            {booking.notes}
          </p>
        )}
      </div>
      {timing === 'upcoming' && <JoinCallLink joinPath={booking.joinPath} />}
    </li>
  );
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
    <ul className="space-y-4">
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
  const [searchParams, setSearchParams] = useSearchParams();
  const status = parseStatus(searchParams.get(STATUS_PARAM));
  const query = searchParams.get(QUERY_PARAM) ?? '';
  const calls = orderCalls(classifyCalls(bookings, { now, timeZone }));

  const updateSearchParams = (edit: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    edit(next);
    setSearchParams(next, { replace: true });
  };

  const chooseStatus = (value: string) => {
    const chosen = parseStatus(value);
    updateSearchParams((params) => {
      if (chosen === DEFAULT_STATUS) params.delete(STATUS_PARAM);
      else params.set(STATUS_PARAM, chosen);
    });
  };

  const changeQuery = (value: string) => {
    updateSearchParams((params) => {
      if (value.length === 0) params.delete(QUERY_PARAM);
      else params.set(QUERY_PARAM, value);
    });
  };

  const emptyMessageFor = (tabStatus: AssessmentCallStatus) =>
    query.trim().length > 0 ? NO_MATCH_MESSAGE : EMPTY_MESSAGES[tabStatus];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card p-8 rounded-panel shadow-soft border border-border/50"
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

        {STATUS_TABS.map((tab) => (
          <TabsContent
            key={tab.status}
            variant="segmented"
            value={tab.status}
          >
            <CallList
              calls={filterCalls(calls, { status: tab.status, query })}
              emptyMessage={emptyMessageFor(tab.status)}
              timeZone={timeZone}
            />
          </TabsContent>
        ))}
      </Tabs>
    </motion.div>
  );
}
