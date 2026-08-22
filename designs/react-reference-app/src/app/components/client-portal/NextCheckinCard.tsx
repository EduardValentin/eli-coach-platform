import { CalendarDays, Video, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { useCheckins } from '../../context/CheckinContext';
import { formatCheckinDate, formatCheckinTime } from '../../utils/dateFormatters';

export function NextCheckinCard() {
  const { getUpcomingCheckins } = useCheckins();
  const nextCheckin = getUpcomingCheckins('c1')[0];

  if (!nextCheckin) return null;

  return (
    <div className="p-4 rounded-2xl bg-[#C81D6B]/5 border border-[#C81D6B]/10">
      <div className="flex items-center gap-2 mb-2">
        <CalendarDays size={14} className="text-[#C81D6B]" />
        <span className="text-[10px] font-bold text-[#C81D6B] uppercase tracking-widest">Next Check-in</span>
      </div>
      <p className="text-sm font-semibold text-[#121212]">{formatCheckinDate(nextCheckin.date)}</p>
      <p className="text-xs text-neutral-600 mb-3">{formatCheckinTime(nextCheckin.time)}</p>
      <a
        href="https://meet.google.com/mock-eli-checkin"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full min-h-11 px-3 text-xs font-bold rounded-xl bg-[#121212] text-white hover:bg-neutral-800 transition-colors"
      >
        <Video size={14} />
        Join Meet
      </a>
      <Link
        to="/portal/checkins"
        className="mt-2 flex items-center justify-center gap-1 w-full min-h-9 text-xs font-semibold text-[#C81D6B] hover:text-[#a31556] transition-colors"
      >
        Manage check-ins
        <ChevronRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}
