import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

export type EffortTone = 'low' | 'mid' | 'high';
type EffortSize = 'inline' | 'numeral' | 'word' | 'document';

const TONE_CLASS: Record<EffortTone, string> = {
  low: 'bg-effort-low-soft text-effort-low-ink',
  mid: 'bg-effort-mid-soft text-effort-mid-ink',
  high: 'bg-effort-high-fill text-surface-base',
};

const SIZE_CLASS: Record<EffortSize, string> = {
  inline: 'px-1.5',
  numeral: 'h-7 min-w-9 px-2.5 text-base',
  word: 'h-7 px-2.5 text-sm',
  document: 'h-[1.6em] px-2.5 text-document-note',
};

type EffortPillProps = { tone: EffortTone; size: EffortSize; className?: string; children: ReactNode };

export function EffortPill({ tone, size, className, children }: EffortPillProps) {
  return (
    <span className={cn('inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap tabular-nums', TONE_CLASS[tone], SIZE_CLASS[size], className)}>
      {children}
    </span>
  );
}
