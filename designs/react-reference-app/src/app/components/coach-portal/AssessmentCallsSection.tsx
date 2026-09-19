import { Video } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useSearchParams } from 'react-router';
import type { PrototypeBooking } from '../../services/assessmentCallService';
import {
  classifyCalls,
  filterCalls,
  orderCalls,
  parseStatus,
  type AssessmentCallStatus,
  type ClassifiedCall,
} from '../../utils/assessmentCallListing';
import { formatCallSchedule, nameTimeZone } from '../../utils/dateFormatters';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { cn } from '../ui/utils';
import { buttonVariants } from '../ThemeButton';

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

const JOIN_LINK_CLASS = buttonVariants({
  variant: 'inverted',
  size: 'xs',
  textSize: 'sm',
  weight: 'semibold',
});

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
      className={cn(
        'flex items-start justify-between gap-4 p-4 rounded-card border border-border transition-all',
        {
          'bg-muted/50 hover:bg-card hover:shadow-card': timing === 'upcoming',
          'bg-muted text-muted-foreground': timing === 'past',
        },
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm">{booking.visitorName}</h3>
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
      {timing === 'upcoming' && (
        <Link to={booking.joinPath} className={JOIN_LINK_CLASS}>
          Join call
        </Link>
      )}
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
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-brand-secondary-soft text-brand-secondary flex items-center justify-center">
          <Video size={20} />
        </div>
        <h2 className="font-serif text-xl text-foreground font-semibold">
          Assessment calls
        </h2>
      </div>

      <p className="text-xs text-muted-foreground mb-6">
        Times in {nameTimeZone(timeZone, now)}
      </p>

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
