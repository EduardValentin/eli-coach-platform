import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

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

export function WeekSwitcher({
  weeks,
  activeWeekIdx,
  currentWeekIdx,
  onChange,
  maxWeekIdx,
}: WeekSwitcherProps) {
  const pillStripRef = useRef<HTMLDivElement>(null);
  const lastIdx = maxWeekIdx ?? weeks.length - 1;
  const visibleWeeks = weeks.slice(0, lastIdx + 1);
  const prevDisabled = activeWeekIdx === 0;
  const nextDisabled = activeWeekIdx >= lastIdx;

  useEffect(() => {
    const strip = pillStripRef.current;
    if (!strip) return;
    const activePill = strip.querySelector<HTMLElement>(
      `[data-week-idx="${activeWeekIdx}"]`,
    );
    activePill?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [activeWeekIdx]);

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onChange(Math.max(0, activeWeekIdx - 1))}
        disabled={prevDisabled}
        aria-label="Previous week"
      >
        <ChevronLeft aria-hidden="true" />
      </Button>

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
              className={`shrink-0 snap-center min-h-11 px-4 rounded-control text-sm font-semibold transition-all border ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-card'
                  : isCurrent
                    ? 'bg-primary-soft text-primary border-primary/30'
                    : isPast
                      ? 'bg-surface-quiet text-text-secondary border-border-subtle'
                      : 'bg-surface-base text-text-secondary border-border hover:border-text-secondary/30'
              }`}
            >
              <span>W{week.order}</span>
              {week.isDeload && (
                <span className="ml-1 text-xs opacity-75">DL</span>
              )}
              {isCurrent && !isActive && (
                <span className="ml-1 text-xs">●</span>
              )}
            </button>
          );
        })}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onChange(Math.min(lastIdx, activeWeekIdx + 1))}
        disabled={nextDisabled}
        aria-label="Next week"
      >
        <ChevronRight aria-hidden="true" />
      </Button>
    </div>
  );
}
