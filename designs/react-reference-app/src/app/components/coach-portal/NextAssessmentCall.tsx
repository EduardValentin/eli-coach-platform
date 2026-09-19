import { ArrowRight, Video } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import type { PrototypeBooking } from '../../services/assessmentCallService';
import {
  classifyCalls,
  nextCall,
  type ClassifiedCall,
} from '../../utils/assessmentCallListing';
import { formatCallSchedule, nameTimeZone } from '../../utils/dateFormatters';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { CALL_CARD_CLASS, UPCOMING_CALL_TONE } from './assessmentCallCard';
import { JoinCallLink } from './JoinCallLink';

const ALL_CALLS_PATH = '/coach/assessment-calls';

function NextCallCard({
  call,
  timeZone,
}: {
  call: ClassifiedCall;
  timeZone: string;
}) {
  const { booking, isToday } = call;

  return (
    <div className={cn(CALL_CARD_CLASS, UPCOMING_CALL_TONE)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm">{booking.visitorName}</h3>
          {isToday && <Badge variant="brand-secondary">Today</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatCallSchedule(booking.startsAt, timeZone)}
        </p>
      </div>
      <JoinCallLink joinPath={booking.joinPath} />
    </div>
  );
}

export function NextAssessmentCall({
  bookings,
  now,
  timeZone,
}: {
  bookings: PrototypeBooking[];
  now: Date;
  timeZone: string;
}) {
  const call = nextCall(classifyCalls(bookings, { now, timeZone }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card p-8 rounded-panel shadow-soft border border-border/50"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-brand-secondary-soft text-brand-secondary flex items-center justify-center">
          <Video aria-hidden="true" size={20} />
        </div>
        <h2 className="font-serif text-xl text-foreground font-semibold">
          Next call
        </h2>
      </div>

      <p className="text-xs text-muted-foreground mb-6">
        Times in {nameTimeZone(timeZone, now)}
      </p>

      {call ? (
        <NextCallCard call={call} timeZone={timeZone} />
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No upcoming calls.
        </p>
      )}

      <Link
        to={ALL_CALLS_PATH}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        View all calls
        <ArrowRight aria-hidden="true" size={16} />
      </Link>
    </motion.div>
  );
}
