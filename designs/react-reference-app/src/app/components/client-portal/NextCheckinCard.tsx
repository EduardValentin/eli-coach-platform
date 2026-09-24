import { CalendarCheck, Video } from 'lucide-react';
import { useCheckins } from '../../context/CheckinContext';
import { checkinInstant } from '../../utils/dateFormatters';
import { buttonVariants } from '../ui/button';
import { DateTimeLabel } from '../DateTimeLabel';
import { WidgetLink } from '../WidgetLink';
import { ClientWidget } from './ClientWidget';

const MEET_URL = 'https://meet.google.com/mock-eli-checkin';

export function NextCheckinCard() {
  const { getUpcomingCheckins } = useCheckins();
  const nextCheckin = getUpcomingCheckins('c1')[0];

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
          startsAt={checkinInstant(nextCheckin.date, nextCheckin.time)}
        />
      }
      footer={
        <WidgetLink to="/portal/checkins" className="w-full justify-center">
          Manage check-ins
        </WidgetLink>
      }
    >
      <a
        href={MEET_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({
          variant: 'primary',
          size: 'sm',
          className: 'mt-3 w-full',
        })}
      >
        <Video aria-hidden="true" size={16} />
        Join Meet
      </a>
    </ClientWidget>
  );
}
