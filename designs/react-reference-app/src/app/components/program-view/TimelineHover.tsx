import { useState, type PointerEvent } from 'react';
import { addDays, format } from 'date-fns';
import { cn } from '../ui/utils';

const DAYS_PER_WEEK = 7;
const HOVER_DATE = 'EEE d MMM';
const LABEL_EDGE = 0.08;

export type HoveredDay = { offset: number; label: string };

export function useHoveredDay(start: Date, planDays: number) {
  const [day, setDay] = useState<number | null>(null);
  const hovered: HoveredDay | null =
    day === null ? null : { offset: (day + 0.5) / planDays, label: `${format(addDays(start, day), HOVER_DATE)} · week ${Math.floor(day / DAYS_PER_WEEK) + 1}` };

  return {
    hovered,
    pointerHandlers: {
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        if (event.pointerType !== 'mouse') return;
        const box = event.currentTarget.getBoundingClientRect();
        const fraction = (event.clientX - box.left) / box.width;
        setDay(Math.min(planDays - 1, Math.max(0, Math.floor(fraction * planDays))));
      },
      onPointerLeave: () => setDay(null),
    },
  };
}

export function HoveredDayLine({ hovered, className }: { hovered: HoveredDay; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('pointer-events-none absolute bottom-11 w-px -translate-x-1/2 bg-text-primary/40 transition-[left] duration-100 ease-out motion-reduce:transition-none', className)}
      style={{ left: `${hovered.offset * 100}%` }}
    />
  );
}

export function HoveredDayLabel({ hovered }: { hovered: HoveredDay }) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute top-0.5 z-10 rounded-full bg-surface-inverted px-2 py-0.5 font-medium whitespace-nowrap text-surface-inverted-foreground transition-[left] duration-100 ease-out motion-reduce:transition-none',
        {
          '-translate-x-1/2': hovered.offset >= LABEL_EDGE && hovered.offset <= 1 - LABEL_EDGE,
          '-translate-x-full': hovered.offset > 1 - LABEL_EDGE,
        },
      )}
      style={{ left: `${hovered.offset * 100}%` }}
    >
      {hovered.label}
    </span>
  );
}
