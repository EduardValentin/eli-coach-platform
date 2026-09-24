import { Video } from 'lucide-react';
import { useCheckins } from '../../context/CheckinContext';
import {
  formatCheckinDate,
  formatCheckinTime,
} from '../../utils/dateFormatters';
import { buttonVariants } from '../ui/button';
import { cn } from '../ui/utils';
import { RowActionLink } from '../RowActionButton';
import { ClientWidget } from './ClientWidget';

export function NextCheckinCard() {
  const { getUpcomingCheckins } = useCheckins();
  const nextCheckin = getUpcomingCheckins('c1')[0];

  if (!nextCheckin) return null;

  return (
    <ClientWidget
      eyebrow="Next check-in"
      headingId="next-checkin-heading"
      hero={`${formatCheckinDate(nextCheckin.date)} · ${formatCheckinTime(nextCheckin.time)}`}
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
