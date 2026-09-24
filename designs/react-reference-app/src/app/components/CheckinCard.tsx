import type { ReactNode } from 'react';
import { AppointmentCard } from './coach-portal/AppointmentCard';
import type { AppointmentAttendee } from './coach-portal/appointment';
import { Badge } from './ui/badge';
import { CheckinTypeBadge } from './CheckinTypeBadge';
import type { CheckIn } from '../context/CheckinContext';
import { browserTimeZone, checkinInstant } from '../utils/dateFormatters';

export type CheckinViewer = 'coach' | 'client';

function pendingLabel(
  status: CheckIn['status'],
  viewer: CheckinViewer,
): string {
  if (status === 'rescheduling') return 'New time proposed';
  return viewer === 'client' ? 'From your coach' : 'Requested';
}

export function CheckinStatusBadge({
  checkin,
  viewer,
}: {
  checkin: CheckIn;
  viewer: CheckinViewer;
}) {
  const clientFirstName = checkin.clientName.split(' ')[0];

  switch (checkin.status) {
    case 'confirmed':
      return <Badge variant="success">Confirmed</Badge>;
    case 'completed':
      return <Badge variant="muted">Completed</Badge>;
    case 'declined':
      return <Badge variant="muted">Declined</Badge>;
    case 'cancelled':
      return <Badge variant="muted">Cancelled</Badge>;
    case 'rescheduling':
    case 'pending': {
      const viewerOwesResponse = checkin.proposedBy !== viewer;
      if (viewerOwesResponse) {
        return (
          <Badge variant="pending">
            {pendingLabel(checkin.status, viewer)}
          </Badge>
        );
      }
      return viewer === 'client' ? (
        <Badge variant="muted">Awaiting your coach</Badge>
      ) : (
        <Badge variant="muted">Awaiting {clientFirstName}</Badge>
      );
    }
    default:
      return null;
  }
}

export function CheckinCard({
  checkin,
  viewer,
  attendee,
  muted = false,
  footnote,
  actions,
}: {
  checkin: CheckIn;
  viewer: CheckinViewer;
  attendee: AppointmentAttendee;
  muted?: boolean;
  footnote?: string;
  actions?: ReactNode;
}) {
  const timeZone = browserTimeZone();
  const isRescheduling = checkin.status === 'rescheduling';
  const supersededWhen =
    isRescheduling && checkin.previousDate && checkin.previousTime
      ? {
          startsAt: checkinInstant(checkin.previousDate, checkin.previousTime),
          timeZone,
        }
      : undefined;

  return (
    <AppointmentCard
      attendee={attendee}
      when={{ startsAt: checkinInstant(checkin.date, checkin.time), timeZone }}
      supersededWhen={supersededWhen}
      status={muted ? 'past' : 'scheduled'}
      badges={
        <>
          <CheckinTypeBadge type={checkin.type} />
          <CheckinStatusBadge checkin={checkin} viewer={viewer} />
          {checkin.rescheduleCount > 0 && !isRescheduling && (
            <Badge variant="muted">
              {checkin.rescheduleCount} reschedule
              {checkin.rescheduleCount > 1 ? 's' : ''}
            </Badge>
          )}
        </>
      }
      quote={checkin.rescheduleMessage || checkin.note || undefined}
      footnote={footnote}
      actions={actions}
    />
  );
}
