import { ArrowRight, Video } from 'lucide-react';
import { Link } from 'react-router';
import {
  visitorFullName,
  type PrototypeBooking,
} from '../../services/assessmentCallService';
import {
  classifyCalls,
  upcomingCalls,
} from '../../utils/assessmentCallListing';
import { PortalWidget } from '../PortalWidget';
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
  const calls = upcomingCalls(
    classifyCalls(bookings, { now, timeZone }),
    DASHBOARD_CALL_LIMIT,
  );
  const isEmpty = calls.length === 0;

  return (
    <PortalWidget
      presentation="coach"
      title="Upcoming calls"
      icon={
        <Video aria-hidden="true" className="text-brand-secondary" size={18} />
      }
      headingId="upcoming-calls-heading"
      className="flex h-full flex-col"
      footer={
        <Link
          to={ALL_CALLS_PATH}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          View all calls
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      }
    >
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
                  when={{ startsAt: call.booking.startsAt, timeZone }}
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
    </PortalWidget>
  );
}
