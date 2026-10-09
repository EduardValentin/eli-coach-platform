import { CalendarCheck } from 'lucide-react';
import { DEMO_CLIENT, useCheckins } from '../../context/CheckinContext';
import { checkinStartsAt } from '../../domain/checkins';
import { JoinMeetLink } from '../JoinMeetLink';
import { DateTimeLabel } from '../DateTimeLabel';
import { WidgetLink } from '../WidgetLink';
import { ClientWidget } from './ClientWidget';

export function NextCheckinCard() {
  const { getUpcomingCheckins } = useCheckins();
  const nextCheckin = getUpcomingCheckins(DEMO_CLIENT.id)[0];

  if (!nextCheckin) return null;

  return (
    <ClientWidget
      eyebrow="Next check-in"
      icon={
        <CalendarCheck
          aria-hidden="true"
          className="text-brand-secondary"
          size={16}
        />
      }
      headingId="next-checkin-heading"
      density="compact"
      hero={
        <DateTimeLabel
          size="sm"
          startsAt={checkinStartsAt(nextCheckin)}
        />
      }
      footer={
        <WidgetLink to="/portal/checkins" className="w-full justify-center">
          Manage check-ins
        </WidgetLink>
      }
    >
      <JoinMeetLink checkin={nextCheckin} className="mt-3 w-full" />
    </ClientWidget>
  );
}
