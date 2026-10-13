import { ClipboardCheck } from 'lucide-react';
import { byStartAscending } from '../../context/CheckinContext';
import type { CheckIn } from '../../domain/checkins';
import { coachCheckinPath, coachCheckinsPath } from '../../utils/checkinLinks';
import { checkinInstant } from '../../utils/dateFormatters';
import { PortalWidget } from '../PortalWidget';
import { RowActionLink } from '../RowActionButton';
import { WidgetLink } from '../WidgetLink';
import { cn } from '../ui/utils';
import { DashboardAppointmentRow } from './DashboardAppointmentRow';

const DASHBOARD_CHECKIN_LIMIT = 3;

export function PendingCheckins({
  checkins,
  timeZone,
}: {
  checkins: CheckIn[];
  timeZone: string;
}) {
  const soonest = [...checkins]
    .sort(byStartAscending)
    .slice(0, DASHBOARD_CHECKIN_LIMIT);
  const isEmpty = soonest.length === 0;

  return (
    <PortalWidget
      presentation="coach"
      title="Pending Check-ins"
      icon={
        <ClipboardCheck
          aria-hidden="true"
          className="text-brand-secondary"
          size={18}
        />
      }
      headingId="pending-checkins-heading"
      className="flex h-full flex-col"
      parityRoot="PendingCheckins"
      footer={
        <WidgetLink trailing="arrow" to={coachCheckinsPath()}>
          View all check-ins
        </WidgetLink>
      }
    >
      <div
        className={cn('flex-1', {
          'flex items-center justify-center': isEmpty,
        })}
      >
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">No pending check-ins.</p>
        ) : (
          <ul className="space-y-4">
            {soonest.map((checkin) => (
              <li key={checkin.id}>
                <DashboardAppointmentRow
                  attendeeName={checkin.clientName}
                  when={{
                    startsAt: checkinInstant(checkin.date, checkin.time),
                    timeZone,
                  }}
                  action={
                    <RowActionLink
                      to={coachCheckinPath(checkin.id)}
                      icon={ClipboardCheck}
                    >
                      Review
                    </RowActionLink>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PortalWidget>
  );
}
