import { useId } from 'react';
import { CalendarCheck } from 'lucide-react';
import { checkinStartsAt, type CheckIn } from '../../domain/checkins';
import { JoinMeetLink } from '../JoinMeetLink';
import { DateTimeLabel } from '../DateTimeLabel';
import { WidgetLink } from '../WidgetLink';
import { ClientWidget } from './ClientWidget';

export function NextCheckinCard({ checkin }: { checkin: CheckIn }) {
  const headingId = useId();

  return (
    <ClientWidget
      eyebrow="Next check-in"
      icon={CalendarCheck}
      headingId={headingId}
      density="compact"
      parityRoot="NextCheckinCard"
      hero={
        <DateTimeLabel
          size="sm"
          startsAt={checkinStartsAt(checkin)}
        />
      }
      footer={
        <WidgetLink to="/portal/checkins" className="w-full justify-center">
          Manage check-ins
        </WidgetLink>
      }
    >
      <JoinMeetLink checkin={checkin} party="client" className="mt-3 w-full" />
    </ClientWidget>
  );
}
