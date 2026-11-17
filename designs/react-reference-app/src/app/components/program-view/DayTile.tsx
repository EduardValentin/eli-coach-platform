import { format } from 'date-fns';
import { weekdayAbbreviation } from '../../domain/program';
import { DOCUMENT_EYEBROW_CLASS, DOCUMENT_FIGURE_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { CheckInDot } from './CheckInDot';
import { dayCellVariants, KIND_GLYPH_CLASS, KIND_GLYPH_STROKE, KIND_ICON, KIND_META_CLASS, KIND_NAME_CLASS } from './DayCell';
import type { WeekDay } from './weekView';

/** One seventh of the sheet less the week row's gaps, so a day page's tile matches its tile in the week row. */
export const DAY_TILE_COLUMNS_CLASS = 'sm:grid-cols-[calc((100%-6*var(--week-column-gap))/7)_minmax(0,1fr)] sm:gap-x-[4.5mm]';

/**
 * The printed day's square tile: weekday, date and glyph, read aloud by whatever names the day beside it.
 * In the week agenda on a phone it is `max-sm:contents`, and its parts take their places in the agenda row.
 */
export function DayTile({ day, className }: { day: WeekDay; className?: string }) {
  const { kind } = day.plan;
  const Glyph = KIND_ICON[kind];
  return (
    <span aria-hidden="true" className={cn(dayCellVariants({ variant: 'tile', kind }), className)}>
      <span className="grid max-sm:col-start-1 max-sm:row-start-1 max-sm:leading-tight sm:contents">
        <span className={cn('col-span-full', DOCUMENT_EYEBROW_CLASS, 'max-sm:text-label', KIND_META_CLASS[kind])}>{weekdayAbbreviation(day.weekday)}</span>
        {day.date && <span className={cn('col-span-full', DOCUMENT_FIGURE_CLASS, 'max-sm:text-base', KIND_NAME_CLASS[kind])}>{format(day.date, 'd')}</span>}
      </span>
      {day.date && <span className={cn('text-document-note max-sm:hidden', KIND_META_CLASS[kind])}>{format(day.date, 'MMM')}</span>}
      <Glyph
        strokeWidth={KIND_GLYPH_STROKE[kind]}
        className={cn('col-start-2 shrink-0 max-sm:row-start-1 max-sm:size-4.5 sm:mb-[0.15em] sm:size-4', KIND_GLYPH_CLASS[kind])}
      />
      {day.checkIn && <CheckInDot size="md" className="absolute top-(--tile-inset) right-(--tile-inset) max-sm:hidden" />}
    </span>
  );
}
