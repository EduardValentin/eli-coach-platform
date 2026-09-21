import { ArrowRight, Video } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router';
import {
  visitorFullName,
  type PrototypeBooking,
} from '../../services/assessmentCallService';
import {
  classifyCalls,
  upcomingCalls,
} from '../../utils/assessmentCallListing';
import { formatShortDay, formatSlotTime } from '../../utils/dateFormatters';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { DashboardAppointmentRow } from './DashboardAppointmentRow';
import { JoinCallLink } from './JoinCallLink';

const ALL_CALLS_PATH = '/coach/assessment-calls';

const DASHBOARD_CALL_LIMIT = 3;

export function UpcomingAssessmentCalls({
  bookings,
  now,
  timeZone,
}: {
  bookings: PrototypeBooking[];
  now: Date;
  timeZone: string;
}) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const calls = upcomingCalls(
    classifyCalls(bookings, { now, timeZone }),
    DASHBOARD_CALL_LIMIT,
  );
  const isEmpty = calls.length === 0;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : undefined}
      className="bg-card p-8 rounded-panel shadow-soft border border-border/50 flex flex-col h-full"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-brand-secondary-soft text-brand-secondary flex items-center justify-center">
          <Video aria-hidden="true" size={20} />
        </div>
        <h2 className="font-serif text-xl text-foreground font-semibold">
          Upcoming calls
        </h2>
      </div>

      <div
        className={cn('flex-1', {
          'flex items-center justify-center': isEmpty,
        })}
      >
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">No upcoming calls.</p>
        ) : (
          <ul className="space-y-4">
            {calls.map((call) => (
              <li key={call.booking.id}>
                <DashboardAppointmentRow
                  attendeeName={visitorFullName(call.booking)}
                  when={{
                    date: formatShortDay(call.booking.startsAt, timeZone),
                    time: formatSlotTime(call.booking.startsAt, timeZone),
                  }}
                  badges={
                    call.isToday && (
                      <Badge variant="brand-secondary">Today</Badge>
                    )
                  }
                  action={<JoinCallLink joinPath={call.booking.joinPath} />}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        to={ALL_CALLS_PATH}
        className="mt-auto pt-6 self-start inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        View all calls
        <ArrowRight aria-hidden="true" size={16} />
      </Link>
    </motion.div>
  );
}
