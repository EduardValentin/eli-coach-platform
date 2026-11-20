import type { ReactNode } from 'react';
import { CAPTION_CLASS } from '../typography';
import { cn } from '../ui/utils';
import type { Target } from './targets';

type TargetsSize = 'sm' | 'md';

const SIZE_CLASS: Record<TargetsSize, string> = { sm: 'text-sm', md: 'text-base' };
const LIST_CLASS = 'overflow-hidden leading-6 tabular-nums';
const DIVIDED_ITEM_CLASS = 'relative before:absolute before:inset-y-1.5 before:-left-3 before:w-px before:bg-divider';

type TargetsSummaryProps = { items: readonly Target[]; size: TargetsSize; className?: string };

export function TargetsSummary({ items, size, className }: TargetsSummaryProps) {
  if (items.length === 0) return null;
  return (
    <dl className={cn('flex flex-wrap items-baseline gap-y-1', LIST_CLASS, SIZE_CLASS[size], className)}>
      {items.map(({ term, value }) => (
        <div key={term} className={cn(DIVIDED_ITEM_CLASS, 'mr-6 flex flex-wrap items-baseline gap-x-1.5')}>
          <dt className="self-center text-sm whitespace-nowrap text-text-secondary">{term}</dt>
          <dd className="inline-flex items-center gap-1 font-semibold text-text-primary">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A term over its value, one line of the value for each run of sets it describes. */
export type TargetColumn = { term: string; lines: readonly ReactNode[] };

type TargetColumnsProps = { columns: readonly TargetColumn[]; size: TargetsSize };

/**
 * Terms over their values in the column tracks of the grid around it, which declares them, with a gap matching this list's, once for every row
 * so the columns line up from row to row. Each line of a value takes a row of its own, so the lines of one run pair up across the columns even when one wraps.
 */
export function TargetColumns({ columns, size }: TargetColumnsProps) {
  if (columns.length === 0) return null;
  return (
    <dl className={cn('col-span-full grid grid-cols-subgrid items-start gap-x-6', LIST_CLASS, SIZE_CLASS[size])}>
      {columns.map(({ term, lines }) => (
        <div key={term} style={{ gridRow: `span ${lines.length + 1}` }} className={cn(DIVIDED_ITEM_CLASS, 'grid min-w-0 grid-rows-subgrid')}>
          <dt className={cn(CAPTION_CLASS, 'leading-4 whitespace-nowrap')}>{term}</dt>
          <dd style={{ gridRow: `span ${lines.length}` }} className="grid grid-rows-subgrid font-semibold text-text-primary">
            {lines.map((line, index) => (
              <span key={index} className={cn('flex items-center gap-1', { 'min-h-6': lines.length > 1 })}>
                {line}
              </span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}
