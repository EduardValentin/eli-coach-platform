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
      hero={formatCheckinDate(nextCheckin.date)}
      className="p-4 sm:p-4"
    >
      <p className="mb-3 text-xs text-text-secondary">
        {formatCheckinTime(nextCheckin.time)}
      </p>
      <a
        href="https://meet.google.com/mock-eli-checkin"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: 'default' }), 'w-full')}
      >
        <Video size={14} />
        Join Meet
      </a>
      <RowActionLink to="/portal/checkins" className="mt-2 w-full">
        Manage check-ins
      </RowActionLink>
    </ClientWidget>
  );
}
