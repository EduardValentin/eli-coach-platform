import { CalendarDays, Video } from 'lucide-react';
import { useCheckins } from '../../context/CheckinContext';
import {
  formatCheckinDate,
  formatCheckinTime,
} from '../../utils/dateFormatters';
import { buttonVariants } from '../ui/button';
import { cn } from '../ui/utils';
import { RowActionLink } from '../RowActionButton';

export function NextCheckinCard() {
  const { getUpcomingCheckins } = useCheckins();
  const nextCheckin = getUpcomingCheckins('c1')[0];

  if (!nextCheckin) return null;

  return (
    <div className="p-4 rounded-card bg-brand/5 border border-brand/10">
      <div className="flex items-center gap-2 mb-2">
        <CalendarDays size={14} className="text-brand" />
        <span className="text-[10px] font-bold text-brand uppercase tracking-widest">
          Next Check-in
        </span>
      </div>
      <p className="text-sm font-semibold text-text-primary">
        {formatCheckinDate(nextCheckin.date)}
      </p>
      <p className="text-xs text-text-secondary mb-3">
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
    </div>
  );
}
