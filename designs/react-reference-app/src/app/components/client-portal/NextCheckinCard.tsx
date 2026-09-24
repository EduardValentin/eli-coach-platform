import { CalendarCheck, Video } from 'lucide-react';
import { useCheckins } from '../../context/CheckinContext';
import { checkinInstant } from '../../utils/dateFormatters';
import { buttonVariants } from '../ui/button';
import { cn } from '../ui/utils';
import { DateTimeLabel } from '../DateTimeLabel';
import { RowActionLink } from '../RowActionButton';
import { ClientWidget } from './ClientWidget';

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
          size={18}
        />
      }
      headingId="next-checkin-heading"
      hero={
        <DateTimeLabel
          startsAt={checkinInstant(nextCheckin.date, nextCheckin.time)}
        />
      }
      heroSize="compact"
      className="p-4 sm:p-4"
    >
      <a
        href="https://meet.google.com/mock-eli-checkin"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: 'default' }), 'mt-3 w-full')}
      >
        <Video size={14} />
        Join Meet
      </a>
      <RowActionLink
        to="/portal/checkins"
        tone="primary"
        className="mt-2 w-full"
      >
        Manage check-ins
      </RowActionLink>
    </ClientWidget>
  );
}
