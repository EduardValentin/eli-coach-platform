import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Week = {
  id: string;
  order: number;
  isDeload?: boolean;
};

interface WeekSwitcherProps {
  weeks: Week[];
  activeWeekIdx: number;
  currentWeekIdx: number;
  onChange: (idx: number) => void;
  /** Highest week index the client may view (defaults to the last week). Weeks beyond this are hidden. */
  maxWeekIdx?: number;
}

export function WeekSwitcher({ weeks, activeWeekIdx, currentWeekIdx, onChange, maxWeekIdx }: WeekSwitcherProps) {
  const pillStripRef = useRef<HTMLDivElement>(null);
  const lastIdx = maxWeekIdx ?? weeks.length - 1;
  const visibleWeeks = weeks.slice(0, lastIdx + 1);
  const prevDisabled = activeWeekIdx === 0;
  const nextDisabled = activeWeekIdx >= lastIdx;

  useEffect(() => {
    const strip = pillStripRef.current;
    if (!strip) return;
    const activePill = strip.querySelector<HTMLElement>(`[data-week-idx="${activeWeekIdx}"]`);
    activePill?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [activeWeekIdx]);

  return (
    <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, activeWeekIdx - 1))}
          disabled={prevDisabled}
          aria-label="Previous week"
          className="inline-flex items-center justify-center size-11 shrink-0 rounded-xl text-neutral-500 hover:text-[#121212] hover:bg-neutral-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>

        <div
          ref={pillStripRef}
          className="flex-1 flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-thin [justify-content:safe_center]"
        >
          {visibleWeeks.map((week, idx) => {
            const isPast = idx < currentWeekIdx;
            const isCurrent = idx === currentWeekIdx;
            const isActive = idx === activeWeekIdx;

            return (
              <button
                key={week.id}
                data-week-idx={idx}
                onClick={() => onChange(idx)}
                aria-current={isActive ? 'true' : undefined}
                className={`shrink-0 snap-center min-h-11 px-4 rounded-xl text-sm font-semibold transition-all border ${
                  isActive
                    ? 'bg-[#95134F] text-white border-[#95134F] shadow-sm'
                    : isCurrent
                      ? 'bg-[#95134F]/10 text-[#95134F] border-[#95134F]/30'
                      : isPast
                        ? 'bg-neutral-50 text-neutral-400 border-neutral-100'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <span>W{week.order}</span>
                {week.isDeload && <span className="ml-1 text-[10px] opacity-75">DL</span>}
                {isCurrent && !isActive && <span className="ml-1 text-[10px]">●</span>}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onChange(Math.min(lastIdx, activeWeekIdx + 1))}
          disabled={nextDisabled}
          aria-label="Next week"
          className="inline-flex items-center justify-center size-11 shrink-0 rounded-xl text-neutral-500 hover:text-[#121212] hover:bg-neutral-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
    </div>
  );
}
